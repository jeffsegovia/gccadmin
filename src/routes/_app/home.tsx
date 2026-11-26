import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarCheck, ChartColumn, PhoneCall, UserRoundX } from 'lucide-react'
import { cn } from 'cn'
import { Page, Section } from '@/components/shell/page'
import { RemindButton } from '@/components/remind-button'
import { BirthdayList } from '@/components/birthday-list'
import { ReportRow } from '@/components/cell-reports/report-row'
import { Pill } from '@/components/status-pill'
import { buttonVariants } from '@/components/ui/button'
import { Group, RowChevron } from '@/components/ui/list'
import {
  longDay,
  manilaDay,
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

  // Each figure says what it counts in a line under it.
  const stats = [
    {
      label: data.everyone ? 'Disciples' : 'Your disciples',
      value: data.discipleTotal.toLocaleString('en-US'),
      hint: 'active',
      tone: '',
      to: '/disciples',
    },
    ...(data.everyone
      ? [
          {
            label: 'Cell groups',
            value: String(data.leadersReported),
            hint: `of ${data.leaderTotal} leaders reported`,
            tone: '',
            to: '/reports',
          },
        ]
      : [
          {
            label: 'Reported',
            value: data.myReportedThisWeek ? 'Yes' : 'Not yet',
            hint: 'this week',
            tone: data.myReportedThisWeek ? 'text-covered' : 'text-caution',
            to: '/reports',
          },
        ]),
    {
      label: 'New believers',
      value: String(data.newSouls),
      hint: 'this month',
      tone: 'text-covered',
      to: '/soul-winning',
    },
    {
      label: 'Last Sunday',
      value: last ? String(last.total) : '—',
      hint: last ? shortDay(last.date) : 'no service yet',
      tone: 'max-md:hidden',
      to: '/attendance',
    },
  ]

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
      {/* One grid so phones can put what to do first and the numbers
          after, while wide screens keep two columns. */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="order-2 grid grid-cols-3 overflow-hidden rounded-xl border bg-card md:grid-cols-4 lg:order-none lg:col-span-2 lg:row-start-1 [&>*+*]:border-l">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className={cn(
                'flex min-w-0 flex-col gap-1 px-3 py-3 transition-colors hover:bg-muted/50 md:px-4',
                s.tone.includes('max-md:hidden') && 'max-md:hidden',
              )}
            >
              <span className="truncate text-xs text-muted-foreground md:text-[13px]">
                {s.label}
              </span>
              <span
                className={cn(
                  'numeric truncate text-xl font-semibold tracking-tight md:text-[28px]',
                  s.tone.replace('max-md:hidden', ''),
                )}
              >
                {s.value}
              </span>
              <span className="text-xs leading-tight text-muted-foreground">
                {s.hint}
              </span>
            </Link>
          ))}
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-6 lg:order-none lg:col-start-2 lg:row-start-2">
          <section
            aria-label="Next service"
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-primary/40 bg-card p-4"
          >
            {data.upcoming ? (
              <>
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid h-12 w-11 shrink-0 place-items-center content-center bg-muted"
                  >
                    <span className="font-mono text-[10px] font-semibold tracking-widest text-primary uppercase">
                      {shortDay(data.upcoming.date).split(' ')[0]}
                    </span>
                    <span className="text-lg leading-5 font-bold">
                      {shortDay(data.upcoming.date).split(' ')[1]}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-semibold">
                      {data.upcoming.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {longDay(data.upcoming.date)}
                    </span>
                  </span>
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
                    <span className="grid size-8 shrink-0 place-items-center bg-muted text-primary">
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

          <Link
            to="/insights"
            className="flex min-h-16 min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/50 dark:border-transparent"
          >
            <span className="grid size-9 shrink-0 place-items-center bg-muted text-primary">
              <ChartColumn aria-hidden="true" className="size-[18px]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-semibold">
                Insights
              </span>
              <span className="truncate text-xs text-muted-foreground">
                Cell groups, soul winning and members
              </span>
            </span>
            <RowChevron />
          </Link>
        </div>

        <div className="order-3 flex min-w-0 flex-col gap-6 lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-2">
          {data.sundays.length > 0 && (
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
                          'w-full',
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
          )}

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
              <Group>
                {data.thisWeek.map((r) => (
                  <ReportRow key={r.id} r={r} />
                ))}
              </Group>
            )}
          </Section>
        </div>

        <div className="order-4 min-w-0 lg:order-none lg:col-start-2 lg:row-start-3">
          <Section title={`Birthdays this week · ${data.birthdays.length}`}>
            <BirthdayList birthdays={data.birthdays} today={data.today} />
          </Section>
        </div>
      </div>
    </Page>
  )
}
