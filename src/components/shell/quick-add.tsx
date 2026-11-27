import { Link } from '@tanstack/react-router'
import {
  CalendarCheck,
  ClipboardList,
  HeartHandshake,
  Plus,
  Sprout,
  UserPlus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { Group, RowChevron, Tile, rowClass } from '@/components/ui/list'

type Action = {
  label: string
  hint: string
  icon: LucideIcon
  to: string
  search?: Record<string, string>
}

/** Everything a leader adds from anywhere, most used first. */
export const QUICK_ADD: ReadonlyArray<Action> = [
  {
    label: 'Cell report',
    hint: 'Who came, and the lesson',
    icon: ClipboardList,
    to: '/reports/new',
  },
  {
    label: 'Disciple',
    hint: 'Someone new in your network',
    icon: UserPlus,
    to: '/disciples/new',
  },
  {
    label: 'Soul winning',
    hint: 'A session and who believed',
    icon: Sprout,
    to: '/soul-winning/new',
  },
  {
    label: 'Consolidation',
    hint: 'A follow-up with a new believer',
    icon: HeartHandshake,
    to: '/soul-winning/new',
    search: { type: 'CONSOLIDATION' },
  },
  {
    label: 'Service or event',
    hint: 'A sheet to take attendance on',
    icon: CalendarCheck,
    to: '/attendance',
    search: { new: '1' },
  },
]

/** Phones: the bottom bar's + opens this sheet (as Osamu's + Add does),
 * so nothing floats over the rows of a list. */
export function QuickAddSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <Group>
          {QUICK_ADD.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              search={a.search}
              onClick={() => onOpenChange(false)}
              className={rowClass}
            >
              <Tile className="text-primary">
                <a.icon />
              </Tile>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {a.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {a.hint}
                </span>
              </span>
              <RowChevron />
            </Link>
          ))}
        </Group>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

/** Wide screens: the sidebar's Add button opens the same choices. */
export function QuickAddMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={buttonVariants({
              size: 'lg',
              className: 'mb-3 w-full',
            })}
          >
            <Plus aria-hidden="true" /> Add
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
