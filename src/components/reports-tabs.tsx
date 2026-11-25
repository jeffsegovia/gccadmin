import { Link } from '@tanstack/react-router'
import { cn } from 'cn'

/** Phones: Reports holds cell groups and soul winning, one tab each. On
 * wide screens each has its own place in the menu. */
export function ReportsTabs({ on }: { on: 'cell' | 'soul' }) {
  // Underline tabs, as everywhere else: no box.
  const tab = (active: boolean) =>
    cn(
      '-mb-px flex h-10 items-center border-b-2 text-sm font-medium whitespace-nowrap',
      active
        ? 'border-primary text-foreground'
        : 'border-transparent text-muted-foreground',
    )
  return (
    <nav aria-label="Reports" className="flex gap-5 border-b md:hidden">
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
