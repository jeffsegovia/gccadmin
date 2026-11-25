import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Page, Section } from '@/components/shell/page'
import { CountBars, TrendChart } from '@/components/insights/trend-chart'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { CELL_STATUS, CHURCH_STATUS, MEMBER_TYPE } from '@/lib/labels'
import { shortDay } from '@/lib/dates'
import {
  getInsights,
  getReportsFiled,
} from '@/server/insights/insights.functions'
import { ReportsFiled } from '@/components/insights/reports-filed'
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
const KIND_COLOR: Record<Kind, string> = {
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

  return (
    <Page
      wide
      title="Insights"
      description={data.everyone ? 'The whole church' : 'Your network'}
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
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Section title={`Soul winning · ${data.yearToDate.year} so far`}>
          <div className="grid grid-cols-3 border bg-card dark:border-transparent [&>*+*]:border-l rounded-xl overflow-hidden">
            {(
              [
                ['Sessions', data.yearToDate.soulWinning],
                ['Consolidation', data.yearToDate.consolidation],
                ['New believers', data.yearToDate.believers],
              ] as const
            ).map(([label, n]) => (
              <div
                key={label}
                className="flex min-w-0 flex-col gap-0.5 px-3 py-3 sm:px-4"
              >
                <span className="truncate text-xs text-muted-foreground">
                  {label}
                </span>
                <span className="numeric text-2xl font-semibold">{n}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Cell groups this week">
          <div className="flex min-w-0 flex-col border bg-card dark:border-transparent rounded-xl">
            <div className="grid grid-cols-2 border-b [&>*+*]:border-l">
              <div className="flex min-w-0 flex-col gap-0.5 px-3 py-3 sm:px-4">
                <span className="truncate text-xs text-muted-foreground">
                  Reported
                </span>
                <span className="numeric text-2xl font-semibold">
                  {data.cellGroupsThisWeek.total}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5 px-3 py-3 sm:px-4">
                <span className="truncate text-xs text-muted-foreground">
                  With an assistant
                </span>
                <span className="numeric text-2xl font-semibold">
                  {data.cellGroupsThisWeek.withAssistant}
                </span>
              </div>
            </div>
            <h3 className="px-3 pt-3 text-[13px] font-medium text-muted-foreground sm:px-4">
              Disciples leading cell groups
            </h3>
            {data.cellGroupsThisWeek.assistants.length === 0 ? (
              <p className="px-3 pt-1 pb-3 text-sm text-muted-foreground sm:px-4">
                None this week yet.
              </p>
            ) : (
              <ul className="flex flex-col px-3 pb-2 sm:px-4 [&>*+*]:border-t">
                {data.cellGroupsThisWeek.assistants.map((a) => (
                  <li
                    key={a.id}
                    className="flex min-w-0 items-center gap-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <span className="numeric shrink-0 text-muted-foreground">
                      {a.n} {a.n === 1 ? 'group' : 'groups'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>

      <Section
        title="Reports filed"
        action={
          <NativeSelect
            size="sm"
            value={search.filed ?? 'this_week'}
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
      >
        <ReportsFiled data={data.filed} />
        {data.summary && <SummaryEmail status={data.summary} />}
      </Section>

      <Section
        title={
          data.period === 'weeks'
            ? 'Trend · last 12 weeks'
            : 'Trend · last 6 months'
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
        <div className="flex min-w-0 flex-col gap-3 border bg-card p-4 dark:border-transparent rounded-xl">
          <TrendChart
            ariaLabel={`Reports filed per ${data.period === 'weeks' ? 'week' : 'month'}, by kind`}
            labels={labels}
            series={KINDS.map((kind) => ({
              key: kind,
              label: KIND_LABEL[kind],
              color: KIND_COLOR[kind],
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
      </Section>

      <Section title={`Disciples · ${d.total}`}>
        <div className="grid min-w-0 gap-4 lg:grid-cols-3">
          {(
            [
              ['By group', d.memberType, MEMBER_TYPE],
              ['By church status', d.churchStatus, CHURCH_STATUS],
              ['By cell status', d.cellStatus, CELL_STATUS],
            ] as const
          ).map(([title, rows, words]) => (
            <div
              key={title}
              className="flex min-w-0 flex-col gap-3 border bg-card p-4 dark:border-transparent rounded-xl"
            >
              <h3 className="text-[13px] font-medium text-muted-foreground">
                {title}
              </h3>
              <CountBars
                total={d.total}
                rows={(Object.keys(words) as Array<keyof typeof words>).map(
                  (key) => ({
                    label: (words as Record<string, string>)[key],
                    n:
                      (rows as ReadonlyArray<{ key: string; n: number }>).find(
                        (r) => r.key === key,
                      )?.n ?? 0,
                  }),
                )}
              />
            </div>
          ))}
        </div>
      </Section>
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
