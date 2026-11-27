import { Link, createFileRoute } from '@tanstack/react-router'
import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  PhoneCall,
  Sprout,
  UserRoundX,
  Users,
} from 'lucide-react'
import { cn } from 'cn'
import { Page, Section } from '@/components/shell/page'
import { RemindButton } from '@/components/remind-button'
import { BirthdayList } from '@/components/birthday-list'
import { ReportRow } from '@/components/cell-reports/report-row'
import { ReportsTable } from '@/components/cell-reports/reports-table'
import { Pill } from '@/components/status-pill'
import { buttonVariants } from '@/components/ui/button'
import { Group, RowChevron, StatStrip } from '@/components/ui/list'
import type { StatItem } from '@/components/ui/list'
import {
  daysBetween,
  manilaDay,
  weekdayDay,
  shortDate,
  shortDay,
  weekStart,
  addDays,
} from '@/lib/dates'
import { getHome } from '@/server/home/home.functions'

export const Route = createFileRoute('/_app/home')({
  loader: () => getHome(),
  head: () => ({ meta: [{ title: 'Home · GCC Admin' }] }),
  component: HomePage,
})

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Asia/Manila',
    }).format(new Date()),
  )
  return hour < 12
    ? 'Good morning'
    : hour < 18
      ? 'Good afternoon'
      : 'Good evening'
}

