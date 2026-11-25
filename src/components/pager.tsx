import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

/** "26–50 of 312" with previous and next (v2 paged its tables). The page
 * lives in the URL's `page`, so Back returns to it. */
export function Pager({
  page,
  total,
  pageSize,
}: {
  page: number
  total: number
  pageSize: number
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const off = (dim: boolean) => (dim ? 'pointer-events-none opacity-40' : '')
  return (
    <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
      <span>
        {from}–{to} of {total.toLocaleString('en-US')}
      </span>
      <div className="flex gap-1.5">
        <Link
          to="."
          search={(prev: Record<string, unknown>) => ({
            ...prev,
            page: page - 1 > 1 ? page - 1 : undefined,
          })}
          disabled={page <= 1}
          aria-label="Previous page"
          className={buttonVariants({
            variant: 'secondary',
            size: 'icon-lg',
            className: off(page <= 1),
          })}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
        <Link
          to="."
          search={(prev: Record<string, unknown>) => ({
            ...prev,
            page: page + 1,
          })}
          disabled={page >= pages}
          aria-label="Next page"
          className={buttonVariants({
            variant: 'secondary',
            size: 'icon-lg',
            className: off(page >= pages),
          })}
        >
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
