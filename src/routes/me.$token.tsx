import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ChevronDown,
  ClipboardList,
  Lock,
  MessageSquare,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/shell/logo'
import { GrowthBar, Weeks } from '@/components/disciples/progress'
import { FormField } from '@/components/form-field'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { appConfig } from '@/config/site'
import { dateTime, longDay, shortDate } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import {
  createPortalReport,
  getPortal,
  getPortalReportForm,
  getPortalReports,
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
    const [portal, reportForm, reports] = await Promise.all([
      getPortal({ data: { token: params.token } }),
      getPortalReportForm({ data: { token: params.token } }),
      getPortalReports({ data: { token: params.token } }),
    ])
    return { ...portal, reportForm, reports }
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

function PortalPage() {
  const p = Route.useLoaderData()
  const { token } = Route.useParams()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [contactNo, setContactNo] = useState(p.contactNo)
  const [address, setAddress] = useState(p.address)
  const [pending, setPending] = useState(false)
  const [reporting, setReporting] = useState(false)
  const first = p.name.split(' ')[0]

  return (
    <div className="min-h-dvh">
      <header className="dark bg-background text-foreground">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
          <Logo className="size-6" />
          <span className="truncate font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {appConfig.church}
          </span>
        </div>
      </header>
      <main className="mx-auto flex max-w-xl min-w-0 flex-col gap-5 px-4 pt-3 pb-12">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] leading-8 font-semibold tracking-tight break-words">
            Hi, {first}
          </h1>
          <p className="text-muted-foreground">
            Here’s your walk with GCC so far.
          </p>
        </div>

        {p.leader && (
          <section
            aria-label="Your leader"
            className="flex min-w-0 items-center gap-3 border bg-card p-3.5 dark:border-transparent rounded-xl"
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
            <div className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t rounded-xl overflow-hidden">
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
          className="flex flex-col gap-3 border bg-card p-4 dark:border-transparent rounded-xl"
        >
          <h2 className="text-[13px] font-medium text-muted-foreground">
            Last 12 weeks
          </h2>
          <Weeks label="Cell group" weeks={p.history.cellWeeks} />
          <Weeks label="Sundays" weeks={p.history.sundays} />
        </section>

        {p.reportForm.canReport && (
          <section aria-label="Your cell group" className="flex flex-col gap-2">
            <h2 className="px-0.5 text-[13px] font-medium text-muted-foreground">
              Your cell group
            </h2>
            <div className="flex flex-col gap-3 border bg-card p-4 dark:border-transparent rounded-xl">
              <p className="text-sm text-muted-foreground">
                Report the cell group you led for the people you handle. It goes
                to
                {p.reportForm.leader
                  ? ` ${p.reportForm.leader.name}’s`
                  : ' your leader’s'}{' '}
                network.
              </p>
              <Button size="xl" onClick={() => setReporting(true)}>
                <ClipboardList aria-hidden="true" /> Report a cell group
              </Button>
              {p.reports.length > 0 && (
                <ul className="flex flex-col border-t pt-2 text-sm [&>*+*]:border-t">
                  {p.reports.map((r) => (
                    <li
                      key={r.id}
                      className="flex min-w-0 items-center gap-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate">{r.venue}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {shortDate(r.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <details className="group border bg-card dark:border-transparent rounded-xl">
          <summary className="flex min-h-13 cursor-pointer list-none items-center gap-3 px-3.5 py-2">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-medium">
                Lessons you’ve taken · {p.lessonCount}
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
          className="flex flex-col gap-3 border bg-card p-4 dark:border-transparent rounded-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-medium">Your details</h2>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[13px] font-medium text-primary"
              >
                Fix them
              </button>
            )}
          </div>
          {editing ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={async (e) => {
                e.preventDefault()
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
            >
              <FormField label="Phone" htmlFor="me-phone">
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
            <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="min-w-0 break-words">{p.contactNo || '—'}</dd>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="min-w-0 break-words">{p.address || '—'}</dd>
            </dl>
          )}
        </section>

        <ResponsiveDialog open={reporting} onOpenChange={setReporting}>
          <ResponsiveDialogContent className="sm:max-w-2xl">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Report a cell group</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Kept on this phone until you save.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            {reporting && (
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
                onCancel={() => setReporting(false)}
                onSubmit={async (values) => {
                  await createPortalReport({ data: { token, report: values } })
                  toast.success('Report sent. Thank you!')
                  setReporting(false)
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
