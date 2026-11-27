import { cn } from 'cn'
import { shortDate, shortDay } from '@/lib/dates'

/** A calendar day as a small square: the month over the day, in Inter
 * (no monospace or spaced capitals, as in Osamu). The row beside it says
 * the date in words for screen readers. */
export function DateTile({
  date,
  instant = false,
  accent = true,
  className,
}: {
  date: Date | string
  /** A moment (a report's time), read in Manila; otherwise a calendar day
   * stored as UTC midnight. */
  instant?: boolean
  accent?: boolean
  className?: string
}) {
  const [month, day] = (instant ? shortDate(date) : shortDay(date)).split(' ')
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted leading-none',
        className,
      )}
    >
      <span
        className={cn(
          'text-[10px] font-semibold uppercase',
          accent ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {month}
      </span>
      <span className="mt-0.5 text-[15px] font-semibold">{day}</span>
    </span>
  )
}
