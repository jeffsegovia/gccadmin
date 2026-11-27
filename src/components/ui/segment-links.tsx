import { Link } from '@tanstack/react-router'
import { cn } from 'cn'

/** Sister pages as one segmented track (Cell groups | Soul winning,
 * Services | Guests): links that look exactly like `Segmented`, for views
 * that are pages of their own. Segments switch views; choices in a form
 * are chips or selects (27 November 2026). */
export function SegmentLinks({
  label,
  items,
  className,
}: {
  label: string
  items: ReadonlyArray<{ to: string; label: string; on: boolean }>
  className?: string
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'flex h-10 gap-0.5 rounded-lg border border-input bg-card p-[3px]',
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          aria-current={item.on ? 'page' : undefined}
          className={cn(
            'flex h-full min-w-0 flex-1 items-center justify-center truncate rounded-md px-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
            item.on
              ? 'bg-secondary text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
