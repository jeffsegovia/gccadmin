import { useEffect, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  CalendarCheck,
  ClipboardList,
  HeartHandshake,
  Plus,
  Sprout,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Action = {
  /** The page this add belongs to, so that page's + goes straight to it. */
  module?: string
  label: string
  icon: LucideIcon
  to: string
  search?: Record<string, string>
}

/** Everything a leader adds from anywhere, most used first. */
export const QUICK_ADD: ReadonlyArray<Action> = [
  {
    module: '/reports',
    label: 'Cell report',
    icon: ClipboardList,
    to: '/reports/new',
  },
  {
    module: '/disciples',
    label: 'Disciple',
    icon: UserPlus,
    to: '/disciples/new',
  },
  {
    module: '/soul-winning',
    label: 'Soul winning',
    icon: Sprout,
    to: '/soul-winning/new',
  },
  {
    module: '/soul-winning',
    label: 'Consolidation',
    icon: HeartHandshake,
    to: '/soul-winning/new',
    search: { type: 'CONSOLIDATION' },
  },
  {
    module: '/attendance',
    label: 'Service or event',
    icon: CalendarCheck,
    to: '/attendance',
    search: { new: '1' },
  },
]

/** Phones: one + over the bottom bar, as in Worsheep. A tap opens the
 * choices above it over a see-through veil and the + turns into an ×. */
export function QuickAddFab() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  // Forms are where you add; the + would only cover their buttons.
  if (/\/new$/.test(pathname)) return null
  // On a module's own pages its one add is one tap; the menu is for the
  // rest (and for Soul winning, which has two).
  const here = QUICK_ADD.filter(
    (a) =>
      a.module &&
      (pathname === a.module || pathname.startsWith(`${a.module}/`)),
  )
  if (here.length === 1) {
    const a = here[0]
    return (
      <Link
        to={a.to}
        search={a.search}
        aria-label={`New ${a.label.toLowerCase()}`}
        title={`New ${a.label.toLowerCase()}`}
        className="fixed right-4 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom)+1rem)] z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_oklch(0_0_0/0.35)] transition-transform active:scale-95 md:hidden"
      >
        <Plus aria-hidden="true" strokeWidth={2.25} className="size-6" />
      </Link>
    )
  }
  return (
    <div className="md:hidden">
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-background/60 backdrop-blur-[2px] transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <nav
        id="quick-add"
        aria-label="Add"
        inert={!open}
        className={cn(
          'fixed right-4 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom)+1rem+3.5rem+0.75rem)] z-40 flex flex-col items-end gap-2 transition-[opacity,translate] duration-200 ease-out',
          open
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        {QUICK_ADD.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            search={a.search}
            onClick={() => setOpen(false)}
            className={buttonVariants({
              variant: 'secondary',
              size: 'xl',
              className:
                'gap-2.5 px-4 shadow-[0_8px_24px_oklch(0_0_0/0.35)] [&_svg]:size-5',
            })}
          >
            <a.icon aria-hidden="true" className="text-primary" /> {a.label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        aria-label={open ? 'Close' : 'Add something'}
        aria-expanded={open}
        aria-controls="quick-add"
        onClick={() => setOpen(!open)}
        className="fixed right-4 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom)+1rem)] z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_oklch(0_0_0/0.35)] transition-transform active:scale-95"
      >
        <Plus
          aria-hidden="true"
          strokeWidth={2.25}
          className={cn(
            'size-6 transition-transform duration-200',
            open && 'rotate-45',
          )}
        />
      </button>
    </div>
  )
}

/** Wide screens: the sidebar's New button opens the same choices. */
export function QuickAddMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={buttonVariants({
              size: 'lg',
              className: 'mb-3 w-full justify-start',
            })}
          >
            <Plus aria-hidden="true" /> New
          </button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        {QUICK_ADD.map((a) => (
          <DropdownMenuItem
            key={a.label}
            render={<Link to={a.to} search={a.search} />}
          >
            <a.icon /> {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
