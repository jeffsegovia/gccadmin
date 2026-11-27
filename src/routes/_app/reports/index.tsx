import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CircleAlert,
  ClipboardList,
  FileDown,
  Plus,
  UsersRound,
} from 'lucide-react'
import { Empty, Page, Section } from '@/components/shell/page'
import { RemindButton } from '@/components/remind-button'
import { Pill } from '@/components/status-pill'
import { ReportsTabs } from '@/components/reports-tabs'
import { FilterBar } from '@/components/filter-bar'
import { ReportFiltersDialog } from '@/components/cell-reports/filters-dialog'
import { ReportsTable } from '@/components/cell-reports/reports-table'
import { Pager } from '@/components/pager'
import { ReportRow as ReportItem } from '@/components/cell-reports/report-row'
import { Button, buttonVariants } from '@/components/ui/button'
import { Group, StatStrip } from '@/components/ui/list'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  RANGE_LABEL,
  REPORT_RANGES,
  listReportsSchema,
} from '@/lib/cell-reports/schema'
import type { ReportRange } from '@/lib/cell-reports/schema'
import { manilaDay, shortDate, shortDay, weekStart } from '@/lib/dates'
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
      description={RANGE_LABEL[range]}
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
          <Link to="/reports/new" className={buttonVariants({ size: 'lg' })}>
            <Plus aria-hidden="true" /> New
            <span className="max-md:hidden">report</span>
          </Link>
        </>
      }
    >
      <ReportsTabs on="cell" />
      <FilterBar
        active={[
          ...(search.type
            ? [
                {
                  key: 'type',
                  label:
                    search.type === 'OPEN'
                      ? 'Open Cell'
                      : search.type === 'DISCIPLESHIP'
                        ? 'Discipleship'
                        : 'Soul winning',
                  clear: () => set({ type: undefined }),
                },
              ]
            : []),
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
          set({
            mine: undefined,
            leader: undefined,
            assistant: undefined,
            type: undefined,
          })
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
        value={{
          mine: search.mine,
          leader: search.leader,
          type: search.type === 'SOULWINNING' ? undefined : search.type,
        }}
        onApply={(f) => set({ mine: f.mine, leader: f.leader, type: f.type })}
        canChooseWhose={!!data.myId}
        leaders={data.canFilterLeader ? data.leaders : []}
      />

      {/* The period at a glance, as in the redesign. */}
      <StatStrip
        items={[
          { label: 'Reports', value: data.total, icon: ClipboardList },
          { label: 'Attended', value: data.attendances, icon: UsersRound },
          ...(data.notReported
            ? [
                {
                  label: 'Not reported',
                  value: data.notReported.length,
                  icon: CircleAlert,
                  tone: data.notReported.length
                    ? ('caution' as const)
                    : undefined,
                },
              ]
            : []),
        ]}
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
      {data.notReported && data.notReported.length > 0 && (
        <Section
          title={`Not reported yet · ${data.notReported.length}`}
          action={
            data.canRemind ? (
              <RemindButton leaderIds={data.notReported.map((l) => l.id)} />
            ) : undefined
          }
        >
          <Group>
            {data.notReported.map((l) => (
              <div
                key={l.id}
                className="flex min-h-12 min-w-0 items-center gap-3 px-3.5 py-2"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{l.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {l.last
                      ? `Last report ${shortDate(l.last)}`
                      : 'No reports yet'}
                  </span>
                </span>
                {l.days !== null && (
                  <Pill tone={l.days > 14 ? 'short' : 'caution'}>
                    {l.days} days
                  </Pill>
                )}
              </div>
            ))}
          </Group>
        </Section>
      )}
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
