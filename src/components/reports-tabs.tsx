import { Link } from '@tanstack/react-router'
import { cn } from 'cn'

/** Phones: Reports holds cell groups and soul winning, one tab each. On
 * wide screens each has its own place in the menu. */
export function ReportsTabs({ on }: { on: 'cell' | 'soul' }) {
  const tab = (active: boolean) =>
    cn(
      'grid h-9 min-w-0 flex-1 place-items-center truncate px-2 text-[13px] font-medium',
      active
        ? 'bg-secondary text-foreground shadow-sm'
        : 'text-muted-foreground',
    )
  return (
    <nav
      aria-label="Reports"
      className="flex gap-0.5 bg-card p-[3px] md:hidden"
    >
      <Link
        to="/reports"
        className={tab(on === 'cell')}
        aria-current={on === 'cell' ? 'page' : undefined}
      >
        Cell groups
      </Link>
      <Link
        to="/soul-winning"
        className={tab(on === 'soul')}
        aria-current={on === 'soul' ? 'page' : undefined}
      >
        Soul winning
      </Link>
    </nav>
  )
}
