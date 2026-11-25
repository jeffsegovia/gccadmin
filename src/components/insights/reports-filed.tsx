import { useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from 'cn'
import { KIND_COLOR } from '@/components/status-pill'
import { Switch } from '@/components/ui/switch'
import type { getReportsFiled } from '@/server/insights/insights.functions'

type Filed = Awaited<ReturnType<typeof getReportsFiled>>

const KINDS = [
  ['open', 'Open Cell', KIND_COLOR.OPEN],
  ['discipleship', 'Discipleship', KIND_COLOR.DISCIPLESHIP],
  ['soulWinning', 'Soul Winning', KIND_COLOR.SOUL_WINNING],
  ['consolidation', 'Consolidation', KIND_COLOR.CONSOLIDATION],
] as const
/** A leader's cell groups by kind (cell reports only, as v2). */
const CELL_KINDS = [
  ['open', 'Open Cell', KIND_COLOR.OPEN],
  ['discipleship', 'Discipleship', KIND_COLOR.DISCIPLESHIP],
  ['soulWinning', 'Soul Winning', KIND_COLOR.SOUL_WINNING],
] as const

/** v2's Cell Groups card: reports filed in the range as one bar per kind
 * (each labeled with its count), the change from the period before, cell
 * groups with an assistant or by the primary, and Cell Groups by
 * Leaders, men and women apart, with Show breakdown by kind. */
export function ReportsFiled({ data }: { data: Filed }) {
  const max = Math.max(1, ...KINDS.map(([k]) => data.kinds[k]))
  const change =
    data.previous === null || data.previous === 0
      ? null
      : Math.round(((data.total - data.previous) / data.previous) * 100)
  const cellTotal = data.withAssistant + data.byPrimary
  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-4 dark:border-transparent">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Reports filed</span>
          <span className="numeric text-3xl font-semibold tracking-tight">
            {data.total}
          </span>
        </div>
        {data.previous !== null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[13px]',
              change === null
                ? 'text-muted-foreground'
                : change >= 0
                  ? 'text-covered'
                  : 'text-caution',
            )}
          >
            {change !== null &&
              (change >= 0 ? (
                <TrendingUp aria-hidden="true" className="size-4" />
              ) : (
                <TrendingDown aria-hidden="true" className="size-4" />
              ))}
            {change === null
              ? `${data.previous} the period before`
              : `${change >= 0 ? '+' : ''}${change}% from ${data.previous} the period before`}
          </span>
        )}
      </div>

      {/* One bar per kind, in the kind's color, its count on top. */}
      <div
        role="img"
        aria-label={KINDS.map(([k, label]) => `${label} ${data.kinds[k]}`).join(
          ', ',
        )}
        className="grid h-44 grid-cols-4 items-end gap-3 border-b pb-px sm:gap-6"
      >
        {KINDS.map(([k, label, color]) => (
          <div
            key={k}
            className="flex h-full min-w-0 flex-col items-center justify-end gap-1"
            title={`${label}: ${data.kinds[k]}`}
          >
            <span className="numeric text-sm font-medium">{data.kinds[k]}</span>
            <span
              className="w-full max-w-16 rounded-t-md"
              style={{
                background: color,
                height: `${Math.max(data.kinds[k] ? 3 : 0, (data.kinds[k] / max) * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="-mt-3 grid grid-cols-4 gap-3 text-center text-[11px] text-muted-foreground sm:gap-6 sm:text-xs">
        {KINDS.map(([k, label]) => (
          // Whole words only: "Consolidation" never splits.
          <span
            key={k}
            className="min-w-0 leading-tight [overflow-wrap:normal]"
          >
            {label}
          </span>
        ))}
      </div>

      {/* v2's Cell Groups Handled. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="font-medium">Cell groups handled</span>
          <span className="text-muted-foreground">{cellTotal} in all</span>
        </div>
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
          {cellTotal > 0 && (
            <>
              <span
                className="bg-primary"
                style={{ flexGrow: data.withAssistant }}
              />
              <span
                className="bg-foreground/35"
                style={{ flexGrow: data.byPrimary }}
              />
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-sm bg-primary" />
            With an assistant · {data.withAssistant}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-sm bg-foreground/35"
            />
            By the primary · {data.byPrimary}
          </span>
        </div>
      </div>

      <ByLeaders men={data.men} women={data.women} />
    </div>
  )
}

function ByLeaders({
  men,
  women,
}: {
  men: Filed['men']
  women: Filed['women']
}) {
  const [breakdown, setBreakdown] = useState(false)
  if (men.length + women.length === 0) return null
  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium">Cell Groups by Leaders</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={breakdown} onCheckedChange={setBreakdown} />
          Show breakdown
        </label>
      </div>
      {breakdown && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {CELL_KINDS.map(([k, label, color]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-sm"
                style={{ background: color }}
              />
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="grid min-w-0 gap-5 md:grid-cols-2">
        {(
          [
            ['Male leaders', men],
            ['Female leaders', women],
          ] as const
        ).map(([title, list]) => (
          <div key={title} className="flex min-w-0 flex-col gap-2">
            <span className="text-xs text-muted-foreground">{title}</span>
            {list.length === 0 ? (
              <span className="text-sm text-muted-foreground">None.</span>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((l) => {
                  const most = Math.max(1, ...list.map((x) => x.total))
                  return (
                    <li
                      key={l.id}
                      className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-3 text-[13px]"
                      title={`${l.name}: ${l.total} (Open ${l.open}, Discipleship ${l.discipleship}, Soul Winning ${l.soulWinning})`}
                    >
                      <span className="truncate">{l.name}</span>
                      <span className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className="flex h-full gap-px"
                          style={{ width: `${(l.total / most) * 100}%` }}
                        >
                          {breakdown ? (
                            CELL_KINDS.map(([k, , color]) =>
                              l[k] ? (
                                <span
                                  key={k}
                                  style={{ flexGrow: l[k], background: color }}
                                />
                              ) : null,
                            )
                          ) : (
                            <span className="flex-1 bg-primary" />
                          )}
                        </span>
                      </span>
                      <span className="numeric text-right">{l.total}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
