import { Link } from '@tanstack/react-router'
import { Cake } from 'lucide-react'
import { cn } from 'cn'
import { Pill } from '@/components/status-pill'
import { Group, RowChevron } from '@/components/ui/list'
import { longDay } from '@/lib/dates'

/** Birthdays this week (Monday to Sunday), soonest first; today's is
 * marked. On Home and Insights. */
export function BirthdayList({
  birthdays,
  today,
}: {
  birthdays: ReadonlyArray<{
    id: string
    name: string
    date: string
    turns: number
  }>
  today: string
}) {
  return (
    <>
      {birthdays.length === 0 ? (
        <p className="border border-dashed px-4 py-5 text-center text-sm text-muted-foreground rounded-xl">
          No birthdays this week.
        </p>
      ) : (
        <Group>
          {birthdays.map((b) => (
            <Link
              key={b.id}
              to="/disciples/$discipleId"
              params={{ discipleId: b.id }}
              className="flex min-h-12 min-w-0 items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
            >
              <Cake
                aria-hidden="true"
                className={cn(
                  'size-4 shrink-0',
                  b.date === today ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{b.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {longDay(b.date).replace(/, \d{4}$/, '')} · turns {b.turns}
                </span>
              </span>
              {b.date === today ? (
                <Pill tone="primary">Today</Pill>
              ) : b.date < today ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  Passed
                </span>
              ) : null}
              <RowChevron />
            </Link>
          ))}
        </Group>
      )}
    </>
  )
}
