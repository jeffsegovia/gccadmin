import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'

/** One choice of a few, each a card with an icon, its name and a line.
 * Arrow keys move between cards, as a radio group should. */
export function RadioCards<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (next: T) => void
  options: ReadonlyArray<{
    value: T
    label: string
    hint?: string
    icon: LucideIcon
  }>
  label: string
  className?: string
}) {
  const index = options.findIndex((o) => o.value === value)
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'grid grid-cols-1 gap-2 sm:grid-cols-[repeat(var(--cards),minmax(0,1fr))]',
        className,
      )}
      style={{ '--cards': options.length } as React.CSSProperties}
      onKeyDown={(e) => {
        const step =
          e.key === 'ArrowRight' || e.key === 'ArrowDown'
            ? 1
            : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
              ? -1
              : 0
        if (!step) return
        e.preventDefault()
        const i = (index + step + options.length) % options.length
        onChange(options[i].value)
        e.currentTarget
          .querySelectorAll<HTMLButtonElement>('button')
          [i]?.focus()
      }}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-w-0 items-center gap-3 border p-3 text-left transition-colors sm:flex-col sm:items-start sm:gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg',
              on
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted/50',
            )}
          >
            <span className="contents sm:flex sm:w-full sm:items-center sm:justify-between sm:gap-2">
              <o.icon
                aria-hidden="true"
                className={cn(
                  'size-5 shrink-0',
                  on ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] max-sm:order-2',
                  on ? 'border-primary' : 'border-foreground/30',
                )}
              >
                {on && <span className="size-2 rounded-full bg-primary" />}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 max-sm:order-1 sm:w-full">
              <span className="truncate text-sm font-medium">{o.label}</span>
              {o.hint && (
                <span className="text-xs leading-snug text-muted-foreground">
                  {o.hint}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
