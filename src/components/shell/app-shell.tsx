import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChartColumn, Plus } from 'lucide-react'
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
import { QuickAddMenu, QuickAddSheet } from './quick-add'
import { UserAvatar, UserMenu } from './user-menu'
import type { MenuUser } from './user-menu'

/* The signed-in frame (the redesign signed off 27 November 2026): on wide
   screens a top bar (logo, search, account) and a left menu grouped
   Ministry, Resources and Admin; on phones a small header and a bottom bar
   with Home, Disciples, + Add, Attendance and Reports, as in Osamu. More
   opens from the avatar, so nothing floats over a list's rows. */

const sideRow =
  'flex h-9 min-w-0 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-[17px] [&_svg]:shrink-0'
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

/** Insights is one tap from every page: an icon in the top bar. */
function InsightsLink({ className }: { className?: string }) {
  const { pathname } = useLocation()
  const on = pathname === '/insights'
  return (
    <Link
      to="/insights"
      aria-label="Insights"
      title="Insights"
      aria-current={on ? 'page' : undefined}
      className={cn(
        'grid place-items-center text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-5',
        on && 'text-primary hover:text-primary',
        className,
      )}
    >
      <ChartColumn aria-hidden="true" />
    </Link>
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
        <InsightsLink className="size-9" />
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
  const { pathname } = useLocation()
  const moreOn = pathname === '/more'
  return (
    <header className="dark sticky top-0 z-30 mb-2 flex h-13 items-center gap-1 border-b border-white/12 bg-background/90 pr-2 pl-4 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/75 md:hidden">
      <Link
        to="/home"
        aria-label="Home"
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <Logo className="size-6" />
        <span className="truncate text-[15px] font-semibold tracking-tight">
          {appConfig.title}
        </span>
      </Link>
      <SearchButton compact />
      <InsightsLink className="size-10" />
      {/* More (profile, resources, admin, appearance, sign out) is the
          avatar's page on phones, as Osamu's Settings is. */}
      <Link
        to="/more"
        aria-label={`More, signed in as ${user.name}`}
        aria-current={moreOn ? 'page' : undefined}
        className="flex size-10 items-center justify-center rounded-full"
      >
        <UserAvatar
          user={user}
          className={cn(
            moreOn &&
              'ring-2 ring-primary ring-offset-2 ring-offset-background',
          )}
        />
      </Link>
    </header>
  )
}

const tabClass =
  'relative flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-muted-foreground transition-colors [&_svg]:size-[22px] [&_svg]:shrink-0'
// The tab you're on is its color, not a bar above it (as in Osamu).
const tabOn = 'text-foreground [&_svg]:text-primary'

function Tab({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = isActive(item, pathname)
  return (
    <Link
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
}

function PhoneTabs({ onAdd }: { onAdd: () => void }) {
  const { pathname } = useLocation()
  const [first, second, ...rest] = PHONE_TABS
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden"
    >
      <Tab item={first} pathname={pathname} />
      <Tab item={second} pathname={pathname} />
      <div className="flex items-center justify-center">
        <button
          type="button"
          aria-label="Add"
          onClick={onAdd}
          className="relative flex size-10 items-center justify-center rounded-[10px] bg-primary text-primary-foreground transition-transform after:absolute after:-inset-1 active:scale-95"
        >
          <Plus aria-hidden="true" className="size-5" strokeWidth={2.25} />
        </button>
      </div>
      {rest.map((item) => (
        <Tab key={item.to} item={item} pathname={pathname} />
      ))}
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
  const [adding, setAdding] = useState(false)
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
      <PhoneTabs onAdd={() => setAdding(true)} />
      <QuickAddSheet open={adding} onOpenChange={setAdding} />
    </div>
  )
}

/** A full-screen task on phones (taking attendance, a report form): no
 * bottom bar, its own top bar with a way back. */
export function FocusShell({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh">{children}</div>
}
