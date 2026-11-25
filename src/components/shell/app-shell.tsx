import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Ellipsis } from 'lucide-react'
import { cn } from 'cn'
import { appConfig } from '@/config/site'
import { Logo } from './logo'
import {
  ADMIN_NAV,
  MAIN_NAV,
  PHONE_TABS,
  RESOURCE_NAV,
  isActive,
} from './nav-items'
import type { NavItem } from './nav-items'
import { SearchButton } from './global-search'
import { QuickAddFab, QuickAddMenu } from './quick-add'
import { UserAvatar, UserMenu } from './user-menu'
import type { MenuUser } from './user-menu'

/* The signed-in frame (the redesign's navigation note): on wide screens a
   top bar (logo, search, account) and a left menu grouped Ministry,
   Resources and Admin, as in Osamu; on phones a small header and a bottom
   bar with Home, Disciples, Reports, Attendance and More, as in Worsheep.
   Each page's main add is a floating button on phones. */

const sideRow =
  'flex h-9 min-w-0 items-center gap-2.5 px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-[17px] [&_svg]:shrink-0'
const sideOn = 'bg-muted text-foreground [&_svg]:text-primary'

function SideLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = isActive(item, pathname)
  return (
    <Link
      to={item.to}
      className={cn(sideRow, on && sideOn)}
      aria-current={on ? 'page' : undefined}
    >
      <item.icon aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

function SideGroup({
  label,
  items,
  pathname,
}: {
  label?: string
  items: ReadonlyArray<NavItem>
  pathname: string
}) {
  if (!items.length) return null
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <span className="px-2.5 pt-4 pb-1.5 text-xs font-medium text-muted-foreground">
          {label}
        </span>
      )}
      {items.map((item) => (
        <SideLink key={item.to} item={item} pathname={pathname} />
      ))}
    </div>
  )
}

function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const { pathname } = useLocation()
  return (
    <aside
      aria-label="App menu"
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-58 shrink-0 flex-col overflow-y-auto border-r p-3 md:flex"
    >
      <QuickAddMenu />
      <nav aria-label="Main" className="flex flex-col">
        <SideGroup items={MAIN_NAV} pathname={pathname} />
        <SideGroup label="Resources" items={RESOURCE_NAV} pathname={pathname} />
        {isAdmin && (
          <SideGroup label="Admin" items={ADMIN_NAV} pathname={pathname} />
        )}
      </nav>
    </aside>
  )
}

function TopBar({ user }: { user: MenuUser }) {
  return (
    <header className="dark sticky top-0 z-40 hidden h-14 items-center gap-3 border-b border-white/12 bg-background px-5 text-foreground md:flex">
      <Link to="/home" className="flex min-w-0 items-center gap-2.5">
        <Logo />
        <span className="truncate text-[15px] font-semibold tracking-tight">
          {appConfig.title}
        </span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <SearchButton />
        <UserMenu
          user={user}
          trigger={
            <button
              type="button"
              aria-label="Your account"
              className="flex size-9 items-center justify-center rounded-full"
            >
              <UserAvatar user={user} />
            </button>
          }
        />
      </div>
    </header>
  )
}

function PhoneHeader({ user }: { user: MenuUser }) {
  return (
    <header className="dark sticky top-0 z-30 mb-2 flex items-center gap-2 border-b border-white/12 bg-background px-4 py-2 text-foreground md:hidden">
      <Link
        to="/home"
        aria-label="Home"
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <Logo className="size-6" />
        <span className="truncate font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {appConfig.church}
        </span>
      </Link>
      <SearchButton compact />
      <UserMenu
        user={user}
        trigger={
          <button
            type="button"
            aria-label="Your account"
            className="flex size-10 items-center justify-center rounded-full"
          >
            <UserAvatar user={user} />
          </button>
        }
      />
    </header>
  )
}

const tabClass =
  'relative flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-muted-foreground transition-colors [&_svg]:size-[22px] [&_svg]:shrink-0'
const tabOn =
  'text-primary before:absolute before:top-0 before:left-1/4 before:h-[3px] before:w-1/2 before:bg-primary'

function PhoneTabs() {
  const { pathname } = useLocation()
  const moreOn =
    !PHONE_TABS.some((t) => isActive(t, pathname)) && pathname !== '/'
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {PHONE_TABS.map((item) => {
        const on = isActive(item, pathname)
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(tabClass, on && tabOn)}
            aria-current={on ? 'page' : undefined}
          >
            <item.icon aria-hidden="true" />
            <span className="max-w-full truncate text-[11px] font-medium">
              {item.label}
            </span>
          </Link>
        )
      })}
      <Link
        to="/more"
        className={cn(tabClass, moreOn && tabOn)}
        aria-current={moreOn ? 'page' : undefined}
      >
        <Ellipsis aria-hidden="true" />
        <span className="text-[11px] font-medium">More</span>
      </Link>
    </nav>
  )
}

export function AppShell({
  user,
  isAdmin,
  children,
}: {
  user: MenuUser
  isAdmin: boolean
  children: ReactNode
}) {
  return (
    <div data-app-shell className="min-h-dvh">
      <TopBar user={user} />
      <PhoneHeader user={user} />
      <div className="md:flex">
        <Sidebar isAdmin={isAdmin} />
        <div className="min-w-0 flex-1 pb-[calc(3.5rem+1px+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
      </div>
      <QuickAddFab />
      <PhoneTabs />
    </div>
  )
}

/** A full-screen task on phones (taking attendance, a report form): no
 * bottom bar, its own top bar with a way back. */
export function FocusShell({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh">{children}</div>
}
