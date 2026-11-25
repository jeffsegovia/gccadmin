import { Link, createFileRoute } from '@tanstack/react-router'
import { CalendarCheck } from 'lucide-react'
import { cn } from 'cn'
import { Page, Section } from '@/components/shell/page'
import { RemindButton } from '@/components/remind-button'
import { Pill } from '@/components/status-pill'
import { buttonVariants } from '@/components/ui/button'
import { Group } from '@/components/ui/list'
import { CELL_TYPE } from '@/lib/labels'
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
  const status = data.churchStatus
  const statusTotal =
    (status.REGULAR ?? 0) + (status.ACS ?? 0) + (status.NACS ?? 0)

  const stats = [
    {
      label: data.everyone ? 'Disciples' : 'Your disciples',
      value: data.discipleTotal.toLocaleString('en-US'),
      of: '',
      tone: '',
    },
    ...(data.everyone
      ? [
          {
            label: 'Cell groups',
            value: String(data.leadersReported),
            of: ` / ${data.leaderTotal}`,
            tone: '',
          },
        ]
      : [
          {
            label: 'Reported',
            value: data.myReportedThisWeek ? 'Yes' : 'Not yet',
            of: '',
            tone: data.myReportedThisWeek ? 'text-covered' : 'text-caution',
          },
        ]),
    {
      label: 'New souls',
      value: String(data.newSouls),
      of: '',
      tone: 'text-covered',
    },
    {
      label: 'Last Sunday',
      value: last ? String(last.total) : '—',
      of: '',
      tone: 'max-md:hidden',
    },
  ]

  return (
    <Page
      wide
      title={`${greeting()}, ${first}`}
      description={`Week of ${shortDay(monday)} – ${shortDay(addDays(monday, 6))}`}
    >
      <div className="grid grid-cols-3 border bg-card md:grid-cols-4 [&>*+*]:border-l">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(
              'flex min-w-0 flex-col gap-1 px-3 py-3 md:px-4',
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
              {s.of && (
                <span className="text-sm font-medium text-muted-foreground">
                  {s.of}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6 lg:order-2">
          <section
            aria-label="Next service"
            className="flex min-w-0 flex-col gap-3 border border-primary/40 bg-card p-4"
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
                {data.notReported.slice(0, 8).map((l) => (
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
              </Group>
            </Section>
          )}

          {statusTotal > 0 && (
            <Section title="Disciples by church status">
              <div className="flex flex-col gap-3 border bg-card p-4 dark:border-transparent">
                <div
                  className="flex h-3 gap-0.5"
                  role="img"
                  aria-label={`Regular ${status.REGULAR ?? 0}, ACS ${status.ACS ?? 0}, NACS ${status.NACS ?? 0}`}
                >
                  <span
                    className="bg-covered"
                    style={{ flexGrow: status.REGULAR ?? 0 }}
                  />
                  <span
                    className="bg-primary"
                    style={{ flexGrow: status.ACS ?? 0 }}
                  />
                  <span
                    className="bg-chart-4"
                    style={{ flexGrow: status.NACS ?? 0 }}
                  />
                </div>
                {(
                  [
                    ['REGULAR', 'Regular', 'bg-covered'],
                    ['ACS', 'ACS', 'bg-primary'],
                    ['NACS', 'NACS', 'bg-chart-4'],
                  ] as const
                ).map(([k, label, color]) => (
                  <div key={k} className="flex items-center gap-2 text-[13px]">
                    <span
                      aria-hidden="true"
                      className={cn('size-2.5', color)}
                    />
                    <span className="flex-1">{label}</span>
                    <span className="numeric">{status[k] ?? 0}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:order-1">
          {data.sundays.length > 0 && (
            <Section
              title={`Sunday attendance · last ${data.sundays.length} weeks`}
            >
              <div className="flex flex-col gap-2 border bg-card p-4 dark:border-transparent">
                <div className="flex h-36 items-end gap-1.5 md:gap-2.5">
                  {data.sundays.map((s, i) => (
                    <div
                      key={s.date}
                      className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                    >
                      <span className="numeric text-[10px] text-muted-foreground max-sm:hidden">
                        {s.total}
                      </span>
                      <span
                        className={cn(
                          'w-full',
                          i === data.sundays.length - 1
                            ? 'bg-primary'
                            : 'bg-chart-4',
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
                className="text-[13px] font-medium text-primary"
              >
                All reports
              </Link>
            }
          >
            {data.thisWeek.length === 0 ? (
              <p className="border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No reports yet this week.
              </p>
            ) : (
              <Group>
                {data.thisWeek.map((r) => (
                  <Link
                    key={r.id}
                    to="/reports/$reportId"
                    params={{ reportId: r.id }}
                    className="grid min-h-13 min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
                  >
                    <span className="font-mono text-xs text-muted-foreground uppercase">
                      {shortDate(r.date)}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {r.leaderName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {r.lessonTitle ?? 'No lesson'} · {CELL_TYPE[r.type]}
                      </span>
                    </span>
                    <span className="numeric text-sm">{r.attendees}</span>
                  </Link>
                ))}
              </Group>
            )}
          </Section>
        </div>
      </div>
    </Page>
  )
}
