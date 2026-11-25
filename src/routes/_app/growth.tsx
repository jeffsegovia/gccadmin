import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'
import { z } from 'zod'
import { cn } from 'cn'
import { Empty, Page } from '@/components/shell/page'
import { Pill } from '@/components/status-pill'
import { Group, RowChevron } from '@/components/ui/list'
import { processLevel } from '@/db/schema'
import type { ProcessLevel } from '@/db/schema'
import { PROCESS_LEVEL, PROCESS_STATUS } from '@/lib/labels'
import { getGrowth } from '@/server/growth/growth.functions'

export const Route = createFileRoute('/_app/growth')({
  validateSearch: z.object({
    level: z.enum(processLevel.enumValues).optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getGrowth({ data: deps }),
  head: () => ({ meta: [{ title: 'Growth process · GCC Admin' }] }),
  component: GrowthPage,
})

const LEVELS: ReadonlyArray<ProcessLevel> = [
  'NONE',
  'PREENC',
  'ENCOUNTER',
  'LEADERSHIP_1',
  'LEADERSHIP_2',
  'LEADERSHIP_3',
]

function GrowthPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate({ from: Route.fullPath })
  const total = (l: ProcessLevel) =>
    data.counts.filter((c) => c.level === l).reduce((a, c) => a + c.n, 0)
  const ongoing = (l: ProcessLevel) =>
    data.counts
      .filter((c) => c.level === l && c.status === 'ON_GOING')
      .reduce((a, c) => a + c.n, 0)
  const max = Math.max(1, ...LEVELS.map(total))
  return (
    <Page
      title="Growth process"
      description={`Where ${data.everyone ? 'the church' : 'your network'} is in the Growth Process System.`}
    >
      <div className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t rounded-xl overflow-hidden">
        {LEVELS.map((l) => {
          const n = total(l)
          const on = l === data.level
          return (
            <button
              key={l}
              type="button"
              aria-pressed={on}
              onClick={() =>
                void navigate({ search: { level: l }, replace: true })
              }
              className={cn(
                'flex min-h-13 min-w-0 items-center gap-3 px-3.5 py-2 text-left hover:bg-muted/50',
                on && 'bg-muted',
              )}
            >
              <span
                className={cn(
                  'w-28 shrink-0 truncate text-sm font-medium',
                  on && 'text-primary',
                )}
              >
                {PROCESS_LEVEL[l]}
              </span>
              <span className="h-2.5 min-w-0 flex-1 bg-muted">
                <span
                  className="block h-full bg-primary"
                  style={{ width: `${(n / max) * 100}%` }}
                />
              </span>
              <span className="numeric w-10 shrink-0 text-right text-sm font-semibold">
                {n}
              </span>
              <span className="w-20 shrink-0 truncate text-right text-xs text-muted-foreground max-sm:hidden">
                {ongoing(l) ? `${ongoing(l)} ongoing` : ''}
              </span>
              <RowChevron />
            </button>
          )
        })}
      </div>
      <section className="flex min-w-0 flex-col gap-2">
        <h2 className="px-0.5 text-[13px] font-medium text-muted-foreground">
          {PROCESS_LEVEL[data.level]} · {data.people.length}
        </h2>
        {data.people.length === 0 ? (
          <Empty icon={TrendingUp} title="Nobody at this step yet." />
        ) : (
          <Group>
            {data.people.map((p) => (
              <Link
                key={p.id}
                to="/disciples/$discipleId"
                params={{ discipleId: p.id }}
                className="flex min-h-13 min-w-0 items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{p.name}</span>
                  {data.everyone && p.leaderName && (
                    <span className="truncate text-xs text-muted-foreground">
                      {p.leaderName}
                    </span>
                  )}
                </span>
                <Pill
                  tone={
                    p.status === 'FINISHED'
                      ? 'covered'
                      : p.status === 'ON_GOING'
                        ? 'primary'
                        : p.status === 'DROPPED'
                          ? 'short'
                          : 'neutral'
                  }
                >
                  {PROCESS_STATUS[p.status]}
                </Pill>
                <RowChevron />
              </Link>
            ))}
          </Group>
        )}
      </section>
    </Page>
  )
}
