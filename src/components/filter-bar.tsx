import type { ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ActiveFilter = { key: string; label: string; clear: () => void }

/** One row for a list's controls: what it searches or its range, then a
 * single Filters button with how many are on. Below it, each filter that's
 * on as a small chip that removes it. Everything else lives in the
 * Filters sheet, so the page isn't a wall of boxes. */
export function FilterBar({
  children,
  active,
  onOpen,
  onClearAll,
}: {
  /** The search field or the date range. */
  children?: ReactNode
  active: ReadonlyArray<ActiveFilter>
  onOpen: () => void
  onClearAll: () => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        <Button variant="secondary" size="lg" onClick={onOpen}>
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {active.length > 0 && (
            <span className="numeric grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground">
              {active.length}
            </span>
          )}
        </Button>
      </div>
      {active.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {active.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.clear}
              aria-label={`Remove filter: ${f.label}`}
              className="inline-flex h-9 max-w-full min-w-0 items-center gap-1 rounded-full bg-secondary pr-1.5 pl-2.5 text-xs font-medium hover:bg-muted"
            >
              <span className="truncate">{f.label}</span>
              <X aria-hidden="true" className="size-3.5 shrink-0" />
            </button>
          ))}
          {active.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-1 text-xs font-medium text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
