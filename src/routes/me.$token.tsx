import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  HeartHandshake,
  Lock,
  MessageSquare,
  Phone,
  Sprout,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/shell/logo'
import { GrowthBar, Weeks } from '@/components/disciples/progress'
import { FormField } from '@/components/form-field'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { DateTile } from '@/components/date-tile'
import { Button, buttonVariants } from '@/components/ui/button'
import { Group, rowClass } from '@/components/ui/list'
import { RadioCards } from '@/components/radio-cards'
import {
  CellStatusPill,
  ChurchStatusPill,
  KindPill,
} from '@/components/status-pill'
import { PortalDiscipleForm } from '@/components/portal/disciple-form'
import { PortalSessionForm } from '@/components/portal/session-form'
import { MEMBER_TYPE } from '@/lib/labels'
import { appConfig } from '@/config/site'
import { dateTime, longDay, shortDate } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import {
  createPortalDisciple,
  createPortalReport,
  createPortalSession,
  getPortal,
  getPortalDisciples,
  getPortalReportForm,
  getPortalReports,
  getPortalSessionForm,
  updatePortalDetails,
} from '@/server/portal/portal.functions'
import { ReportForm } from '@/components/cell-reports/report-form'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'

/** A disciple's own page, opened with the link their leader shared. */
export const Route = createFileRoute('/me/$token')({
  loader: async ({ params }) => {
    const token = { data: { token: params.token } }
    const [portal, reportForm, reports, handled, sessionForm] =
      await Promise.all([
        getPortal(token),
        getPortalReportForm(token),
        getPortalReports(token),
        getPortalDisciples(token),
        getPortalSessionForm(token),
      ])
    return { ...portal, reportForm, reports, handled, sessionForm }
  },
  head: () => ({
    meta: [
      { title: `Your page · ${appConfig.church}` },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'referrer', content: 'no-referrer' },
    ],
  }),
  headers: () => ({
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'private, no-store',
  }),
  errorComponent: ({ error }) => (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo className="size-14" />
      <h1 className="text-xl font-semibold">This link isn’t working</h1>
      <p className="text-sm text-muted-foreground">{messageOf(error)}</p>
    </main>
  ),
  component: PortalPage,
})

type Tab = 'disciples' | 'reports' | 'profile'
type ReportKind = 'CELL' | 'SOUL_WINNING' | 'CONSOLIDATION'

