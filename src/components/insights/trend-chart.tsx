import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from 'cn'

export type TrendSeries = {
  key: string
  label: string
  /** A CSS color (a token), the series' identity. */
  color: string
  values: ReadonlyArray<number>
}

const H = 220
const PAD = { top: 16, right: 92, bottom: 26, left: 30 }

/** Lines over time, one per series: 2px lines, a legend above, each line
 * named at its end, a crosshair with a tooltip on hover or tap. */
export function TrendChart({
  labels,
  series,
  ariaLabel,
}: {
  labels: ReadonlyArray<string>
  series: ReadonlyArray<TrendSeries>
  ariaLabel: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) =>
      setWidth(Math.max(280, e.contentRect.width)),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = labels.length
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const top = Math.max(2, Math.ceil(max / 2) * 2)
  const plotW = width - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const x = (i: number) =>
    PAD.left + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const ticks = [0, top / 2, top]

  // End labels, nudged apart so they never overlap.
  const ends = series
    .map((s) => ({ s, y: y(s.values[n - 1] ?? 0) }))
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++)
    if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13

  const every = Math.max(
    1,
    Math.ceil(64 / Math.max(1, plotW / Math.max(1, n - 1))),
  )
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ul
        className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]"
        aria-label="Legend"
      >
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-0.5 w-4"
              style={{ background: s.color }}
            />
            {s.label}
          </li>
        ))}
      </ul>
      <div ref={box} className="relative min-w-0">
        <svg
          role="img"
          aria-label={ariaLabel}
          width={width}
          height={H}
          className="block touch-none"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const px = e.clientX - rect.left
            const i = Math.round(((px - PAD.left) / plotW) * (n - 1))
            setHover(Math.min(n - 1, Math.max(0, i)))
          }}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {t}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % every === (n - 1) % every ? (
              <text
                key={l}
                x={x(i)}
                y={H - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {l}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              className="stroke-muted-foreground"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          {series.map((s) => (
            <g key={s.key}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              />
              {hover !== null && (
                <circle
                  cx={x(hover)}
                  cy={y(s.values[hover] ?? 0)}
                  r={4}
                  fill={s.color}
                  className="stroke-card"
                  strokeWidth={2}
                />
              )}
            </g>
          ))}
          {ends.map(({ s, y: ly }) => (
            <text
              key={s.key}
              x={PAD.left + plotW + 8}
              y={ly + 4}
              className="fill-foreground text-[11px]"
            >
              {s.label} {s.values[n - 1] ?? 0}
            </text>
          ))}
        </svg>
        {hover !== null && (
          <div
            role="status"
            className={cn(
              'pointer-events-none absolute top-1 z-10 flex min-w-36 flex-col gap-1 border bg-popover px-3 py-2 text-xs shadow-lg',
            )}
            style={
              x(hover) > width / 2
                ? { right: width - x(hover) + 10 }
                : { left: x(hover) + 10 }
            }
          >
            <span className="font-medium">{labels[hover]}</span>
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="flex-1">{s.label}</span>
                <span className="numeric font-medium">{s.values[hover]}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** One count per category as thin horizontal bars, in one hue, each with
 * its word and number (a single series: no legend). */
export function CountBars({
  rows,
  total,
}: {
  rows: ReadonlyArray<{ label: string; n: number }>
  total: number
}) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li
          key={r.label}
          className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_auto] items-center gap-3 text-[13px]"
          title={`${r.label}: ${r.n}`}
        >
          <span className="truncate">{r.label}</span>
          <span className="h-2.5 bg-muted">
            <span
              className="block h-full bg-primary"
              style={{ width: `${(r.n / max) * 100}%` }}
            />
          </span>
          <span className="numeric text-right whitespace-nowrap">
            {r.n}
            <span className="text-muted-foreground">
              {' '}
              · {total ? Math.round((r.n / total) * 100) : 0}%
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
