import type { ReactNode } from 'react'
import { cn } from 'cn'

/** A label over a control, with an optional hint and its error. */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: string
  optional?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium">
        {label}
        {optional && (
          <span className="font-normal text-muted-foreground"> · optional</span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Choice chips: one value of a few, as toggle buttons that wrap. */
export function ChipChoice<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T | null
  onChange: (v: T) => void
  options: ReadonlyArray<{ value: T; label: string }>
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-9 max-w-full truncate border px-3 text-[13px] font-medium transition-colors rounded-lg',
              on
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border text-foreground hover:bg-muted',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
