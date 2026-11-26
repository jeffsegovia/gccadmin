import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CalendarCheck,
  ChevronRight,
  CloudOff,
  Lock,
  Plus,
  UsersRound,
} from 'lucide-react'
import { z } from 'zod'
import { Empty, Page, Section } from '@/components/shell/page'
import { ListSearch } from '@/components/list-search'
import { ServiceDialog } from '@/components/attendance/service-dialog'
import { Pill } from '@/components/status-pill'
import { Button, buttonVariants } from '@/components/ui/button'
import { Group } from '@/components/ui/list'
import { getServices } from '@/server/attendance/attendance.functions'
import type { ServiceRow } from '@/server/attendance/attendance.queries'
import { servicesWithPending } from '@/lib/attendance/outbox'
import { ATTENDANCE_TYPE, plural } from '@/lib/labels'
import { dateToDay, manilaDay, monthLabel, shortDay } from '@/lib/dates'

export const Route = createFileRoute('/_app/attendance/')({
  validateSearch: z.object({
    q: z.string().optional(),
    new: z.string().optional(),
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => getServices({ data: { q: deps.q } }),
  head: () => ({ meta: [{ title: 'Attendance · GCC Admin' }] }),
  component: AttendancePage,
})

function summary(s: ServiceRow) {
  const parts = [`${s.members + s.guests} present`]
  if (s.firstTimers) parts.push(plural(s.firstTimers, 'first-timer'))
  return parts.join(' · ')
}

function DateTile({ date, accent }: { date: Date; accent?: boolean }) {
  const label = shortDay(date)
  const [month, day] = label.split(' ')
  return (
    <span
      aria-hidden="true"
      className="grid h-12 w-11 shrink-0 place-items-center content-center bg-muted"
    >
      <span
        className={`font-mono text-[10px] font-semibold tracking-widest uppercase ${accent ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {month}
      </span>
      <span className="text-lg leading-5 font-bold">{day}</span>
    </span>
  )
}

function ServiceLink({
  s,
  waiting,
  open,
}: {
  s: ServiceRow
  waiting: boolean
  open?: boolean
}) {
  return (
    <Link
      to="/attendance/$attendanceId"
      params={{ attendanceId: s.id }}
      className="flex min-h-15 min-w-0 items-center gap-3 px-3.5 py-2 transition-colors hover:bg-muted/50"
    >
      <DateTile date={s.date} accent={open} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium">{s.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {s.type === 'EVENT' ? `${ATTENDANCE_TYPE.EVENT} · ` : ''}
          {summary(s)}
          {s.tags?.[0] ? ` · ${s.tags[0]}` : ''}
        </span>
      </span>
      {waiting ? (
        <Pill tone="caution">
          <CloudOff className="size-3" aria-hidden="true" /> Not synced
        </Pill>
      ) : s.isLocked ? (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Lock aria-hidden="true" className="size-3.5" /> Closed
        </span>
      ) : (
        <Pill tone="covered">Open</Pill>
      )}
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
    </Link>
  )
}

function AttendancePage() {
  const services = Route.useLoaderData()
  const { q } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [creating, setCreating] = useState(false)
  const fromQuickAdd = Route.useSearch().new
  useEffect(() => {
    if (!fromQuickAdd) return
    setCreating(true)
    void navigate({
      search: (prev) => ({ ...prev, new: undefined }),
      replace: true,
    })
  }, [fromQuickAdd, navigate])
  const [waiting, setWaiting] = useState<Set<string>>(new Set())
  useEffect(() => setWaiting(new Set(servicesWithPending())), [services])

  const today = manilaDay()
  // Open now: services not closed yet, from the last week on.
  const openNow = services.filter(
    (s) => !s.isLocked && dateToDay(s.date) >= addDaysSafe(today, -7),
  )
  const openIds = new Set(openNow.map((s) => s.id))
  const rest = services.filter((s) => !openIds.has(s.id))
  const byMonth = new Map<string, Array<ServiceRow>>()
  for (const s of rest) {
    const key = dateToDay(s.date).slice(0, 7)
    byMonth.set(key, [...(byMonth.get(key) ?? []), s])
  }

  return (
    <Page
      title="Attendance"
      description="Sunday services and events. Works offline."
      action={
        <>
          <Link
            to="/attendance/guests"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            <UsersRound aria-hidden="true" /> Guests
          </Link>
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" /> New service
          </Button>
        </>
      }
    >
      <ListSearch
        value={q}
        placeholder="Search services"
        onChange={(next) =>
          void navigate({ search: { q: next }, replace: true })
        }
      />
      {services.length === 0 ? (
        <Empty
          icon={CalendarCheck}
          title={q ? 'No service by that name.' : 'No services yet.'}
        >
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" /> New service
          </Button>
        </Empty>
      ) : (
        <>
          {openNow.length > 0 && (
            <Section title="Open now">
              <Group className="border-primary/40 dark:border-primary/40">
                {openNow.map((s) => (
                  <ServiceLink
                    key={s.id}
                    s={s}
                    waiting={waiting.has(s.id)}
                    open
                  />
                ))}
              </Group>
            </Section>
          )}
          {[...byMonth.entries()].map(([month, rows]) => (
            <Section key={month} title={monthLabel(`${month}-01`)}>
              <Group>
                {rows.map((s) => (
                  <ServiceLink key={s.id} s={s} waiting={waiting.has(s.id)} />
                ))}
              </Group>
            </Section>
          ))}
        </>
      )}
      <ServiceDialog open={creating} onOpenChange={setCreating} />
    </Page>
  )
}

function addDaysSafe(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
