import { useCallback, useMemo, useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleX,
  CloudOff,
  Ellipsis,
  LoaderCircle,
  Lock,
  LockOpen,
  Pencil,
  Search,
  Trash2,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { CheckMark } from '@/components/check-mark'
import { GuestDialog } from '@/components/attendance/guest-dialog'
import { ServiceDialog } from '@/components/attendance/service-dialog'
import { useAttendanceSync } from '@/components/attendance/use-attendance-sync'
import type { SyncStatus } from '@/components/attendance/use-attendance-sync'
import { Pill } from '@/components/status-pill'
import { Segmented } from '@/components/ui/segmented'
import {
  Group,
  Row,
  RowChevron,
  RowText,
  Tile,
  rowClass,
} from '@/components/ui/list'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { load } from '@/lib/attendance/outbox'
import type { GuestInput } from '@/lib/attendance/schema'
import { dateToDay, longDay, shortDay } from '@/lib/dates'
import { isNetworkError, messageOf } from '@/lib/errors'
import { MEMBER_TYPE, plural } from '@/lib/labels'
import {
  deleteService,
  getSheet,
  setServiceLocked,
  updateGuest,
} from '@/server/attendance/attendance.functions'
import type { Sheet } from '@/server/attendance/attendance.functions'

export const Route = createFileRoute('/_focus/attendance/$attendanceId')({
  // Offline, the copy kept on this device opens instead (marks queue).
  loader: async ({ params }) => {
    try {
      return {
        sheet: await getSheet({ data: { id: params.attendanceId } }),
        offline: false,
      }
    } catch (error) {
      if (typeof window !== 'undefined' && isNetworkError(error)) {
        const kept = load<Sheet>(params.attendanceId).snapshot
        if (kept) return { sheet: kept, offline: true }
      }
      throw error
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.sheet.service.title ?? 'Attendance'} · GCC Admin`,
      },
    ],
  }),
  component: SheetPage,
})

function StatusBadge({
  status,
  waiting,
  onRetry,
}: {
  status: SyncStatus
  waiting: number
  onRetry: () => void
}) {
  const map: Record<
    SyncStatus,
    {
      label: string
      tone: 'covered' | 'caution' | 'short' | 'neutral'
      icon: React.ReactNode
    }
  > = {
    saved: {
      label: 'Saved',
      tone: 'covered',
      icon: <Check className="size-3.5" />,
    },
    saving: {
      label: 'Saving',
      tone: 'caution',
      icon: <LoaderCircle className="size-3.5 animate-spin" />,
    },
    waiting: {
      label: `${waiting} to sync`,
      tone: 'caution',
      icon: <LoaderCircle className="size-3.5" />,
    },
    offline: {
      label: `Offline · ${waiting} kept`,
      tone: 'caution',
      icon: <CloudOff className="size-3.5" />,
    },
    error: {
      label: 'Not saved · retry',
      tone: 'short',
      icon: <TriangleAlert className="size-3.5" />,
    },
    locked: {
      label: 'Closed',
      tone: 'neutral',
      icon: <Lock className="size-3.5" />,
    },
  }
  const s = map[status]
  return (
    <button
      type="button"
      onClick={onRetry}
      aria-live="polite"
      className={cn(
        // A small word in the top bar, not a block (the redesign).
        'inline-flex h-8 max-w-[45vw] shrink-0 items-center gap-1 px-1.5 text-xs font-medium',
        s.tone === 'covered' && 'text-covered',
        s.tone === 'caution' && 'text-caution',
        s.tone === 'short' && 'text-short',
        s.tone === 'neutral' && 'text-muted-foreground',
      )}
    >
      <span aria-hidden="true">{s.icon}</span>
      <span className="truncate">{s.label}</span>
    </button>
  )
}

function Mark({
  on,
  name,
  sub,
  disabled,
  onToggle,
  badge,
  end,
}: {
  on: boolean
  name: string
  sub?: string
  disabled?: boolean
  onToggle: () => void
  badge?: React.ReactNode
  end?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex min-h-13 min-w-0 items-stretch transition-colors',
        on && 'bg-covered/8',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className="flex min-h-13 min-w-0 flex-1 items-center gap-3 py-1.5 pr-3.5 pl-3.5 text-left disabled:cursor-not-allowed"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              'truncate text-[15px] font-medium',
              !on && 'text-foreground/85',
            )}
          >
            {name}
          </span>
          {sub && (
            <span className="truncate text-xs text-muted-foreground">
              {sub}
            </span>
          )}
        </span>
        {badge}
        <CheckMark on={on} />
      </button>
      {end}
    </div>
  )
}

function SheetPage() {
  const { sheet, offline } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const service = sheet.service
  const refresh = useCallback(() => void router.invalidate(), [router])
  const sync = useAttendanceSync(sheet, refresh)
  const locked = service.isLocked || sync.status === 'locked'

  // v2's views of the sheet.
  const [tab, setTab] = useState<'leaders' | 'male' | 'female' | 'guests'>(
    'leaders',
  )
  const [unmarkedOnly, setUnmarkedOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [addingGuest, setAddingGuest] = useState(false)
  const [editingGuest, setEditingGuest] = useState<GuestInput | null>(null)
  const [editingService, setEditingService] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [byType, setByType] = useState(false)
  const [acting, setActing] = useState<{
    id: string
    name: string
    sub: string
    on: boolean
    visit?: number
    canMakeDisciple: boolean
    editable?: GuestInput
  } | null>(null)

  const label = `${service.title}, ${shortDay(service.date)}`

  // Members, grouped: primary leaders first, then each network.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const keep = (m: Sheet['members'][number]) => {
      if (q && !m.name.toLowerCase().includes(q)) return false
      if (!q && tab === 'male' && m.gender !== 'MALE') return false
      if (!q && tab === 'female' && m.gender !== 'FEMALE') return false
      if (unmarkedOnly) return !sync.present('member', m.id)
      return true
    }
    const leaders = sheet.members.filter((m) => m.isPrimary)
    const byLeader = new Map<
      string,
      { name: string; people: typeof sheet.members }
    >()
    for (const m of sheet.members) {
      if (m.isPrimary) continue
      const key = m.leaderId ?? 'none'
      const entry = byLeader.get(key) ?? {
        name: m.leaderName ? `${m.leaderName}’s network` : 'No network',
        people: [],
      }
      entry.people.push(m)
      byLeader.set(key, entry)
    }
    // Leaders: the primary leaders, men then women (v2's Leaders view).
    // Male and Female: everyone else by network, with each subtotal.
    // A search looks at everyone, whatever the tab, so a name is found
    // without knowing whether they're a leader, a man or a woman.
    const all = q
      ? [
          { key: 'leaders', name: 'Leaders', people: leaders },
          ...[...byLeader.entries()]
            .map(([key, v]) => ({ key, ...v }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        ]
      : tab === 'leaders'
        ? [
            {
              key: 'men',
              name: 'Male leaders',
              people: leaders.filter((m) => m.gender === 'MALE'),
            },
            {
              key: 'women',
              name: 'Female leaders',
              people: leaders.filter((m) => m.gender === 'FEMALE'),
            },
          ]
        : [...byLeader.entries()]
            .map(([key, v]) => ({
              key,
              ...v,
              people: v.people.filter((m) =>
                tab === 'male' ? m.gender === 'MALE' : m.gender === 'FEMALE',
              ),
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
    return all
      .map((g) => ({
        ...g,
        here: g.people.filter((p) => sync.present('member', p.id)).length,
        total: g.people.length,
        shown: g.people.filter(keep),
      }))
      .filter((g) => g.shown.length > 0)
  }, [sheet, query, tab, unmarkedOnly, sync])

  const presentMembers = sheet.members.filter((m) =>
    sync.present('member', m.id),
  )
  const men = presentMembers.filter((m) => m.gender === 'MALE').length
  const women = presentMembers.length - men

  // Guests here today: the server's, plus any added or ticked here.
  const guestsHere = useMemo(() => {
    const list: Array<{
      id: string
      name: string
      gender: 'MALE' | 'FEMALE'
      sub: string
      visit: number
      editable?: GuestInput
    }> = []
    const seen = new Set<string>()
    for (const g of sheet.guestsHere) {
      seen.add(g.id)
      if (!sync.present('guest', g.id)) continue
      list.push({
        id: g.id,
        name: g.name,
        gender: g.gender,
        sub: g.invitedByName ? `Invited by ${g.invitedByName}` : 'Walk-in',
        visit: g.visit,
        editable: {
          id: g.id,
          name: g.name,
          gender: g.gender,
          memberType: g.memberType,
          invitedById: g.invitedById,
          contactNo: g.contactNo,
          email: g.email,
          address: g.address,
        },
      })
    }
    for (const g of sync.newGuests) {
      if (seen.has(g.id)) continue
      seen.add(g.id)
      if (!sync.present('guest', g.id)) continue
      const inviter = sheet.inviters.find((i) => i.id === g.invitedById)
      list.push({
        id: g.id,
        name: g.name,
        gender: g.gender,
        sub: inviter ? `Invited by ${inviter.name}` : 'Walk-in',
        visit: 1,
      })
    }
    for (const g of sheet.guestsBefore) {
      if (seen.has(g.id) || !sync.present('guest', g.id)) continue
      list.push({
        id: g.id,
        name: g.name,
        gender: g.gender,
        sub: `First came ${shortDay(g.firstDate)}`,
        visit: g.visits + 1,
      })
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [sheet, sync])

  const firstTimers = guestsHere.filter((g) => g.visit === 1).length
  const cameBefore = sheet.guestsBefore.filter(
    (g) =>
      !sync.present('guest', g.id) &&
      (!query.trim() ||
        g.name.toLowerCase().includes(query.trim().toLowerCase())),
  )
  // A guest unticked today who was on the server's list moves back here.
  const untickedToday = sheet.guestsHere.filter(
    (g) => !sync.present('guest', g.id),
  )

  const known = sheet.guestsBefore.map((g) => ({
    id: g.id,
    name: g.name,
    hint: `first came ${shortDay(g.firstDate)}`,
  }))

  async function lock(next: boolean) {
    try {
      await setServiceLocked({ data: { id: service.id, isLocked: next } })
      toast.success(next ? 'Service closed' : 'Service reopened')
      await router.invalidate()
    } catch (error) {
      toast.error(messageOf(error))
    }
  }

  const visitLabel = (n: number) =>
    n === 1
      ? '1st visit'
      : n === 2
        ? '2nd visit'
        : n === 3
          ? '3rd visit'
          : `${n}th visit`

  const q = query.trim().toLowerCase()
  const searching = q.length > 0
  const newToday = guestsHere.filter((g) => g.visit === 1)
  const backToday = guestsHere.filter((g) => g.visit > 1)
  const marked = groups.reduce((n, g) => n + g.here, 0)
  const listed = groups.reduce((n, g) => n + g.total, 0)

  // One row per guest: the row marks them; ⋯ opens what else there is
  // (as in Osamu: a row opens a sheet, never buttons on the row).
  const guestRow = (g: {
    id: string
    name: string
    sub: string
    on: boolean
    visit?: number
    visits?: number
    editable?: GuestInput
  }) => {
    const canMakeDisciple = (g.visits ?? g.visit ?? 0) >= 3
    const hasMore = !locked && (!!g.editable || canMakeDisciple || g.on)
    return (
      <Mark
        key={g.id}
        on={g.on}
        name={g.name}
        sub={g.sub}
        disabled={locked}
        onToggle={() => sync.toggle('guest', g.id)}
        badge={
          g.visit ? (
            <Pill tone={g.visit === 1 ? 'caution' : 'neutral'}>
              {visitLabel(g.visit)}
            </Pill>
          ) : undefined
        }
        end={
          hasMore ? (
            <button
              type="button"
              aria-label={`${g.name}: more`}
              onClick={() =>
                setActing({
                  id: g.id,
                  name: g.name,
                  sub: g.sub,
                  on: g.on,
                  visit: g.visit,
                  canMakeDisciple,
                  editable: g.editable,
                })
              }
              className="grid w-11 shrink-0 self-stretch place-items-center border-l text-muted-foreground hover:text-foreground"
            >
              <Ellipsis aria-hidden="true" className="size-[18px]" />
            </button>
          ) : undefined
        }
      />
    )
  }

  const membersPanel = (
    <section aria-label="Members" className="flex min-w-0 flex-col gap-3">
      {!searching && (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <button
            type="button"
            aria-pressed={unmarkedOnly}
            onClick={() => setUnmarkedOnly(!unmarkedOnly)}
            className={cn(
              'h-8 w-fit rounded-lg border px-3 text-[13px] font-medium',
              unmarkedOnly
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border hover:bg-muted',
            )}
          >
            Not marked only
          </button>
          <span className="numeric text-xs text-muted-foreground">
            {marked} of {listed} marked
          </span>
        </div>
      )}
      {groups.length === 0 && !searching && (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          Everyone here is marked.
        </p>
      )}
      {groups.map((g) => (
        <div key={g.key} className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-baseline justify-between gap-3 px-1">
            <h3 className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
              {g.name}
            </h3>
            <span className="numeric shrink-0 text-xs text-muted-foreground">
              {g.here} of {g.total}
            </span>
          </div>
          <div className="flex flex-col overflow-hidden rounded-xl border bg-card dark:border-transparent [&>*+*]:border-t">
            {g.shown.map((m) => (
              <Mark
                key={m.id}
                on={sync.present('member', m.id)}
                name={m.name}
                sub={MEMBER_TYPE[m.memberType]}
                disabled={locked}
                onToggle={() => sync.toggle('member', m.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )

  const guestList = (
    title: string,
    rows: Array<Parameters<typeof guestRow>[0]>,
    empty: string,
    note?: string,
  ) => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h3 className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
          {title}
        </h3>
        {note && (
          <span className="shrink-0 text-xs text-muted-foreground">{note}</span>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-xl border bg-card dark:border-transparent [&>*+*]:border-t">
          {rows.map(guestRow)}
        </div>
      )}
    </div>
  )

  const hereRow = (g: (typeof guestsHere)[number]) => ({
    id: g.id,
    name: g.name,
    sub: g.sub,
    on: true,
    visit: g.visit,
    editable: g.editable,
  })
  const notYetRows = [
    ...untickedToday.map((g) => ({
      id: g.id,
      name: g.name,
      sub: 'Unticked today',
      on: false,
    })),
    ...cameBefore.map((g) => ({
      id: g.id,
      name: g.name,
      sub: `Since ${shortDay(g.firstDate)} · ${plural(g.visits, 'visit')}`,
      on: false,
      visits: g.visits,
    })),
  ]

  // v2's First-timers and Returnees, as one Guests view: who's new today,
  // who's back, and earlier guests to tick.
  const guestsPanel = (
    <section aria-label="Guests" className="flex min-w-0 flex-col gap-4">
      {guestList(
        `First-timers today · ${newToday.length}`,
        newToday.map(hereRow),
        'No first-timers marked yet.',
      )}
      {guestList(
        `Back today · ${backToday.length}`,
        backToday.map(hereRow),
        'No returning guests marked yet.',
      )}
      {guestList(
        'Came before · tap who’s here',
        notYetRows,
        'No returning guests to mark.',
        'Last seen first',
      )}
    </section>
  )

  // A search looks through everyone: members by group, then guests, and
  // offers to add the name when nobody matches.
  const guestMatches = [
    ...guestsHere.filter((g) => g.name.toLowerCase().includes(q)).map(hereRow),
    ...notYetRows.filter((g) => g.name.toLowerCase().includes(q)),
  ]
  const searchPanel = (
    <section
      aria-label="Search results"
      className="flex min-w-0 flex-col gap-4"
    >
      {membersPanel}
      {guestMatches.length > 0 && guestList('Guests', guestMatches, '')}
      {!locked && (
        <button
          type="button"
          onClick={() => setAddingGuest(true)}
          className="flex min-h-13 items-center gap-3 rounded-xl border border-dashed px-3.5 py-2 text-left"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <UserPlus aria-hidden="true" className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              {groups.length + guestMatches.length === 0
                ? `Nobody by that name. Add “${query.trim()}” as a first-timer`
                : `Not here? Add “${query.trim()}” as a first-timer`}
            </span>
            <span className="text-xs text-muted-foreground">
              The name carries over
            </span>
          </span>
        </button>
      )}
    </section>
  )

  const searchField = (className?: string) => (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find anyone"
        aria-label="Find a name"
        className="h-11 w-full min-w-0 rounded-lg border border-input bg-card pr-3 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-10 md:text-sm"
      />
    </div>
  )

  const memberTypes = (
    ['KIDS', 'YOUTH', 'YOUNGPRO', 'MEN', 'WOMEN'] as const
  ).map((t) => ({
    type: t,
    n:
      presentMembers.filter((m) => m.memberType === t).length +
      guestsHere.filter((g) => g.editable?.memberType === t).length,
  }))

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex min-w-0 items-center gap-1 border-b bg-background/90 px-2 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:px-6">
        <Link
          to="/attendance"
          aria-label="Back to attendance"
          className="grid size-11 shrink-0 place-items-center"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-base font-semibold">{service.title}</h1>
          <span className="truncate text-xs text-muted-foreground">
            {longDay(service.date)}
            {offline && ' · offline copy'}
          </span>
        </div>
        <StatusBadge
          status={locked ? 'locked' : sync.status}
          waiting={sync.waitingCount}
          onRetry={() => void sync.retry()}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="More actions"
                className="grid size-11 shrink-0 place-items-center"
              >
                <Ellipsis aria-hidden="true" className="size-5" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setEditingService(true)}>
              <Pencil /> Edit details
            </DropdownMenuItem>
            {service.isLocked ? (
              sheet.isAdmin && (
                <DropdownMenuItem onClick={() => void lock(false)}>
                  <LockOpen /> Reopen
                </DropdownMenuItem>
              )
            ) : (
              <DropdownMenuItem onClick={() => void lock(true)}>
                <Lock /> Close service
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Delete service
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-3 px-4 pt-3 pb-32 md:gap-4 md:px-8 md:pt-4 md:pb-12">
        {locked && (
          <div
            role="status"
            className="flex items-center gap-2.5 rounded-xl bg-card p-3 text-sm"
          >
            <Lock
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0 flex-1">
              Closed, so marks can’t change.
              {sync.waitingCount > 0 &&
                ` ${sync.waitingCount} mark${sync.waitingCount === 1 ? '' : 's'} from this device didn’t make it in.`}
            </span>
            {service.isLocked && sheet.isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void lock(false)}
              >
                Reopen
              </Button>
            )}
          </div>
        )}
        {sync.status === 'error' && sync.error && (
          <div
            role="alert"
            className="rounded-lg border border-short/30 bg-short/10 p-3 text-sm"
          >
            {sync.error} Your marks are kept on this device.
          </div>
        )}

        {/* Four small counts, so names start on the first screen. Present
            opens v2's By Member Type. */}
        <div className="grid grid-cols-4 overflow-hidden rounded-xl border bg-card md:grid-cols-5 [&>*+*]:border-l">
          <button
            type="button"
            onClick={() => setByType(true)}
            className="flex min-w-0 flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/40 md:px-4"
          >
            <span className="flex items-center gap-0.5 truncate text-[11px] text-muted-foreground md:text-xs">
              Present
              <ChevronRight aria-hidden="true" className="size-3 shrink-0" />
            </span>
            <span className="numeric text-lg font-semibold md:text-2xl">
              {presentMembers.length + guestsHere.length}
            </span>
          </button>
          {[
            ['Male', men, ''],
            ['Female', women, ''],
            ['First-timers', firstTimers, firstTimers ? 'text-caution' : ''],
            ['Returnees', guestsHere.length - firstTimers, 'max-md:hidden'],
          ].map(([name, value, tone]) => (
            <div
              key={name as string}
              className={cn(
                'flex min-w-0 flex-col gap-0.5 px-3 py-2 md:px-4',
                (tone as string).includes('max-md:hidden') && 'max-md:hidden',
              )}
            >
              <span className="truncate text-[11px] text-muted-foreground md:text-xs">
                {name}
              </span>
              <span
                className={cn(
                  'numeric text-lg font-semibold md:text-2xl',
                  (tone as string).replace('max-md:hidden', ''),
                )}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
          <Segmented
            label="View"
            value={tab}
            onChange={(next) => {
              setTab(next)
              setQuery('')
            }}
            className="md:w-96"
            options={[
              { value: 'leaders', label: 'Leaders' },
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'guests', label: 'Guests' },
            ]}
          />
          {/* Wide screens: search and add beside the views. Phones have
              them at the foot, under the thumb. */}
          <div className="flex min-w-0 flex-1 items-center gap-2 max-md:hidden">
            {searchField('max-w-sm')}
            {!locked && (
              <Button size="lg" onClick={() => setAddingGuest(true)}>
                <UserPlus aria-hidden="true" /> First-timer
              </Button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {searching
            ? searchPanel
            : tab === 'guests'
              ? guestsPanel
              : membersPanel}
        </div>

        {!locked && !searching && (
          <section
            aria-label="Close service"
            className="flex min-w-0 items-center gap-3 rounded-xl border border-dashed px-3.5 py-3"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">Done marking?</span>
              <span className="text-xs text-muted-foreground">
                Closing locks the sheet.
                {sheet.isAdmin
                  ? ' You can reopen it.'
                  : ' An admin can reopen it.'}
              </span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmClose(true)}
            >
              <Lock aria-hidden="true" /> Close service
            </Button>
          </section>
        )}
      </main>

      {/* Phones: search and Add a first-timer at the foot, above the
          keyboard when it opens. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-background/95 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        {searchField()}
        {searching ? (
          <Button
            variant="ghost"
            size="xl"
            className="px-2"
            onClick={() => setQuery('')}
          >
            Cancel
          </Button>
        ) : (
          !locked && (
            <Button
              size="xl"
              className="px-3.5"
              onClick={() => setAddingGuest(true)}
            >
              <UserPlus aria-hidden="true" /> First-timer
            </Button>
          )
        )}
      </div>

      <GuestDialog
        open={addingGuest}
        onOpenChange={setAddingGuest}
        serviceLabel={label}
        inviters={sheet.inviters}
        known={known}
        initialName={searching ? query.trim() : undefined}
        onSave={(g) => {
          sync.addGuest(g)
          setQuery('')
          toast.success(`${g.name} added`)
        }}
        onMarkReturning={(id) => {
          if (!sync.present('guest', id)) sync.toggle('guest', id)
          setQuery('')
        }}
      />
      <GuestDialog
        open={!!editingGuest}
        onOpenChange={(open) => !open && setEditingGuest(null)}
        guest={editingGuest ?? undefined}
        inviters={sheet.inviters}
        known={[]}
        onSave={async (g) => {
          try {
            await updateGuest({ data: g })
            toast.success('Guest saved')
            await router.invalidate()
          } catch (error) {
            toast.error(messageOf(error))
            throw error
          }
        }}
      />

      <ResponsiveDialog
        open={!!acting}
        onOpenChange={(open) => !open && setActing(null)}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{acting?.name}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {acting?.visit ? `${visitLabel(acting.visit)} · ` : ''}
              {acting?.sub}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {acting && (
            <Group>
              {acting.canMakeDisciple && (
                <Link
                  to="/disciples/new"
                  search={{ fromGuest: acting.id }}
                  className={rowClass}
                >
                  <Tile className="text-primary">
                    <UserPlus />
                  </Tile>
                  <RowText
                    title="Make disciple"
                    subtitle="Came 3 times or more"
                  />
                  <RowChevron />
                </Link>
              )}
              {acting.editable && (
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    setEditingGuest(acting.editable!)
                    setActing(null)
                  }}
                >
                  <Tile>
                    <Pencil />
                  </Tile>
                  <RowText
                    title="Edit details"
                    subtitle="Name, gender, inviter, contact"
                  />
                  <RowChevron />
                </button>
              )}
              <button
                type="button"
                className={rowClass}
                onClick={() => {
                  sync.toggle('guest', acting.id)
                  setActing(null)
                }}
              >
                <Tile>{acting.on ? <CircleX /> : <Check />}</Tile>
                <RowText
                  title={acting.on ? 'Not here today' : 'Here today'}
                  subtitle={
                    acting.on
                      ? 'Unmarks this service only'
                      : 'Marks them present'
                  }
                />
              </button>
            </Group>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={byType} onOpenChange={setByType}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>By member type</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Members here, and guests whose member type is known.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <Group>
            {memberTypes.map((m) => (
              <Row key={m.type}>
                <RowText title={MEMBER_TYPE[m.type]} />
                <span className="numeric text-sm font-medium">{m.n}</span>
              </Row>
            ))}
          </Group>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ServiceDialog
        open={editingService}
        onOpenChange={setEditingService}
        service={{
          id: service.id,
          title: service.title,
          type: service.type,
          date: dateToDay(service.date),
          tags: service.tags,
        }}
      />
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {service.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Marks can’t change once it’s closed.
              {sheet.isAdmin
                ? ' You can reopen it from the menu.'
                : ' An admin can reopen it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it open</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmClose(false)
                void lock(true)
              }}
            >
              Close service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {service.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its marks go too. Guests seen only at this service are removed;
              anyone seen at other services stays.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteService({ data: { id: service.id } })
                  toast.success('Service deleted')
                  await navigate({ to: '/attendance' })
                } catch (error) {
                  toast.error(messageOf(error))
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
