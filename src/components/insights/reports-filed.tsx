import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Calendar, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from 'cn'
import { KIND_COLOR } from '@/components/status-pill'
import { Switch } from '@/components/ui/switch'
import { RANGE_LABEL } from '@/lib/cell-reports/schema'
import type { ReportRange } from '@/lib/cell-reports/schema'
import type { getReportsFiled } from '@/server/insights/insights.functions'

type Filed = Awaited<ReturnType<typeof getReportsFiled>>

/** v2's dashboard card: a title over a dated line, an action on the
 * right, a hairline under the header, then its content. */
export function InsightCard({
  title,
  description,
  action,
  footer,
  children,
  className,
}: {
  title: ReactNode
  /** Shown with a calendar icon, as in v2 ("As of today", the range). */
  description?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-xl border bg-card dark:border-transparent',
        className,
      )}
    >
      <header className="flex min-w-0 items-start justify-between gap-3 border-b px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="truncate text-[15px] font-semibold">{title}</h2>
          {description && (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{description}</span>
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
      {footer && (
        <footer className="flex min-w-0 flex-col gap-2 border-t px-4 py-3">
          {footer}
        </footer>
      )}
    </section>
  )
}

/** Side by side with a line between from 1024px; stacked with a line
 * between below (v2's separators). */
