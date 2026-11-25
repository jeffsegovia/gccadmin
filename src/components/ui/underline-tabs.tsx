import { cn } from 'cn'

/** Page sections as plain underline tabs (as in Osamu): no box, the
 * active one underlined in the primary color. Scrolls sideways when the
 * labels don't fit. */
export function UnderlineTabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (next: T) => void
  options: ReadonlyArray<{ value: T; label: string; count?: number }>
  label: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'scrollbar-none flex min-w-0 gap-5 overflow-x-auto border-b',
        className,
      )}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              '-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-sm font-medium whitespace-nowrap transition-colors',
              on
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className="numeric text-xs text-muted-foreground">
                {o.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
