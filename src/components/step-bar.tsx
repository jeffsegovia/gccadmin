import { cn } from 'cn'

/** The steps of a multi-step form as a row of bars: the current one and
 * those before it filled, the ones reached so far tappable. Shared by the
 * cell report and disciple forms. */
export function StepBar({
  steps,
  step,
  reached,
  onPick,
}: {
  steps: ReadonlyArray<string>
  step: number
  reached: number
  onPick: (step: number) => void
}) {
  return (
    <ol
      aria-label="Steps"
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((label, i) => {
        const can = i <= reached && i !== step
        return (
          <li key={label} className="min-w-0">
            <button
              type="button"
              disabled={!can}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => onPick(i)}
              className="flex w-full min-w-0 flex-col gap-1.5 text-left disabled:cursor-default"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-1 w-full rounded-full',
                  i <= step ? 'bg-primary' : 'bg-foreground/12',
                )}
              />
              <span
                className={cn(
                  'truncate text-xs',
                  i === step
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground',
                  can && 'hover:text-foreground',
                )}
              >
                {i + 1}. {label}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