export function CardColumns({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid min-w-0 divide-y lg:auto-cols-fr lg:grid-flow-col lg:divide-x lg:divide-y-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** One big figure: its label with an icon at the right, the number and a
 * line under it (v2's stat). */
export function BigStat({
  label,
  icon,
  n,
  children,
}: {
  label: string
  icon?: ReactNode
  n: number | string
  children?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 p-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-[13px] font-medium">{label}</span>
        {icon}
      </div>
      <span className="numeric text-4xl font-semibold tracking-tight">{n}</span>
      {children && (
        <div className="text-xs text-muted-foreground">{children}</div>
      )}
    </div>
  )
}

const day = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const dayYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "Nov 24 – Nov 30, 2026", as v2 dates its cards. */
export function rangeText(days: readonly [string, string] | null) {
  if (!days) return 'All time'
  const [from, to] = days.map((d) => new Date(`${d}T00:00:00Z`))
  if (from.getTime() === to.getTime()) return dayYear.format(from)
  return `${(from.getUTCFullYear() === to.getUTCFullYear() ? day : dayYear).format(from)} – ${dayYear.format(to)}`
}

/** What the range is compared with, in words. */
const BEFORE: Partial<Record<ReportRange, string>> = {
  this_week: 'last week',
  last_week: 'the week before',
  this_month: 'last month',
  last_month: 'the month before',
  year_to_date: 'the same time last year',
  last_year: 'the year before',
}

const CELL_KINDS = [
  ['discipleship', 'Discipleship', KIND_COLOR.DISCIPLESHIP],
  ['open', 'Open Cell', KIND_COLOR.OPEN],
  ['soulWinning', 'Soul Winning', KIND_COLOR.SOUL_WINNING],
] as const

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0)

/** v2's Cell Groups card body: Reported Cell Groups, Cell Groups
 * Handled and Cell Group Trend side by side, then Cell Groups by
 * Leaders with each leader's assistants as the breakdown. */
export function CellGroupsBody({ data }: { data: Filed }) {
  const cg = data.cellGroups
  const label = RANGE_LABEL[data.range]
  const kinds = CELL_KINDS.filter(([k]) => k !== 'soulWinning' || cg[k] > 0)
  const change =
    cg.previous === null || cg.previous === 0
      ? null
      : Math.round(((cg.total - cg.previous) / cg.previous) * 100)
  const assisted = pct(data.withAssistant, cg.total)
  return (
    <>
      <CardColumns>
        <BigStat label="Reported Cell Groups" n={cg.total}>
          Cell groups {label.toLowerCase()}
          <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
            {kinds.map(([k, name, color]) =>
              cg[k] ? (
                <span
                  key={k}
                  title={`${name}: ${cg[k]}`}
                  style={{ flexGrow: cg[k], background: color }}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-foreground">
            {kinds.map(([k, name, color]) => (
              <li key={k} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: color }}
                />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="numeric text-muted-foreground">
                  {pct(cg[k], cg.total)}% · {cg[k]}
                </span>
              </li>
            ))}
          </ul>
        </BigStat>

        <div className="flex min-w-0 flex-col gap-3 p-4">
          <span className="text-[13px] font-medium">Cell Groups Handled</span>
          <div className="flex min-w-0 items-center gap-5">
            <Ring value={assisted} />
            <ul className="flex min-w-0 flex-1 flex-col gap-3 text-[13px]">
              <li className="flex flex-col">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-sm bg-primary"
                  />
                  With Assistant
                </span>
                <span className="numeric pl-4.5 text-xs text-muted-foreground">
                  {assisted}% · {data.withAssistant}
                </span>
              </li>
              <li className="flex flex-col">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-sm bg-muted-foreground/40"
                  />
                  By Primary
                </span>
                <span className="numeric pl-4.5 text-xs text-muted-foreground">
                  {cg.total ? 100 - assisted : 0}% · {data.byPrimary}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <BigStat
          label="Cell Group Trend"
          n={cg.total}
          icon={
            data.range === 'year_to_date' ? (
              <TrendBadge>YTD</TrendBadge>
            ) : change !== null ? (
              <TrendBadge up={change >= 0}>
                {change >= 0 ? (
                  <TrendingUp aria-hidden="true" className="size-3.5" />
                ) : (
                  <TrendingDown aria-hidden="true" className="size-3.5" />
                )}
                {change >= 0 ? '+' : ''}
                {change}%
              </TrendBadge>
            ) : undefined
          }
        >
          {cg.previous === null
            ? 'Total cell groups'
            : `Total cell groups, compared to ${cg.previous} ${BEFORE[data.range] ?? 'before'}`}
          <Link
            to="/reports"
            search={{ range: data.range }}
            className="mt-3 flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            View Reports <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </BigStat>
      </CardColumns>
      <ByLeaders data={data} />
    </>
  )
}

function TrendBadge({ up, children }: { up?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'numeric inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium',
        up === undefined
          ? 'bg-muted text-muted-foreground'
          : up
            ? 'bg-covered/15 text-covered'
            : 'bg-caution/15 text-caution',
      )}
    >
      {children}
    </span>
  )
}

/** v2's ring: the share with an assistant, the percent in the middle. */
function Ring({ value }: { value: number }) {
  const r = 38
  const c = 2 * Math.PI * r
  return (
    <svg
      viewBox="0 0 90 90"
      className="size-[90px] shrink-0 -rotate-90"
      role="img"
      aria-label={`${value}% with an assistant`}
    >
      <circle
        cx="45"
        cy="45"
        r={r}
        fill="none"
        strokeWidth="9"
        className="stroke-muted"
      />
      <circle
        cx="45"
        cy="45"
        r={r}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        style={{ opacity: value ? 1 : 0 }}
      />
      <text
        x="45"
        y="45"
        dominantBaseline="central"
        textAnchor="middle"
        transform="rotate(90 45 45)"
        className="numeric fill-foreground text-[17px] font-semibold"
      >
        {value}%
      </text>
    </svg>
  )
}

/** v2's Cell Groups by Leaders: one bar per leader (men and women apart,
 * the same color), opening their reports; Show Breakdown lists the cell
 * groups their assistants led under each. */
function ByLeaders({ data }: { data: Filed }) {
  const [breakdown, setBreakdown] = useState(true)
  if (data.men.length + data.women.length === 0) return null
  const most = Math.max(1, ...[...data.men, ...data.women].map((l) => l.total))
  return (
    <div className="flex min-w-0 flex-col gap-4 border-t p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-[15px] font-semibold">Cell Groups by Leaders</h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar aria-hidden="true" className="size-3.5 shrink-0" />
            {rangeText(data.days)}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <Switch checked={breakdown} onCheckedChange={setBreakdown} />
          Show Breakdown
        </label>
      </div>
      <div className="grid min-w-0 gap-6 md:grid-cols-2">
        {(
          [
            ['Male Leaders', data.men],
            ['Female Leaders', data.women],
          ] as const
        ).map(([title, list]) => (
          <div key={title} className="flex min-w-0 flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {title}
            </span>
            {list.length === 0 ? (
              <span className="text-sm text-muted-foreground">None.</span>
            ) : (
              <ul className="flex flex-col gap-2">
                {list.map((l) => {
                  const n = l.total
                  return (
                    <li key={l.id} className="flex min-w-0 flex-col gap-1.5">
                      <Bar
                        to={{ leader: l.id, range: data.range }}
                        name={l.name}
                        n={n}
                        share={n / most}
                      />
                      {breakdown && l.assistants.length > 0 && (
                        <ul className="flex flex-col gap-1.5 pl-5">
                          {l.assistants.map((a) => (
                            <li key={a.id}>
                              <Bar
                                small
                                to={{ assistant: a.id, range: data.range }}
                                name={a.name}
                                n={a.n}
                                share={a.n / most}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
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

function Bar({
  to,
  name,
  n,
  share,
  small,
}: {
  to: { leader?: string; assistant?: string; range: ReportRange }
  name: string
  n: number
  share: number
  small?: boolean
}) {
  return (
    <Link
      to="/reports"
      search={to}
      title={`${name}: ${n} ${n === 1 ? 'cell group' : 'cell groups'}`}
      className={cn(
        'relative flex min-w-0 items-center overflow-hidden rounded-md bg-muted/60 hover:bg-muted',
        small ? 'h-6 text-xs' : 'h-7 text-[13px]',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 rounded-md',
          small ? 'bg-primary/20' : 'bg-primary/35',
        )}
        style={{ width: `${Math.max(n ? 4 : 0, share * 100)}%` }}
      />
      <span className="relative flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5">
        <span className="truncate">{name}</span>
        <span className="numeric shrink-0 font-medium">{n}</span>
      </span>
    </Link>
  )
}
