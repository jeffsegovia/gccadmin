import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'

/** A segmented control: one choice of a few, as radio buttons in a track.
 * Arrow keys move between options, as a radio group should. An option
 * with an icon shows only the icon; its label names it to screen readers
 * and in the tooltip. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'default',
}: {
  value: T
  onChange: (next: T) => void
  options: ReadonlyArray<{ value: T; label: string; icon?: LucideIcon }>
  label: string
  className?: string
  size?: 'default' | 'sm'
}) {
  const index = options.findIndex((o) => o.value === value)
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex gap-0.5 rounded-none bg-card p-[3px]', className)}
      onKeyDown={(e) => {
        const step =
          e.key === 'ArrowRight' || e.key === 'ArrowDown'
            ? 1
            : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
              ? -1
              : 0
        if (!step) return
        e.preventDefault()
        const next = options[(index + step + options.length) % options.length]
        onChange(next.value)
        const buttons =
          e.currentTarget.querySelectorAll<HTMLButtonElement>('button')
        buttons[(index + step + options.length) % options.length]?.focus()
      }}
    >
      {options.map((o) => {
        const on = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            aria-label={Icon ? o.label : undefined}
            title={Icon ? o.label : undefined}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center truncate rounded-none px-1.5 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'h-7 text-xs' : 'h-8 text-[13px]',
              Icon && 'w-9 flex-none [&_svg]:size-4',
              on
                ? 'bg-secondary text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon ? <Icon aria-hidden="true" /> : o.label}
          </button>
        )
      })}
    </div>
  )
}
