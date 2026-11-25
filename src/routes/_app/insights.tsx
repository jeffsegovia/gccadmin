import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Page, Section } from '@/components/shell/page'
import { CountBars, TrendChart } from '@/components/insights/trend-chart'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { CELL_STATUS, CHURCH_STATUS, MEMBER_TYPE } from '@/lib/labels'
import { shortDay } from '@/lib/dates'
import { getInsights } from '@/server/insights/insights.functions'
import type { Kind } from '@/server/insights/insights.functions'

export const Route = createFileRoute('/_app/insights')({
  validateSearch: z.object({
    period: z.enum(['weeks', 'months']).optional(),
    mine: z.boolean().optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getInsights({ data: deps }),
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
const RANGES = [
  ['this_week', 'This week'],
  ['last_week', 'Last week'],
  ['this_month', 'This month'],
  ['last_month', 'Last month'],
] as const
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
      <Section title="Reports filed">
        <div className="border bg-card dark:border-transparent">
          <table className="w-full table-fixed border-collapse text-[13px] sm:text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th
                  scope="col"
                  className="w-[36%] px-3 py-2.5 font-medium sm:px-4"
                >
                  Report
                </th>
                {RANGES.map(([k, l]) => (
                  <th
                    key={k}
                    scope="col"
                    className="px-1.5 py-2.5 text-right font-medium sm:px-3"
                  >
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KINDS.map((kind) => (
                <tr key={kind} className="border-t">
                  <th scope="row" className="px-4 py-2.5 text-left font-medium">
                    <span className="flex items-start gap-2 sm:items-center">
                      <span
                        aria-hidden="true"
                        className="h-0.5 w-3 shrink-0"
                        style={{ background: KIND_COLOR[kind] }}
                      />
                      <span className="min-w-0 leading-tight">
                        {KIND_LABEL[kind]}
                      </span>
                    </span>
                  </th>
                  {RANGES.map(([k]) => (
                    <td
                      key={k}
                      className="numeric px-1.5 py-2.5 text-right sm:px-3"
                    >
                      {data.tallies[k][kind]}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t text-muted-foreground">
                <th scope="row" className="px-4 py-2.5 text-left font-medium">
                  All reports
                </th>
                {RANGES.map(([k]) => (
                  <td
                    key={k}
                    className="numeric px-1.5 py-2.5 text-right font-medium text-foreground sm:px-3"
                  >
                    {KINDS.reduce((a, kind) => a + data.tallies[k][kind], 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
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
        <div className="flex min-w-0 flex-col gap-3 border bg-card p-4 dark:border-transparent">
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

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Section title={`Soul winning · ${data.yearToDate.year} so far`}>
          <div className="grid grid-cols-3 border bg-card dark:border-transparent [&>*+*]:border-l">
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
          <div className="flex min-w-0 flex-col border bg-card dark:border-transparent">
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
              className="flex min-w-0 flex-col gap-3 border bg-card p-4 dark:border-transparent"
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
