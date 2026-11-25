import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from 'cn'

export type TrendSeries = {
  key: string
  label: string
  /** A CSS color (a token), the series' identity. */
  color: string
  values: ReadonlyArray<number>
}

const H = 230
const PAD = { top: 18, right: 8, bottom: 26, left: 30 }

/** Reports over time as v2 drew them: each period has one bar per
 * series side by side, from the baseline. A legend above; hovering or
 * tapping a period shows each series and the total. */
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
  const totals = labels.map((_, i) =>
    series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0),
  )
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  // A rounded top so the gridlines land on whole numbers.
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 40 ? 5 : 10
  const top = Math.ceil(max / step) * step
  const ticks = [0, Math.round(top / 2), top]
  const plotW = width - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const band = plotW / Math.max(1, n)
  const k = Math.max(1, series.length)
  // Bars of a period sit together, a hairline apart.
  const barW = Math.max(3, Math.min(22, (band * 0.72 - (k - 1) * 2) / k))
  const groupW = barW * k + (k - 1) * 2
  const cx = (i: number) => PAD.left + band * i + band / 2
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const every = Math.max(1, Math.ceil(56 / band))

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
              className="size-2.5 shrink-0"
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
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(t)}
                y2={y(t)}
                className={
                  t === 0 ? 'stroke-muted-foreground/50' : 'stroke-border'
                }
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
          {labels.map((l, i) => {
            const x0 = cx(i) - groupW / 2
            return (
              <g key={l} opacity={hover === null || hover === i ? 1 : 0.45}>
                {series.map((s, j) => {
                  const v = s.values[i] ?? 0
                  if (!v) return null
                  const h = Math.max(1, (v / top) * plotH)
                  return (
                    <rect
                      key={s.key}
                      x={x0 + j * (barW + 2)}
                      y={y(0) - h}
                      width={barW}
                      height={h}
                      rx={Math.min(3, barW / 3)}
                      fill={s.color}
                    />
                  )
                })}
                {i % every === (n - 1) % every && (
                  <text
                    x={cx(i)}
                    y={H - 6}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[11px]"
                  >
                    {l}
                  </text>
                )}
                {/* The whole column is the hover target, wider than the bar. */}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerDown={() => setHover(i)}
                />
              </g>
            )
          })}
        </svg>
        {hover !== null && (
          <div
            role="status"
            className={cn(
              'pointer-events-none absolute top-1 z-10 flex min-w-40 flex-col gap-1 border bg-popover px-3 py-2 text-xs shadow-lg rounded-lg',
            )}
            style={
              cx(hover) > width / 2
                ? { right: width - cx(hover) + groupW / 2 + 8 }
                : { left: cx(hover) + groupW / 2 + 8 }
            }
          >
            <span className="font-medium">{labels[hover]}</span>
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0"
                  style={{ background: s.color }}
                />
                <span className="flex-1">{s.label}</span>
                <span className="numeric font-medium">{s.values[hover]}</span>
              </span>
            ))}
            <span className="mt-0.5 flex items-center gap-2 border-t pt-1">
              <span className="flex-1 text-muted-foreground">Total</span>
              <span className="numeric font-medium">{totals[hover]}</span>
            </span>
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
