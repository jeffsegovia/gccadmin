import type { ComponentProps, ComponentType, ReactNode } from 'react'
import { cn } from 'cn'
import { ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

/** A tinted group of rows divided by hairlines: the redesign's one
 * container. Rows go straight inside; never a bordered card in a card. */
export function Group({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card dark:border-transparent [&>*+*]:border-t [&>*+*]:border-border',
        className,
      )}
      {...props}
    />
  )
}

/** The chevron at the end of a row that opens something (as in Osamu),
 * so a row reads as tappable at a glance. */
export function RowChevron({ className }: { className?: string }) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={cn('size-4 shrink-0 text-muted-foreground/70', className)}
    />
  )
}

/** A list row: an optional leading tile, the main text, and what goes at
 * the end (an amount, a status, a chevron). Links and buttons that are
 * rows use `rowClass`. */
export const rowClass =
  'flex min-h-13 w-full items-center gap-3 px-3.5 py-2 text-left'

export function Row({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn(rowClass, className)} {...props} />
}

/** Title and subtitle of a row, truncating instead of wrapping. */
export function RowText({
  title,
  subtitle,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <div className="truncate text-sm font-medium">{title}</div>
      {subtitle && (
        <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
      )}
    </div>
  )
}

/** A 32px rounded square for a row's icon or badge. */
export function Tile({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

/** Big numbers line up: a small label (with an icon) over a large
 * tabular figure, in a strip of equal cells. Its own bordered card,
 * flat like Safe to spend, so the summary reads as a headline and not
 * as a row (19 November 2026). A cell's tone colors its icon and figure;
 * the label always says what it means. */
export type StatTone = 'covered' | 'caution' | 'short'

export type StatItem = {
  label: ReactNode
  value: ReactNode
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  tone?: StatTone
  /** Makes the cell a button that opens its detail. */
  onClick?: () => void
  /** Makes the cell a link to its page. */
  to?: string
}

export function StatStrip({
  items,
  className,
}: {
  items: ReadonlyArray<StatItem>
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid overflow-hidden rounded-xl border border-border bg-card [&>*+*]:border-l [&>*+*]:border-border',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item, i) => {
        const Icon = item.icon
        const opens = !!(item.onClick || item.to)
        const Cell = item.to ? Link : item.onClick ? 'button' : 'div'
        return (
          <Cell
            key={i}
            {...(item.to
              ? { to: item.to }
              : item.onClick
                ? { type: 'button' as const, onClick: item.onClick }
                : {})}
            className={cn(
              'flex min-w-0 flex-col gap-1 px-3.5 py-3.5 text-left',
              opens &&
                'transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
            )}
          >
            {/* The icon sits above the label so three cells fit a phone
                without cutting the label short. */}
            {Icon && (
              <Icon
                aria-hidden={true}
                className={cn(
                  'size-4 shrink-0',
                  item.tone ? TONE_TEXT[item.tone] : 'text-primary',
                )}
              />
            )}
            <div className="flex items-center gap-0.5 text-xs leading-snug text-muted-foreground">
              {item.label}
              {opens && (
                <ChevronRight
                  aria-hidden="true"
                  className="size-3 shrink-0 max-sm:hidden"
                />
              )}
            </div>
            <div
              className={cn(
                'numeric mt-auto truncate text-lg leading-tight font-semibold tracking-tight sm:text-xl',
                item.tone && TONE_TEXT[item.tone],
              )}
            >
              {item.value}
            </div>
          </Cell>
        )
      })}
    </div>
  )
}

const TONE_TEXT: Record<StatTone, string> = {
  covered: 'text-covered',
  caution: 'text-caution',
  short: 'text-short',
}
