import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileDown,
  Plus,
} from 'lucide-react'
import { Empty, Page } from '@/components/shell/page'
import { ReportsTabs } from '@/components/reports-tabs'
import { ReportRow as ReportItem } from '@/components/cell-reports/report-row'
import { PersonCombobox } from '@/components/person-combobox'
import { Button, buttonVariants } from '@/components/ui/button'
import { Group } from '@/components/ui/list'
import { Segmented } from '@/components/ui/segmented'
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
  const set = (next: Partial<typeof search>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...next, page: undefined }),
      replace: true,
    })
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))

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
            <FileDown aria-hidden="true" /> View PDF
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
      {/* When and type share the row, half each. */}
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <NativeSelect
          size="lg"
          className="w-full"
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
        <NativeSelect
          size="lg"
          className="w-full"
          value={search.type ?? ''}
          onChange={(e) =>
            set({ type: (e.target.value || undefined) as never })
          }
          aria-label="Type"
        >
          <NativeSelectOption value="">All types</NativeSelectOption>
          <NativeSelectOption value="OPEN">Open Cell</NativeSelectOption>
          <NativeSelectOption value="DISCIPLESHIP">
            Discipleship
          </NativeSelectOption>
          <NativeSelectOption value="SOULWINNING">
            Soul Winning
          </NativeSelectOption>
        </NativeSelect>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {data.myId && (
          <Segmented
            label="Whose"
            className="w-48"
            value={search.mine ? 'mine' : 'all'}
            onChange={(v) => set({ mine: v === 'mine' ? true : undefined })}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'mine', label: 'Mine' },
            ]}
          />
        )}
        {data.canFilterLeader && (
          <div className="w-full sm:w-64">
            <PersonCombobox
              aria-label="Leader"
              people={data.leaders}
              value={search.leader ?? ''}
              onChange={(leader) => set({ leader: leader || undefined })}
              noneLabel="Every leader"
              placeholder="Every leader"
            />
          </div>
        )}
      </div>

      {data.rows.length === 0 ? (
        <Empty icon={ClipboardList} title="No reports in this range.">
          <Link to="/reports/new" className={buttonVariants()}>
            <Plus aria-hidden="true" /> New report
          </Link>
        </Empty>
      ) : (
        [...groups.entries()].map(([label, rows]) => (
          <section key={label} className="flex min-w-0 flex-col gap-2">
            <h2 className="px-0.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {label} · {rows.length}
            </h2>
            <Group>
              {rows.map((r) => (
                <ReportItem key={r.id} r={r} />
              ))}
            </Group>
          </section>
        ))
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span>
            Page {data.page} of {pages}
          </span>
          <div className="flex gap-1.5">
            <Link
              to="."
              search={(p) => ({
                ...p,
                page: data.page > 2 ? data.page - 1 : undefined,
              })}
              aria-label="Previous page"
              className={buttonVariants({
                variant: 'secondary',
                size: 'icon-lg',
                className:
                  data.page <= 1 ? 'pointer-events-none opacity-40' : '',
              })}
            >
              <ChevronLeft aria-hidden="true" />
            </Link>
            <Link
              to="."
              search={(p) => ({ ...p, page: data.page + 1 })}
              aria-label="Next page"
              className={buttonVariants({
                variant: 'secondary',
                size: 'icon-lg',
                className:
                  data.page >= pages ? 'pointer-events-none opacity-40' : '',
              })}
            >
              <ChevronRight aria-hidden="true" />
            </Link>
          </div>
        </div>
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
