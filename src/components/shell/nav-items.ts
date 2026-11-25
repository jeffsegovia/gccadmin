import {
  BookOpen,
  ChartColumn,
  CalendarCheck,
  ClipboardList,
  FolderOpen,
  House,
  Shield,
  Sprout,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** Paths that count as this item (its own path always does). */
  also?: ReadonlyArray<string>
  adminOnly?: boolean
}

export const MAIN_NAV: ReadonlyArray<NavItem> = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/insights', label: 'Insights', icon: ChartColumn },
  { to: '/disciples', label: 'Disciples', icon: Users },
  { to: '/reports', label: 'Cell reports', icon: ClipboardList },
  { to: '/soul-winning', label: 'Soul winning', icon: Sprout },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
]

export const RESOURCE_NAV: ReadonlyArray<NavItem> = [
  { to: '/lessons', label: 'Cell group lessons', icon: BookOpen },
  { to: '/growth', label: 'Growth process', icon: TrendingUp },
  { to: '/resources', label: 'GCC resources', icon: FolderOpen },
]

export const ADMIN_NAV: ReadonlyArray<NavItem> = [
  { to: '/leaders', label: 'Leaders', icon: Shield, adminOnly: true },
  { to: '/users', label: 'Users', icon: UserCog, adminOnly: true },
]

/** The phone's bottom bar: Reports holds cell groups and soul winning. */
export const PHONE_TABS: ReadonlyArray<NavItem> = [
  { to: '/home', label: 'Home', icon: House },
  { to: '/disciples', label: 'Disciples', icon: Users },
  {
    to: '/reports',
    label: 'Reports',
    icon: ClipboardList,
    also: ['/soul-winning'],
  },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
]

export function isActive(item: NavItem, pathname: string): boolean {
  return [item.to, ...(item.also ?? [])].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}