function HomePage() {
  const data = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()
  const first = viewer.name
    .replace(/^(ptr|ptra|pastor|bro|sis)\.?\s+/i, '')
    .split(' ')[0]
  const monday = weekStart(manilaDay())
  const last = data.sundays.at(-1)
  const maxSunday = Math.max(1, ...data.sundays.map((s) => s.total))
  const before = data.sundays.at(-2)
  const change = last && before ? last.total - before.total : null

  // A strip of three: icon, label, figure (as in Osamu); what each counts
  // is in its label, not a third line.
  const stats: StatItem[] = [
    {
      icon: Users,
      label: data.everyone ? 'Disciples' : 'Your disciples',
      value: data.discipleTotal.toLocaleString('en-US'),
      to: '/disciples',
    },
    data.everyone
      ? {
          icon: ClipboardList,
          label: 'Cells reported',
          value: (
            <>
              {data.leadersReported}
              <span className="text-sm font-medium text-muted-foreground">
                {' '}
                of {data.leaderTotal}
              </span>
            </>
          ),
          tone:
            data.leadersReported < data.leaderTotal
              ? ('caution' as const)
              : ('covered' as const),
          to: '/reports',
        }
      : {
          icon: ClipboardList,
          label: 'Reported',
          value: data.myReportedThisWeek ? 'Yes' : 'Not yet',
          tone: data.myReportedThisWeek
            ? ('covered' as const)
            : ('caution' as const),
          to: '/reports',
        },
    {
      icon: Sprout,
      label: 'New this month',
      value: String(data.newSouls),
      tone: 'covered',
      to: '/soul-winning',
    },
  ]
  const daysToService = data.upcoming
    ? daysBetween(manilaDay(), data.upcoming.date)
    : null
  const when =
    daysToService === null
      ? ''
      : daysToService <= 0
        ? 'today'
        : daysToService === 1
          ? 'tomorrow'
          : `in ${daysToService} days`

  const attention = [
    ...(data.guestsToFollowUp > 0
      ? [
          {
            key: 'guests',
            icon: PhoneCall,
            text: `${data.guestsToFollowUp} ${data.guestsToFollowUp === 1 ? 'guest' : 'guests'} to follow up`,
            hint: 'Came to a service, not a disciple yet',
            to: '/attendance/guests',
          },
        ]
      : []),
    ...(data.awayFromSunday > 0
      ? [
          {
            key: 'away',
            icon: UserRoundX,
            text: `${data.awayFromSunday} ${data.awayFromSunday === 1 ? 'disciple' : 'disciples'} missed the last 4 Sundays`,
            hint: 'Worth a call or a visit',
            to: '/disciples',
            search: { away: true, sort: 'lastSeen' as const },
          },
        ]
      : []),
  ]

  return (
    <Page
      wide
      title={`${greeting()}, ${first}`}
      description={`Week of ${shortDay(monday)} – ${shortDay(addDays(monday, 6))}`}
    >
      {/* One grid so phones read the numbers first (the KPIs, then Sunday's
          attendance), then what to do, while wide screens keep two
          columns. */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <StatStrip
          items={stats}
          className="order-1 lg:order-none lg:col-span-2 lg:row-start-1"
        />

        {/* The next service leads on phones (as Safe to spend does in
            Osamu): Sunday's one job is a tap away. */}
        <section
          aria-label="Next service"
          className="order-first flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 lg:order-none lg:col-start-2 lg:row-start-2"
        >
          {data.upcoming ? (
            <>
              <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <CalendarDays
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                Next service · {when}
              </span>
              <div className="min-w-0">
                <div className="numeric text-[28px] leading-8 font-semibold tracking-tight">
                  {weekdayDay(data.upcoming.date)}
                </div>
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {data.upcoming.title}
                  {last && ` · last Sunday ${last.total} present`}
                </div>
              </div>
              <Link
                to="/attendance/$attendanceId"
                params={{ attendanceId: data.upcoming.id }}
                className={buttonVariants({ size: 'lg' })}
              >
                <CalendarCheck aria-hidden="true" /> Take attendance
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                No service set up for this Sunday yet.
              </p>
              <Link
                to="/attendance"
                className={buttonVariants({
                  size: 'lg',
                  variant: 'secondary',
                })}
              >
                <CalendarCheck aria-hidden="true" /> Set up attendance
              </Link>
            </>
          )}
        </section>

        <div className="order-3 flex min-w-0 flex-col gap-6 lg:order-none lg:col-start-2 lg:row-start-3">
          {data.notReported.length > 0 && (
            <Section
              title={
                data.everyone
                  ? `Not reported this week · ${data.notReported.length}`
                  : 'Your report this week'
              }
              action={
                viewer.isAdmin ? (
                  <RemindButton leaderIds={data.notReported.map((l) => l.id)} />
                ) : undefined
              }
            >
              <Group>
                {data.notReported.slice(0, 5).map((l) => (
                  <div
                    key={l.id}
                    className="flex min-h-12 min-w-0 items-center gap-3 px-3.5 py-2"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{l.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {l.last
                          ? `Last report ${shortDate(l.last)}`
                          : 'No reports yet'}
                      </span>
                    </span>
                    {l.days !== null && (
                      <Pill tone={l.days > 14 ? 'short' : 'caution'}>
                        {l.days} days
                      </Pill>
                    )}
                  </div>
                ))}
                {data.notReported.length > 5 && (
                  <Link
                    to="/reports"
                    className="flex min-h-11 items-center justify-between px-3.5 text-[13px] font-medium text-primary"
                  >
                    See all {data.notReported.length} in reports
                    <RowChevron />
                  </Link>
                )}
              </Group>
            </Section>
          )}

          {attention.length > 0 && (
            <Section title="Needs a follow-up">
              <Group>
                {attention.map((a) => (
                  <Link
                    key={a.key}
                    to={a.to}
                    search={a.search}
                    className="flex min-h-14 min-w-0 items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-primary">
                      <a.icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-medium">
                        {a.text}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {a.hint}
                      </span>
                    </span>
                    <RowChevron />
                  </Link>
                ))}
              </Group>
            </Section>
          )}
        </div>

        <div className="contents lg:col-start-1 lg:row-span-3 lg:row-start-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          {data.sundays.length > 0 && (
            <div className="order-2 min-w-0 lg:order-none">
              <Section
                title={`Sunday attendance · last ${data.sundays.length} weeks`}
                action={
                  <Link
                    to="/attendance"
                    className="py-1 text-[13px] font-medium text-primary"
                  >
                    All services
                  </Link>
                }
              >
                <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 dark:border-transparent">
                  <div className="flex h-36 items-end gap-1.5 md:gap-2.5">
                    {data.sundays.map((s, i) => (
                      <div
                        key={s.date}
                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                      >
                        <span
                          className={cn(
                            'numeric text-xs',
                            i === data.sundays.length - 1
                              ? 'font-semibold text-foreground'
                              : 'text-muted-foreground max-sm:hidden',
                          )}
                        >
                          {s.total}
                        </span>
                        <span
                          className={cn(
                            'w-full rounded-t-md',
                            i === data.sundays.length - 1
                              ? 'bg-primary'
                              : 'bg-muted-foreground/40',
                          )}
                          style={{
                            height: `${Math.max(2, (s.total / maxSunday) * 100)}%`,
                          }}
                          title={`${shortDay(s.date)}: ${s.total}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{shortDay(data.sundays[0].date)}</span>
                    <span className="font-medium text-foreground">
                      Last Sunday · {last?.total}
                      {change !== null &&
                        ` (${change > 0 ? '+' : ''}${change} vs the week before)`}
                    </span>
                  </div>
                </div>
              </Section>
            </div>
          )}

          <div className="order-4 min-w-0 lg:order-none">
            <Section
              title={`Cell groups this week · ${data.thisWeek.length}`}
              action={
                <Link
                  to="/reports"
                  className="py-1 text-[13px] font-medium text-primary"
                >
                  All reports
                </Link>
              }
            >
              {data.thisWeek.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  No reports yet this week.
                </p>
              ) : (
                <>
                  <Group className="md:hidden">
                    {data.thisWeek.map((r) => (
                      <ReportRow key={r.id} r={r} />
                    ))}
                  </Group>
                  <ReportsTable
                    groups={[['This week', data.thisWeek]]}
                    labelGroups={false}
                    compact
                  />
                </>
              )}
            </Section>
          </div>
        </div>

        <div className="order-5 min-w-0 lg:order-none lg:col-start-2 lg:row-start-4">
          <Section title={`Birthdays this week · ${data.birthdays.length}`}>
            <BirthdayList birthdays={data.birthdays} today={data.today} />
          </Section>
        </div>
      </div>
    </Page>
  )
}
