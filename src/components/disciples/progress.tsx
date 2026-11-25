import { cn } from 'cn'
import { PROCESS_LEVEL, PROCESS_STATUS, PROCESS_STEPS } from '@/lib/labels'

export function GrowthBar({
  level,
  status,
}: {
  level: keyof typeof PROCESS_LEVEL
  status: keyof typeof PROCESS_STATUS
}) {
  const index = PROCESS_STEPS.indexOf(level)
  return (
    <section
      aria-label="Growth process"
      className="flex min-w-0 flex-col gap-2.5 border bg-card p-4 dark:border-transparent rounded-xl"
    >
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium text-muted-foreground">
          Growth process
        </h2>
        <span className="truncate text-xs font-medium text-primary">
          {PROCESS_LEVEL[level]}
          {level !== 'NONE' && ` · ${PROCESS_STATUS[status].toLowerCase()}`}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {PROCESS_STEPS.map((step, i) => (
          <span
            key={step}
            className={cn('h-1.5', i <= index ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1 text-[10px] text-muted-foreground">
        {['Pre-enc.', 'Encounter', 'L1', 'L2', 'L3'].map((s, i) => (
          <span
            key={s}
            className={cn('truncate', i === index && 'text-foreground')}
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  )
}

export function Weeks({
  label,
  weeks,
}: {
  label: string
  weeks: ReadonlyArray<boolean>
}) {
  const n = weeks.filter(Boolean).length
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="w-20 shrink-0 text-[13px]">{label}</span>
      <span
        className="grid min-w-0 flex-1 grid-cols-12 gap-0.5"
        role="img"
        aria-label={`${label}: ${n} of ${weeks.length}`}
      >
        {weeks.map((on, i) => (
          <span
            key={i}
            className={cn('h-3.5', on ? 'bg-covered' : 'bg-muted')}
          />
        ))}
      </span>
      <span className="numeric w-10 shrink-0 text-right text-[13px] font-semibold">
        {n}
      </span>
    </div>
  )
}