function PortalPage() {
  const p = Route.useLoaderData()
  const { token } = Route.useParams()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('disciples')
  const [editing, setEditing] = useState(false)
  const [contactNo, setContactNo] = useState(p.contactNo)
  const [address, setAddress] = useState(p.address)
  const [pending, setPending] = useState(false)
  // Create Report: first the kind, then its form.
  const [creating, setCreating] = useState(false)
  const [kind, setKind] = useState<ReportKind | null>(null)
  const [adding, setAdding] = useState(false)
  const first = p.name.split(' ')[0]
  const closeCreate = () => {
    setCreating(false)
    setKind(null)
  }

  return (
    <div className="min-h-dvh">
      <header className="dark border-b border-white/12 bg-background text-foreground">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
          <Logo className="size-6" />
          <span className="truncate text-[15px] font-semibold tracking-tight">
            {appConfig.church}
          </span>
        </div>
      </header>
      <main className="mx-auto flex max-w-xl min-w-0 flex-col gap-5 px-4 pt-4 pb-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] leading-8 font-semibold tracking-tight break-words">
            Hi, {first}
          </h1>
          <p className="text-muted-foreground">
            {p.leader ? `In ${p.leader.name}’s network.` : 'Your page at GCC.'}
          </p>
        </div>

        {/* What they come here to do, always in reach. */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="xl" onClick={() => setCreating(true)}>
            <ClipboardList aria-hidden="true" /> Create Report
          </Button>
          <Button size="xl" variant="secondary" onClick={() => setAdding(true)}>
            <UserPlus aria-hidden="true" /> Add Disciple
          </Button>
        </div>

        <Segmented
          label="Sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'disciples', label: `Disciples · ${p.handled.length}` },
            { value: 'reports', label: `Reports · ${p.reports.length}` },
            { value: 'profile', label: 'Profile' },
          ]}
        />

        {tab === 'disciples' &&
          (p.handled.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No disciples yet. Add the people you handle with Add Disciple.
            </p>
          ) : (
            <Group>
              {p.handled.map((d) => (
                // Two lines, badges only for what isn't Regular.
                <div key={d.id} className={rowClass}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[15px] font-medium">
                        {d.name}
                      </span>
                      {d.churchStatus !== 'REGULAR' && (
                        <ChurchStatusPill status={d.churchStatus} />
                      )}
                      {d.cellStatus !== 'REGULAR' && (
                        <CellStatusPill status={d.cellStatus} />
                      )}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {MEMBER_TYPE[d.memberType]}
                    </span>
                  </span>
                </div>
              ))}
            </Group>
          ))}

        {tab === 'reports' &&
          (p.reports.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No reports yet. Report a cell group, soul winning or consolidation
              with Create Report.
            </p>
          ) : (
            <Group>
              {p.reports.map((r) => (
                <div key={r.id} className={rowClass} title={dateTime(r.date)}>
                  <DateTile date={r.date} instant />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">
                      {r.topic ?? 'No lesson'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {r.type === 'SOUL_WINNING'
                        ? `${r.attendees} won`
                        : r.type === 'CONSOLIDATION'
                          ? `${r.attendees} consolidated`
                          : `${r.attendees} ${r.attendees === 1 ? 'attendee' : 'attendees'}`}
                      {' · '}
                      {r.venue}
                    </span>
                  </span>
                  <KindPill kind={r.type} />
                </div>
              ))}
            </Group>
          ))}

        {tab === 'profile' && (
          <ProfileTab
            p={p}
            editing={editing}
            setEditing={setEditing}
            contactNo={contactNo}
            setContactNo={setContactNo}
            address={address}
            setAddress={setAddress}
            pending={pending}
            onSave={async () => {
              setPending(true)
              try {
                await updatePortalDetails({
                  data: { token, contactNo, address },
                })
                toast.success('Thanks! Your details are saved.')
                setEditing(false)
                await router.invalidate()
              } catch (error) {
                toast.error(messageOf(error))
              } finally {
                setPending(false)
              }
            }}
          />
        )}

        <ResponsiveDialog
          open={creating}
          onOpenChange={(o) => (o ? setCreating(true) : closeCreate())}
        >
          <ResponsiveDialogContent className="sm:max-w-2xl">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                {kind === 'CELL'
                  ? 'Report a cell group'
                  : kind === 'SOUL_WINNING'
                    ? 'Report soul winning'
                    : kind === 'CONSOLIDATION'
                      ? 'Report a consolidation'
                      : 'Create Report'}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {kind
                  ? `It goes to ${p.reportForm.leader?.name ?? 'your leader'}’s network.`
                  : 'What are you reporting?'}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            {!kind && (
              <RadioCards<ReportKind>
                label="Kind of report"
                value={'' as ReportKind} // nothing chosen yet
                onChange={setKind}
                options={[
                  {
                    value: 'CELL',
                    label: 'Cell Group',
                    hint: 'Open Cell or Discipleship',
                    icon: BookOpen,
                  },
                  {
                    value: 'SOUL_WINNING',
                    label: 'Soul Winning',
                    hint: 'New believers won',
                    icon: Sprout,
                  },
                  {
                    value: 'CONSOLIDATION',
                    label: 'Consolidation',
                    hint: 'Following up the believers you handle',
                    icon: HeartHandshake,
                  },
                ]}
              />
            )}
            {kind === 'CELL' &&
              (p.reportForm.canReport ? (
                <ReportForm
                  opts={{
                    lessons: p.reportForm.lessons,
                    people: p.reportForm.people,
                    leaders: [],
                    chooseLeader: false,
                    leaderId: p.reportForm.leader?.id ?? null,
                    suggested: p.reportForm.suggested,
                  }}
                  draftKey={`portal-${token.slice(0, 8)}`}
                  fixedLeader={p.reportForm.leader?.name}
                  submitLabel="Send report"
                  onCancel={closeCreate}
                  onSubmit={async (values) => {
                    await createPortalReport({
                      data: { token, report: values },
                    })
                    toast.success('Report sent. Thank you!')
                    closeCreate()
                    await router.invalidate()
                  }}
                />
              ) : (
                <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Add the disciples you handle first (Add Disciple), then report
                  their cell group here.
                </p>
              ))}
            {(kind === 'SOUL_WINNING' || kind === 'CONSOLIDATION') && (
              <PortalSessionForm
                kind={kind}
                lessons={p.sessionForm.lessons}
                believers={p.sessionForm.believers}
                onCancel={closeCreate}
                onSubmit={async (values) => {
                  await createPortalSession({ data: { token, ...values } })
                  toast.success('Report sent. Thank you!')
                  closeCreate()
                  setTab('reports')
                  await router.invalidate()
                }}
              />
            )}
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        <ResponsiveDialog open={adding} onOpenChange={setAdding}>
          <ResponsiveDialogContent className="sm:max-w-lg">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Add Disciple</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Someone you handle, in{' '}
                {p.reportForm.leader?.name ?? 'your leader'}’s network.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            {adding && (
              <PortalDiscipleForm
                onCancel={() => setAdding(false)}
                onSubmit={async (disciple) => {
                  await createPortalDisciple({ data: { token, disciple } })
                  toast.success(`${disciple.name.split(' ')[0]} added`)
                  setAdding(false)
                  setTab('disciples')
                  await router.invalidate()
                }}
              />
            )}
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
          <Lock aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          This page is just for you. Keep the link to yourself; your leader can
          give you a new one anytime.
        </p>
      </main>
    </div>
  )
}

