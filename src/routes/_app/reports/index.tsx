import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ClipboardList, FileDown, Plus } from 'lucide-react'
import { Empty, Page } from '@/components/shell/page'
import { ReportsTabs } from '@/components/reports-tabs'
import { FilterBar } from '@/components/filter-bar'
import { ReportFiltersDialog } from '@/components/cell-reports/filters-dialog'
import { ReportsTable } from '@/components/cell-reports/reports-table'
import { Pager } from '@/components/pager'
import { UnderlineTabs } from '@/components/ui/underline-tabs'
import { ReportRow as ReportItem } from '@/components/cell-reports/report-row'
import { Button, buttonVariants } from '@/components/ui/button'
import { Group } from '@/components/ui/list'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  RANGE_LABEL,
  REPORT_RANGES,
  listReportsSchema,
} from '@/lib/cell-reports/schema'
import type { ReportRange } from '@/lib/cell-reports/schema'
import { plural } from '@/lib/labels'
import { manilaDay, shortDay, weekStart } from '@/lib/dates'
import {
  exportReports,
  getReportsForPdf,
  getReportsPage,
} from '@/server/cell-reports/cell-reports.functions'
import { PdfPreview } from '@/components/cell-reports/pdf-preview'
import type { ReportRow } from '@/server/cell-reports/cell-reports.server'

export const Route = createFileRoute('/_app/reports/')({
  validateSearch: listReportsSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getReportsPage({ data: deps }),
  head: () => ({ meta: [{ title: 'Cell reports · GCC Admin' }] }),
  component: ReportsPage,
})

function ReportsPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const range: ReportRange = search.range ?? 'this_week'
  const [pdf, setPdf] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const set = (next: Partial<typeof search>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...next, page: undefined }),
      replace: true,
    })

  // Grouped by week (Monday first), newest first.
  const groups = new Map<string, Array<ReportRow>>()
  for (const r of data.rows) {
    const label = `Week of ${shortDay(weekStart(manilaDay(r.date)))}`
    groups.set(label, [...(groups.get(label) ?? []), r])
  }

  return (
    <Page
      wide
      title="Cell reports"
      description={`${RANGE_LABEL[range]} · ${plural(data.total, 'report')} · ${plural(data.attendances, 'attendance')}`}
      action={
        <>
          <Button
            variant="secondary"
            size="lg"
            disabled={data.total === 0}
            onClick={() => setPdf(true)}
          >
            <FileDown aria-hidden="true" />
            <span className="max-md:sr-only">View PDF</span>
          </Button>
          <Link
            to="/reports/new"
            className={buttonVariants({
              size: 'lg',
              className: 'max-md:hidden',
            })}
          >
            <Plus aria-hidden="true" /> New report
          </Link>
        </>
      }
    >
      <ReportsTabs on="cell" />
      <UnderlineTabs
        label="Type"
        value={search.type ?? 'ALL'}
        onChange={(v) => set({ type: v === 'ALL' ? undefined : v })}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'OPEN', label: 'Open Cell' },
          { value: 'DISCIPLESHIP', label: 'Discipleship' },
        ]}
      />
      <FilterBar
        active={[
          ...(search.mine
            ? [
                {
                  key: 'mine',
                  label: 'Mine',
                  clear: () => set({ mine: undefined }),
                },
              ]
            : []),
          ...(search.leader
            ? [
                {
                  key: 'leader',
                  label: `Leader: ${data.leaders.find((l) => l.id === search.leader)?.name ?? 'Someone'}`,
                  clear: () => set({ leader: undefined }),
                },
              ]
            : []),
          ...(search.assistant
            ? [
                {
                  key: 'assistant',
                  label: `Led by ${data.rows.find((r) => r.assistantId === search.assistant)?.assistantName ?? 'a disciple'}`,
                  clear: () => set({ assistant: undefined }),
                },
              ]
            : []),
        ]}
        onOpen={() => setFiltering(true)}
        onClearAll={() =>
          set({ mine: undefined, leader: undefined, assistant: undefined })
        }
      >
        <NativeSelect
          size="lg"
          className="w-full sm:w-56"
          value={range}
          onChange={(e) => set({ range: e.target.value as ReportRange })}
          aria-label="When"
        >
          {REPORT_RANGES.map((r) => (
            <NativeSelectOption key={r} value={r}>
              {RANGE_LABEL[r]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FilterBar>
      <ReportFiltersDialog
        open={filtering}
        onOpenChange={setFiltering}
        value={{ mine: search.mine, leader: search.leader }}
        onApply={(f) => set({ mine: f.mine, leader: f.leader })}
        canChooseWhose={!!data.myId}
        leaders={data.canFilterLeader ? data.leaders : []}
      />

      {data.rows.length === 0 ? (
        <Empty icon={ClipboardList} title="No reports in this range.">
          {range !== 'all' || search.mine || search.leader || search.type ? (
            <Button
              variant="secondary"
              onClick={() =>
                set({
                  range: 'all',
                  mine: undefined,
                  leader: undefined,
                  assistant: undefined,
                  type: undefined,
                })
              }
            >
              Show all reports
            </Button>
          ) : (
            <Link to="/reports/new" className={buttonVariants()}>
              <Plus aria-hidden="true" /> New report
            </Link>
          )}
        </Empty>
      ) : (
        <>
          {/* Phones: a list a week at a time. */}
          {[...groups.entries()].map(([label, rows]) => (
            <section
              key={label}
              className="flex min-w-0 flex-col gap-2 md:hidden"
            >
              <h2 className="px-0.5 text-[13px] font-medium text-muted-foreground">
                {label} · {rows.length}
              </h2>
              <Group>
                {rows.map((r) => (
                  <ReportItem key={r.id} r={r} />
                ))}
              </Group>
            </section>
          ))}
          {/* Wide screens: one table. */}
          <ReportsTable groups={[...groups.entries()]} />
        </>
      )}
      <Pager page={data.page} total={data.total} pageSize={data.pageSize} />
      <PdfPreview
        open={pdf}
        onOpenChange={setPdf}
        title="Cell Reports"
        description={RANGE_LABEL[range]}
        filename={`gcc-cell-reports-${range}.pdf`}
        load={async () => {
          const rows = await exportReports({
            data: { ...search, page: undefined },
          })
          return rows.length
            ? getReportsForPdf({ data: { ids: rows.map((r) => r.id) } })
            : []
        }}
      />
    </Page>
  )
}
