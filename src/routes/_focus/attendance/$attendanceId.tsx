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
import { GenderBar, Pill } from '@/components/status-pill'
import { Segmented } from '@/components/ui/segmented'
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
import { MEMBER_TYPE } from '@/lib/labels'
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

type Filter = 'all' | 'men' | 'women' | 'unmarked'

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
      tone: 'covered' | 'caution' | 'short'
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
      tone: 'short',
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
        'inline-flex h-8 max-w-[45vw] shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium',
        s.tone === 'covered' && 'bg-covered/15 text-covered',
        s.tone === 'caution' && 'bg-caution/15 text-caution',
        s.tone === 'short' && 'bg-short/15 text-short',
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
  gender,
  disabled,
  onToggle,
  end,
}: {
  on: boolean
  name: string
  sub?: string
  gender: 'MALE' | 'FEMALE'
  disabled?: boolean
  onToggle: () => void
  end?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex min-h-14 min-w-0 items-center transition-colors',
        on && 'bg-covered/8',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-1.5 pr-2 pl-3.5 text-left disabled:cursor-not-allowed"
      >
        <GenderBar gender={gender} />
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

  const [tab, setTab] = useState<'members' | 'guests'>('members')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [addingGuest, setAddingGuest] = useState(false)
  const [editingGuest, setEditingGuest] = useState<GuestInput | null>(null)
  const [editingService, setEditingService] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const label = `${service.title}, ${shortDay(service.date)}`

  // Members, grouped: primary leaders first, then each network.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const keep = (m: Sheet['members'][number]) => {
      if (q && !m.name.toLowerCase().includes(q)) return false
      if (filter === 'men') return m.gender === 'MALE'
      if (filter === 'women') return m.gender === 'FEMALE'
      if (filter === 'unmarked') return !sync.present('member', m.id)
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
    const all = [
      { key: 'leaders', name: 'Primary leaders', people: leaders },
      ...[...byLeader.entries()]
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    ]
    return all
      .map((g) => ({
        ...g,
        here: g.people.filter((p) => sync.present('member', p.id)).length,
        total: g.people.length,
        shown: g.people.filter(keep),
      }))
      .filter((g) => g.shown.length > 0)
  }, [sheet, query, filter, sync])

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

  const membersPanel = (
    <section aria-label="Members" className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {(
          [
            ['all', 'All'],
            ['men', 'Men'],
            ['women', 'Women'],
            ['unmarked', 'Not marked'],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              'h-8 border px-3 text-[13px] font-medium',
              filter === value
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border hover:bg-muted',
            )}
          >
            {text}
          </button>
        ))}
      </div>
      {groups.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          {query ? 'Nobody by that name.' : 'Everyone here is marked.'}
        </p>
      )}
      {groups.map((g) => (
        <div key={g.key} className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-baseline justify-between gap-3 px-0.5">
            <h3 className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
              {g.name}
            </h3>
            <span className="shrink-0 text-xs text-muted-foreground numeric">
              {g.here} of {g.total}
            </span>
          </div>
          <div className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t">
            {g.shown.map((m) => (
              <Mark
                key={m.id}
                on={sync.present('member', m.id)}
                name={m.name}
                sub={MEMBER_TYPE[m.memberType]}
                gender={m.gender}
                disabled={locked}
                onToggle={() => sync.toggle('member', m.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )

  const guestsPanel = (
    <section aria-label="Guests" className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 px-0.5">
          <h3 className="text-[13px] font-medium text-muted-foreground">
            Here today · {guestsHere.length}
          </h3>
          {!locked && (
            <button
              type="button"
              onClick={() => setAddingGuest(true)}
              className="text-[13px] font-medium text-primary max-md:hidden"
            >
              Add a first-timer
            </button>
          )}
        </div>
        {guestsHere.length === 0 ? (
          <p className="border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No guests marked yet.
          </p>
        ) : (
          <div className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t">
            {guestsHere.map((g) => (
              <Mark
                key={g.id}
                on
                name={g.name}
                sub={g.sub}
                gender={g.gender}
                disabled={locked}
                onToggle={() => sync.toggle('guest', g.id)}
                end={
                  <div className="flex shrink-0 items-center gap-1 pr-2">
                    <Pill tone={g.visit === 1 ? 'caution' : 'covered'}>
                      {visitLabel(g.visit)}
                    </Pill>
                    {g.editable && !locked && (
                      <button
                        type="button"
                        aria-label={`Edit ${g.name}`}
                        onClick={() => setEditingGuest(g.editable!)}
                        className="grid size-10 place-items-center text-muted-foreground hover:text-foreground"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </button>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 px-0.5">
          <h3 className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
            Came before · tap who’s here
          </h3>
          <span className="shrink-0 text-xs text-muted-foreground">
            Last seen first
          </span>
        </div>
        {cameBefore.length + untickedToday.length === 0 ? (
          <p className="border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No returning guests to mark.
          </p>
        ) : (
          <div className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t">
            {untickedToday.map((g) => (
              <Mark
                key={g.id}
                on={false}
                name={g.name}
                sub="Unticked today"
                gender={g.gender}
                disabled={locked}
                onToggle={() => sync.toggle('guest', g.id)}
              />
            ))}
            {cameBefore.map((g) => (
              <Mark
                key={g.id}
                on={false}
                name={g.name}
                sub={`Since ${shortDay(g.firstDate)} · ${g.visits} ${g.visits === 1 ? 'visit' : 'visits'}`}
                gender={g.gender}
                disabled={locked}
                onToggle={() => sync.toggle('guest', g.id)}
                end={
                  g.visits >= 3 ? (
                    <Link
                      to="/disciples/new"
                      search={{ fromGuest: g.id }}
                      className="shrink-0 px-3 text-xs font-medium text-primary"
                    >
                      Make disciple
                    </Link>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex min-w-0 items-center gap-1 border-b bg-background/95 px-2 py-2 backdrop-blur md:px-6">
        <Link
          to="/attendance"
          aria-label="Back to attendance"
          className="grid size-11 shrink-0 place-items-center"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-[17px] font-semibold">
            {service.title}
          </h1>
          <span className="truncate text-xs text-muted-foreground">
            {longDay(service.date)} · {locked ? 'Closed' : 'Open'}
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

      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-4 px-4 pt-4 pb-32 md:px-8 md:pb-12">
        {locked && (
          <div className="flex items-start gap-2.5 border border-short/30 bg-short/10 p-3 text-sm">
            <Lock
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-short"
            />
            <span>
              This service is closed, so marks can’t change.
              {sync.waitingCount > 0 &&
                ` ${sync.waitingCount} mark${sync.waitingCount === 1 ? '' : 's'} from this device didn’t make it in.`}
              {sheet.isAdmin && ' You can reopen it from the menu.'}
            </span>
          </div>
        )}
        {sync.status === 'error' && sync.error && (
          <div
            role="alert"
            className="border border-short/30 bg-short/10 p-3 text-sm"
          >
            {sync.error} Your marks are kept on this device.
          </div>
        )}

        <div className="grid grid-cols-3 border bg-card md:grid-cols-5 [&>*+*]:border-l">
          {[
            ['Present', presentMembers.length + guestsHere.length, ''],
            ['Men', men, 'text-men'],
            ['Women', women, 'text-women'],
            ['First-timers', firstTimers, 'text-caution max-md:hidden'],
            [
              'Returning',
              guestsHere.length - firstTimers,
              'text-covered max-md:hidden',
            ],
          ].map(([name, value, tone]) => (
            <div
              key={name as string}
              className={cn(
                'flex min-w-0 flex-col gap-0.5 px-3 py-2.5 md:px-4',
                (tone as string).includes('max-md:hidden') && 'max-md:hidden',
              )}
            >
              <span className="truncate text-xs text-muted-foreground">
                {name}
              </span>
              <span
                className={cn(
                  'numeric truncate text-xl font-semibold md:text-2xl',
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
            label="Who"
            className="md:hidden"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'members', label: `Members · ${presentMembers.length}` },
              { value: 'guests', label: `Guests · ${guestsHere.length}` },
            ]}
          />
          <div className="relative min-w-0 flex-1 md:max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a name"
              aria-label="Find a name"
              className="h-11 w-full min-w-0 border border-input bg-card pr-3 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-10 md:text-sm"
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-start">
          <div className={cn('min-w-0', tab !== 'members' && 'max-md:hidden')}>
            {membersPanel}
          </div>
          <div className={cn('min-w-0', tab !== 'guests' && 'max-md:hidden')}>
            {guestsPanel}
          </div>
        </div>
      </main>

      {!locked && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <Button
            variant="secondary"
            size="xl"
            className="min-w-0 flex-1 px-3"
            onClick={() => setAddingGuest(true)}
          >
            <UserPlus aria-hidden="true" /> First-timer
          </Button>
          <Button
            size="xl"
            className="min-w-0 flex-1 px-3"
            onClick={() => void lock(true)}
          >
            <Lock aria-hidden="true" /> Close service
          </Button>
        </div>
      )}

      <GuestDialog
        open={addingGuest}
        onOpenChange={setAddingGuest}
        serviceLabel={label}
        inviters={sheet.inviters}
        known={known}
        onSave={(g) => {
          sync.addGuest(g)
          toast.success(`${g.name} added`)
        }}
        onMarkReturning={(id) => {
          if (!sync.present('guest', id)) sync.toggle('guest', id)
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
