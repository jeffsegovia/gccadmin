import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/shell/page'
import { ReportForm } from '@/components/cell-reports/report-form'
import type { ReportFormOptions } from '@/components/cell-reports/report-form'
import { GenderBar, Pill } from '@/components/status-pill'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
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
import { reportToForm } from '@/lib/cell-reports/schema'
import { CELL_STATUS, CELL_TYPE, plural } from '@/lib/labels'
import { dateTime, toLocalInput } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import {
  deleteReport,
  getReport,
  getReportFormOptions,
  updateReport,
} from '@/server/cell-reports/cell-reports.functions'

export const Route = createFileRoute('/_app/reports/$reportId')({
  loader: ({ params }) => getReport({ data: { id: params.reportId } }),
  head: () => ({ meta: [{ title: 'Cell report · GCC Admin' }] }),
  component: ReportPage,
})

function ReportPage() {
  const data = Route.useLoaderData()
  const r = data.report
  const router = useRouter()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [opts, setOpts] = useState<ReportFormOptions | null>(null)
  const [deleting, setDeleting] = useState(false)
  const lesson = data.lessonName ?? r.lessonTitle ?? 'No lesson'

  return (
    <Page
      back={{ to: '/reports', label: 'Cell reports' }}
      title={lesson}
      description={`${dateTime(r.date)}${data.seriesTitle ? ` · ${data.seriesTitle}` : ''}`}
      action={
        data.canEdit && (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={async () => {
                setEditing(true)
                setOpts(
                  await getReportFormOptions({
                    data: { leaderId: r.leaderId },
                  }),
                )
              }}
            >
              <Pencil aria-hidden="true" /> Edit
            </Button>
            <Button
              variant="destructive"
              size="icon-lg"
              aria-label="Delete report"
              onClick={() => setDeleting(true)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </>
        )
      }
    >
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="px-0.5 text-[13px] font-medium text-muted-foreground">
            Who came · {data.attendees.length}
          </h2>
          <div className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t">
            {data.attendees.map((a) => (
              <Link
                key={a.id}
                to="/disciples/$discipleId"
                params={{ discipleId: a.id }}
                className="flex min-h-12 min-w-0 items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
              >
                <GenderBar gender={a.gender} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {a.name}
                </span>
                {a.statusThen && a.statusThen !== 'REGULAR' && (
                  <Pill tone="caution">{CELL_STATUS[a.statusThen]}</Pill>
                )}
              </Link>
            ))}
          </div>
        </section>
        <dl className="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2.5 border bg-card p-4 text-sm dark:border-transparent">
          {[
            ['Leader', data.leaderName ?? '—'],
            ['Assistant', data.assistantName ?? '—'],
            ['Type', CELL_TYPE[r.type]],
            ['Venue', r.venue],
            ['Scripture', (r.scriptureReferences ?? []).join(', ') || '—'],
            ['Worship', (r.worship ?? []).join(', ') || '—'],
            ['Follow-up', (r.work ?? []).join('; ') || '—'],
            ['Came', plural(data.attendees.length, 'person', 'people')],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ResponsiveDialog open={editing} onOpenChange={setEditing}>
        <ResponsiveDialogContent className="sm:max-w-2xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edit report</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          {!opts ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : (
            <ReportForm
              opts={opts}
              initial={reportToForm(
                r,
                data.attendees.map((a) => a.id),
                toLocalInput,
              )}
              submitLabel="Save"
              onCancel={() => setEditing(false)}
              onLeaderChange={async (leaderId) =>
                setOpts(await getReportFormOptions({ data: { leaderId } }))
              }
              onSubmit={async (values) => {
                await updateReport({ data: { id: r.id, report: values } })
                toast.success('Report saved')
                setEditing(false)
                await router.invalidate()
              }}
            />
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              It leaves everyone’s cell group history. Their cell status stays
              as it is.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteReport({ data: { id: r.id } })
                  toast.success('Report deleted')
                  await navigate({ to: '/reports' })
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
    </Page>
  )
}
