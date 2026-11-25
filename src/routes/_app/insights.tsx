import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  Flame,
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
  BigStat,
  CardColumns,
  CellGroupsBody,
  InsightCard,
  rangeText,
} from '@/components/insights/reports-filed'
import { KIND_COLOR, Pill } from '@/components/status-pill'
import { RowChevron } from '@/components/ui/list'
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
  open: 'Open cell',
  discipleship: 'Discipleship',
  soulWinning: 'Soul winning',
  consolidation: 'Consolidation',
}
const KIND_COLORS: Record<Kind, string> = {
  open: 'var(--series-1)',
  discipleship: 'var(--series-2)',
  soulWinning: 'var(--series-3)',
  consolidation: 'var(--series-4)',
}
const KINDS = Object.keys(KIND_LABEL) as Array<Kind>

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

  return (
    <Page
      wide
      title="Insights"
      description={
        data.everyone
          ? 'Quick insights on cell groups and members.'
          : 'Quick insights on your network’s cell groups and members.'
      }
      action={
        data.canChooseScope && (
          <Segmented
            label="Whose"
            className="w-56"
            value={search.mine ? 'mine' : 'all'}
            onChange={(v) => set({ mine: v === 'mine' ? true : undefined })}
            options={[
              { value: 'all', label: 'Whole church' },
              { value: 'mine', label: 'My network' },
            ]}
          />
        )
      }
    >
      <InsightCard
        title="Soul Winning Activity"
        description={`Year to date (${data.yearToDate.year})`}
        action={
          <Link
            to="/soul-winning"
            className="flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            View Reports <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        }
        footer={
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Flame aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            Based on reports submitted through the Soul Winning module. Sessions
            and new believers are tracked separately from cell group reports.
          </p>
        }
      >
        <CardColumns>
          <BigStat
            label="SW Sessions"
            n={data.yearToDate.soulWinning}
            icon={
              <BookOpen
                aria-hidden="true"
                className="size-4"
                style={{ color: KIND_COLOR.SOUL_WINNING }}
              />
            }
          >
            soul winning sessions
          </BigStat>
          <BigStat
            label="Conso Sessions"
            n={data.yearToDate.consolidation}
            icon={
              <HeartHandshake
                aria-hidden="true"
                className="size-4"
                style={{ color: KIND_COLOR.CONSOLIDATION }}
              />
            }
          >
            consolidation sessions
          </BigStat>
          <BigStat
            label="New Believers"
            n={data.yearToDate.believers}
            icon={
              <Users
                aria-hidden="true"
                className="size-4"
                style={{ color: KIND_COLOR.OPEN }}
              />
            }
          >
            believers recorded
          </BigStat>
        </CardColumns>
      </InsightCard>

      <InsightCard
        title="Cell Groups"
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

      <InsightCard
        title="Cell Report Trend"
        description={
          data.period === 'weeks' ? 'The last 12 weeks' : 'The last 6 months'
        }
        action={
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
        }
      >
        <div className="flex min-w-0 flex-col gap-3 p-4">
          <TrendChart
            ariaLabel={`Reports filed per ${data.period === 'weeks' ? 'week' : 'month'}, by kind`}
            labels={labels}
            series={KINDS.map((kind) => ({
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
              <table className="w-full min-w-[30rem] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      {data.period === 'weeks' ? 'Week of' : 'Month'}
                    </th>
                    {KINDS.map((k) => (
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
                      {KINDS.map((k) => (
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

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <InsightCard
          className="lg:col-span-2"
          title="Church Attendance By Member Type"
          description="As of today"
        >
          <ChurchAttendanceByType rows={d.attendanceByType} />
        </InsightCard>
        <InsightCard title="Disciples with Cell Groups" description="This week">
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
      </div>

      <InsightCard title="Member Statistics" description="As of today">
        <CardColumns>
          {(
            [
              ['Members by Type', 'memberType', d.memberType, MEMBER_TYPE],
              [
                'Members by Cell Status',
                'cellStatus',
                d.cellStatus,
                CELL_STATUS,
              ],
              [
                'Members by Church Status',
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
                        <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-primary"
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
  ['nacs', 'Not yet attended (NACS)', 'var(--muted-foreground)', 0.45],
  ['acs', 'Attended (ACS)', 'var(--primary)', 1],
  ['regular', 'Regular', 'var(--covered)', 1],
] as const

/** v2's Church Attendance By Member Type: a donut per member type
 * (NACS, ACS and Regular), its total and the type in the middle. */
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
  const r = 40
  const c = 2 * Math.PI * r
  return (
    <div className="flex min-w-0 flex-col gap-4 p-4">
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No disciples yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {shown.map((row) => {
            const total = row.nacs + row.acs + row.regular
            let at = 0
            return (
              <li
                key={row.type}
                className="flex min-w-0 flex-col items-center gap-2 text-center"
                title={`${MEMBER_TYPE[row.type]}: NACS ${row.nacs}, ACS ${row.acs}, Regular ${row.regular}`}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="size-28 max-w-full"
                  role="img"
                  aria-label={`${MEMBER_TYPE[row.type]}: ${total} in all, ${row.nacs} not yet attended, ${row.acs} attended, ${row.regular} regular`}
                >
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    strokeWidth="12"
                    className="stroke-muted"
                  />
                  {ATTENDED.map(([k, , color, opacity]) => {
                    const len = (row[k] / total) * c
                    const offset = at
                    at += len
                    return row[k] ? (
                      <circle
                        key={k}
                        cx="50"
                        cy="50"
                        r={r}
                        fill="none"
                        strokeWidth="12"
                        stroke={color}
                        strokeOpacity={opacity}
                        strokeDasharray={`${Math.max(0, len - 1)} ${c}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 50 50)"
                      />
                    ) : null
                  })}
                  <text
                    x="50"
                    y="47"
                    textAnchor="middle"
                    className="numeric fill-foreground text-[18px] font-semibold"
                  >
                    {total}
                  </text>
                  <text
                    x="50"
                    y="62"
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px]"
                  >
                    {MEMBER_TYPE[row.type]}
                  </text>
                </svg>
                <span className="numeric text-xs text-muted-foreground">
                  {row.nacs} · {row.acs} · {row.regular}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {ATTENDED.map(([k, label, color, opacity]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-sm"
              style={{ background: color, opacity }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