type PortalData = Awaited<ReturnType<typeof getPortal>>

/** Their own page as it was: leader, what's coming, growth, the last 12
 * weeks, lessons taken, and the details they can fix. */
function ProfileTab({
  p,
  editing,
  setEditing,
  contactNo,
  setContactNo,
  address,
  setAddress,
  pending,
  onSave,
}: {
  p: PortalData
  editing: boolean
  setEditing: (v: boolean) => void
  contactNo: string
  setContactNo: (v: string) => void
  address: string
  setAddress: (v: string) => void
  pending: boolean
  onSave: () => Promise<void>
}) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {p.leader && (
        <section
          aria-label="Your leader"
          className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3.5 dark:border-transparent"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs text-muted-foreground">Your leader</span>
            <span className="truncate text-[15px] font-medium">
              {p.leader.name}
            </span>
          </div>
          {p.leader.contactNo && (
            <>
              <a
                href={`sms:${p.leader.contactNo}`}
                aria-label={`Message ${p.leader.name}`}
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'icon-lg',
                })}
              >
                <MessageSquare aria-hidden="true" />
              </a>
              <a
                href={`tel:${p.leader.contactNo}`}
                aria-label={`Call ${p.leader.name}`}
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'icon-lg',
                })}
              >
                <Phone aria-hidden="true" />
              </a>
            </>
          )}
        </section>
      )}

      {(p.nextService || p.lastCellGroup) && (
        <section aria-label="Coming up" className="flex flex-col gap-2">
          <h2 className="px-0.5 text-[13px] font-medium text-muted-foreground">
            Coming up
          </h2>
          <div className="flex flex-col overflow-hidden rounded-xl border bg-card dark:border-transparent [&>*+*]:border-t">
            {p.nextService && (
              <div className="flex min-w-0 flex-col px-3.5 py-3">
                <span className="truncate text-[15px] font-medium">
                  {p.nextService.title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {longDay(p.nextService.date)}
                </span>
              </div>
            )}
            {p.lastCellGroup && (
              <div className="flex min-w-0 flex-col px-3.5 py-3">
                <span className="truncate text-[15px] font-medium">
                  Your cell group
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Last met {dateTime(p.lastCellGroup.date)} ·{' '}
                  {p.lastCellGroup.venue}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <GrowthBar level={p.processLevel} status={p.processLevelStatus} />

      <section
        aria-label="Last 12 weeks"
        className="flex flex-col gap-3 rounded-xl border bg-card p-4 dark:border-transparent"
      >
        <h2 className="text-[13px] font-medium text-muted-foreground">
          Last 12 weeks
        </h2>
        <Weeks label="Cell group" weeks={p.history.cellWeeks} />
        <Weeks label="Sundays" weeks={p.history.sundays} />
      </section>

      <details className="group overflow-hidden rounded-xl border bg-card dark:border-transparent">
        <summary className="flex min-h-13 cursor-pointer list-none items-center gap-3 px-3.5 py-2">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] font-medium">
              Lessons Taken · {p.lessonCount}
            </span>
            {p.lessons[0] && (
              <span className="truncate text-xs text-muted-foreground">
                Latest: {p.lessons[0].title}
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <ul className="flex flex-col border-t [&>*+*]:border-t">
          {p.lessons.map((l) => (
            <li
              key={l.title}
              className="flex min-w-0 items-center gap-3 px-3.5 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{l.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {shortDate(l.date)}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <section
        aria-label="Your details"
        className="flex flex-col gap-3 rounded-xl border bg-card p-4 dark:border-transparent"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-medium">Your details</h2>
          {!editing && (
            <Button variant="link" size="sm" onClick={() => setEditing(true)}>
              Fix them
            </Button>
          )}
        </div>
        {editing ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault()
              await onSave()
            }}
          >
            <FormField label="Contact No." htmlFor="me-phone">
              <Input
                id="me-phone"
                type="tel"
                inputMode="tel"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
              />
            </FormField>
            <FormField label="Address" htmlFor="me-address">
              <Input
                id="me-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </FormField>
            <SubmitButton size="lg" pending={pending}>
              Save
            </SubmitButton>
          </form>
        ) : (
          <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-y-2 text-sm">
            <dt className="text-muted-foreground">Contact No.</dt>
            <dd className="min-w-0 break-words">{p.contactNo || '—'}</dd>
            <dt className="text-muted-foreground">Address</dt>
            <dd className="min-w-0 break-words">{p.address || '—'}</dd>
          </dl>
        )}
      </section>
    </div>
  )
}
