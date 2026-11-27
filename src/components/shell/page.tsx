import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from 'cn'

/** A signed-in page's body: a readable width, the title with an optional
 * line under it, and the page's actions beside it (under it on phones). */
export function Page({
  title,
  description,
  action,
  back,
  children,
  className,
  wide,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  back?: { to: string; label: string; params?: Record<string, string> }
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full min-w-0 flex-col gap-5 px-4 pt-2 pb-28 sm:px-6 md:px-10 md:pt-8 md:pb-12',
        wide ? 'max-w-7xl' : 'max-w-5xl',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-3">
        {back && (
          <Link
            to={back.to}
            params={back.params}
            className="-ml-1 inline-flex w-fit items-center gap-0.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            <span className="truncate">{back.label}</span>
          </Link>
        )}
        {/* The page's action sits beside its title, phones too (as in
            Osamu): one main action, the rest in a ⋯ menu. */}
        <div className="flex min-w-0 items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] leading-7 font-semibold tracking-tight md:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action && (
            <div className="flex shrink-0 items-center gap-2">{action}</div>
          )}
        </div>
      </div>
      {children}
    </main>
  )
}

/** A titled block within a page. */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex min-w-0 items-baseline justify-between gap-3 px-0.5">
        <h2 className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Nothing to show yet: a plain icon, a line and an action. */
export function Empty({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <Icon aria-hidden className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}
