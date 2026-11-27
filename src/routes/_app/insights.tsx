import { StatStrip, RowChevron } from '@/components/ui/list'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  HeartHandshake,
  Users,
} from 'lucide-react'
import { z } from 'zod'
import { Page } from '@/components/shell/page'
import { TrendChart } from '@/components/insights/trend-chart'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { CELL_STATUS, CHURCH_STATUS, MEMBER_TYPE } from '@/lib/labels'
import { shortDay } from '@/lib/dates'
import {
  getInsights,
  getReportsFiled,
} from '@/server/insights/insights.functions'
import {
  CardColumns,
  CellGroupsBody,
  InsightCard,
  rangeText,
} from '@/components/insights/reports-filed'
import { KIND_COLOR, Pill } from '@/components/status-pill'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { RANGE_LABEL, REPORT_RANGES } from '@/lib/cell-reports/schema'
import type { ReportRange } from '@/lib/cell-reports/schema'
import { getSummaryStatus } from '@/server/email/emails.functions'
import { SummaryEmail } from '@/components/insights/summary-email'
import type { Kind } from '@/server/insights/insights.functions'

export const Route = createFileRoute('/_app/insights')({
  validateSearch: z.object({
    period: z.enum(['weeks', 'months']).optional(),
    mine: z.boolean().optional(),
    /** Reports filed's date range (v2's Cell Groups card). */
    filed: z.enum(REPORT_RANGES).optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [insights, filed, summary] = await Promise.all([
      getInsights({ data: { period: deps.period, mine: deps.mine } }),
      getReportsFiled({ data: { range: deps.filed, mine: deps.mine } }),
      getSummaryStatus(),
    ])
    return { ...insights, filed, summary }
  },
  // Rendered in the browser: the page shell shows at once with a
  // skeleton, and the summary (cached two minutes on the server and the
  // router) fills in.
  ssr: false,
  staleTime: 120_000,
  pendingMs: 0,
  pendingComponent: InsightsSkeleton,
  head: () => ({ meta: [{ title: 'Insights · GCC Admin' }] }),
  component: InsightsPage,
})

const KIND_LABEL: Record<Kind, string> = {
  open: 'Open Cell',
  discipleship: 'Discipleship',
  soulWinning: 'Soul winning',
  consolidation: 'Consolidation',
}
// The same color per kind as the badges (KIND_COLOR): discipleship green.
const KIND_COLORS: Record<Kind, string> = {
  discipleship: KIND_COLOR.DISCIPLESHIP,
  open: KIND_COLOR.OPEN,
  soulWinning: KIND_COLOR.SOUL_WINNING,
  consolidation: KIND_COLOR.CONSOLIDATION,
}
function monthName(day: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`))
}

function InsightsPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const set = (next: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
  const labels = data.trend.map((p) =>
    data.period === 'weeks' ? shortDay(p.start) : monthName(p.start),
  )
  const d = data.disciples

  const filedRange = search.filed ?? 'this_week'
  // One toggle in the URL for both charts, shown on each.
  const periodToggle = (
    <Segmented
      label="Trend by"
      size="sm"
      className="w-40"
      value={data.period}
      onChange={(period) =>
        set({ period: period === 'weeks' ? undefined : period })
      }
      options={[
        { value: 'weeks', label: 'Weekly' },
        { value: 'months', label: 'Monthly' },
      ]}
    />
  )

  return (
    <Page
      wide
      title="Insights"
      description={
        data.everyone
          ? 'Quick insights on cell groups and members.'
          : 'Quick insights on your network’s cell groups and members.'
      }
    >
      {data.canChooseScope && (
        <Segmented
          label="Whose"
          className="md:w-72"
          value={search.mine ? 'mine' : 'all'}
          onChange={(v) => set({ mine: v === 'mine' ? true : undefined })}
          options={[
            { value: 'all', label: 'Whole church' },
            { value: 'mine', label: 'My network' },
          ]}
        />
      )}

      {/* The headline numbers first (as Osamu's summaries); each card
          below has the detail. */}
      <StatStrip
        items={[
          {
            icon: ClipboardList,
            label: `Cell groups · ${RANGE_LABEL[filedRange].toLowerCase()}`,
            value: data.filed.cellGroups.total,
          },
          {
            icon: BookOpen,
            label: `Soul winning · ${data.yearToDate.year}`,
            value: data.yearToDate.soulWinning,
          },
          {
            icon: Users,
            label: `New believers · ${data.yearToDate.year}`,
            value: data.yearToDate.believers,
            tone: 'covered',
          },
        ]}
      />

      <InsightCard
        title="Cell groups"
        description={rangeText(data.filed.days)}
        action={
          <NativeSelect
            size="sm"
            value={filedRange}
            onChange={(e) =>
              set({
                filed:
                  e.target.value === 'this_week'
                    ? undefined
                    : (e.target.value as ReportRange),
              })
            }
            aria-label="Date range"
          >
            {REPORT_RANGES.filter((r) => r !== 'all').map((r) => (
              <NativeSelectOption key={r} value={r}>
                {RANGE_LABEL[r]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        }
        footer={data.summary && <SummaryEmail status={data.summary} />}
      >
        <CellGroupsBody data={data.filed} />
      </InsightCard>

      <TrendCard
        title="Cell groups over time"
        description={
          data.period === 'weeks'
            ? 'Discipleship and Open Cell reports, last 12 weeks'
            : 'Discipleship and Open Cell reports, last 6 months'
        }
        kinds={['discipleship', 'open']}
        data={data}
        labels={labels}
        action={periodToggle}
      />

      {/* The Soul winning module's numbers, small: year to date. */}
      <InsightCard
        title="Soul winning"
        description={`From the Soul winning module · year to date (${data.yearToDate.year})`}
        action={
          <Link
            to="/soul-winning"
            className="flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            See sessions <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        }
      >
        <div className="grid grid-cols-3 [&>*+*]:border-l">
          {(
            [
              [
                'Soul winning',
                data.yearToDate.soulWinning,
                'sessions',
                BookOpen,
                KIND_COLORS.soulWinning,
              ],
              [
                'Consolidation',
                data.yearToDate.consolidation,
                'sessions',
                HeartHandshake,
                KIND_COLORS.consolidation,
              ],
              [
                'New believers',
                data.yearToDate.believers,
                'recorded',
                Users,
                'var(--chart-1)',
              ],
            ] as const
          ).map(([label, n, hint, Icon, color]) => (
            <div
              key={label}
              className="flex min-w-0 flex-col gap-0.5 px-3 py-3 md:px-4"
            >
              <span className="flex min-w-0 items-center justify-between gap-1.5">
                <span className="truncate text-xs text-muted-foreground md:text-[13px]">
                  {label}
                </span>
                <Icon
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                  style={{ color }}
                />
              </span>
              <span className="numeric text-xl font-semibold tracking-tight md:text-[28px]">
                {n}
              </span>
              <span className="text-xs leading-tight text-muted-foreground">
                {hint}
              </span>
            </div>
          ))}
        </div>
      </InsightCard>

      <TrendCard
        title="Soul winning over time"
        description={
          data.period === 'weeks'
            ? 'Soul winning and consolidation sessions, last 12 weeks'
            : 'Soul winning and consolidation sessions, last 6 months'
        }
        kinds={['soulWinning', 'consolidation']}
        data={data}
        labels={labels}
        action={periodToggle}
      />

      <InsightCard
        title="Disciples leading cell groups"
        description="This week"
      >
        {data.cellGroupsThisWeek.assistants.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No disciple has led a cell group this week yet.
          </p>
        ) : (
          <ul className="flex min-w-0 flex-col py-1 [&>*+*]:border-t">
            {data.cellGroupsThisWeek.assistants.map((a) => (
              <li key={a.id}>
                <Link
                  to="/reports"
                  search={{ assistant: a.id, range: 'this_week' }}
                  className="flex min-h-14 min-w-0 items-center gap-3 px-4 py-2 hover:bg-muted/50"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {a.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Assistant Leader
                    </span>
                  </span>
                  <Pill>
                    {a.n} {a.n === 1 ? 'cell group' : 'cell groups'}
                  </Pill>
                  <RowChevron />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </InsightCard>

      <InsightCard
        title="Church attendance by member type"
        description="As of today"
      >
        <ChurchAttendanceByType rows={d.attendanceByType} />
      </InsightCard>

      <InsightCard title="Members" description="As of today">
        <CardColumns>
          {(
            [
              ['By member type', 'memberType', d.memberType, MEMBER_TYPE],
              ['By cell status', 'cellStatus', d.cellStatus, CELL_STATUS],
              [
                'By church status',
                'churchStatus',
                d.churchStatus,
                CHURCH_STATUS,
              ],
            ] as const
          ).map(([title, key, rows, words]) => (
            <div key={title} className="flex min-w-0 flex-col gap-3 p-4">
              <h3 className="text-[13px] font-medium">{title}</h3>
              <ul className="flex flex-col gap-1">
                {Object.entries(words).map(([value, word]) => {
                  const n =
                    (rows as ReadonlyArray<{ key: string; n: number }>).find(
                      (r) => r.key === value,
                    )?.n ?? 0
                  const share = d.total ? Math.round((n / d.total) * 100) : 0
                  return (
                    <li key={value}>
                      <Link
                        to="/disciples"
                        search={{ [key]: [value] }}
                        className="-mx-2 flex min-w-0 flex-col gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted/50"
                      >
                        <span className="flex min-w-0 items-baseline justify-between gap-2 text-[13px]">
                          <span className="truncate">{word}</span>
                          <span className="numeric shrink-0 text-xs text-muted-foreground">
                            {n}/{d.total} ({share}%)
                          </span>
                        </span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-chart-1/20">
                          <span
                            className="block h-full rounded-full bg-chart-1"
                            style={{ width: `${share}%` }}
                          />
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </CardColumns>
      </InsightCard>
    </Page>
  )
}

/** Reports filed per week or month, for the kinds that belong together
 * (cell groups; soul winning and consolidation), with a table behind it. */
function TrendCard({
  title,
  description,
  kinds,
  data,
  labels,
  action,
}: {
  title: string
  description: string
  kinds: Array<Kind>
  data: Awaited<ReturnType<typeof getInsights>>
  labels: Array<string>
  action: ReactNode
}) {
  // v2's Show: both kinds together, or just one of them.
  const [show, setShow] = useState<'both' | Kind>('both')
  const shown = show === 'both' ? kinds : [show]
  return (
    <InsightCard
      title={title}
      description={description}
      action={
        <div className="flex items-center gap-2">
          <NativeSelect
            size="sm"
            value={show}
            onChange={(e) => setShow(e.target.value as 'both' | Kind)}
            aria-label={`Show in ${title}`}
          >
            <NativeSelectOption value="both">All</NativeSelectOption>
            {kinds.map((k) => (
              <NativeSelectOption key={k} value={k}>
                {KIND_LABEL[k]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {action}
        </div>
      }
    >
      <div className="flex min-w-0 flex-col gap-3 p-4">
        <TrendChart
          ariaLabel={`${title}: reports filed per ${data.period === 'weeks' ? 'week' : 'month'}, by kind`}
          labels={labels}
          series={shown.map((kind) => ({
            key: kind,
            label: KIND_LABEL[kind],
            color: KIND_COLORS[kind],
            values: data.trend.map((p) => p[kind]),
          }))}
        />
        <details className="text-sm">
          <summary className="cursor-pointer text-[13px] font-medium text-primary">
            Show as a table
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[20rem] border-collapse text-[13px] [&_th]:whitespace-nowrap">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    {data.period === 'weeks' ? 'Week of' : 'Month'}
                  </th>
                  {shown.map((k) => (
                    <th
                      key={k}
                      scope="col"
                      className="px-2 py-1.5 text-right font-medium"
                    >
                      {KIND_LABEL[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.trend.map((p, i) => (
                  <tr key={p.start} className="border-t">
                    <th
                      scope="row"
                      className="py-1.5 pr-3 text-left font-normal"
                    >
                      {labels[i]}
                    </th>
                    {shown.map((k) => (
                      <td key={k} className="numeric px-2 py-1.5 text-right">
                        {p[k]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </InsightCard>
  )
}

function InsightsSkeleton() {
  return (
    <Page wide title="Insights" description="Counting reports and disciples…">
      <div
        aria-busy="true"
        aria-label="Loading insights"
        className="flex flex-col gap-5"
      >
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </Page>
  )
}

const ATTENDED = [
  // One gold ramp that deepens as someone settles in: faint (not yet
  // attended), half (attended), full (regular). Not the report-kind
  // colors above: these mean something else.
  [
    'nacs',
    'Not yet attended (NACS)',
    'color-mix(in oklab, var(--foreground) 24%, transparent)',
    1,
  ],
  [
    'acs',
    'Attended (ACS)',
    'color-mix(in oklab, var(--primary) 50%, transparent)',
    1,
  ],
  ['regular', 'Regular', 'var(--primary)', 1],
] as const

/** v2's Church Attendance By Member Type, as one stacked bar per member
 * type (NACS, ACS and Regular) so the types compare at a glance, each with
 * its total and the three counts labeled. */
function ChurchAttendanceByType({
  rows,
}: {
  rows: ReadonlyArray<{
    type: keyof typeof MEMBER_TYPE
    nacs: number
    acs: number
    regular: number
  }>
}) {
  const shown = rows.filter((r) => r.nacs + r.acs + r.regular > 0)
  return (
    <div className="flex min-w-0 flex-col gap-4 p-4">
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No disciples yet.</p>
      ) : (
        <ul className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          {shown.map((row) => {
            const total = row.nacs + row.acs + row.regular
            return (
              <li key={row.type} className="flex min-w-0 flex-col gap-1.5">
                <span className="flex min-w-0 items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate font-medium">
                    {MEMBER_TYPE[row.type]}
                  </span>
                  <span className="numeric shrink-0 text-xs text-muted-foreground">
                    {total} in all
                  </span>
                </span>
                <span
                  role="img"
                  aria-label={`${MEMBER_TYPE[row.type]}: ${row.nacs} not yet attended, ${row.acs} attended, ${row.regular} regular`}
                  className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted"
                >
                  {ATTENDED.map(([k, , color]) =>
                    row[k] ? (
                      <span
                        key={k}
                        style={{ flexGrow: row[k], background: color }}
                      />
                    ) : null,
                  )}
                </span>
                <span className="numeric flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {ATTENDED.map(([k, label]) => (
                    <span key={k}>
                      {label.replace(/ \(.*\)/, '')} {row[k]}
                    </span>
                  ))}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {ATTENDED.map(([k, label, color]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-sm"
              style={{ background: color }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
