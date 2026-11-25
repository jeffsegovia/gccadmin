import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Page } from '@/components/shell/page'
import { ReportForm } from '@/components/cell-reports/report-form'
import {
  createReport,
  getReportFormOptions,
} from '@/server/cell-reports/cell-reports.functions'

export const Route = createFileRoute('/_app/reports/new')({
  loader: () => getReportFormOptions({ data: {} }),
  head: () => ({ meta: [{ title: 'New cell report · GCC Admin' }] }),
  component: NewReportPage,
})

function NewReportPage() {
  const initial = Route.useLoaderData()
  const navigate = useNavigate()
  const [opts, setOpts] = useState(initial)
  return (
    <Page
      title="New cell report"
      description="Kept on this device until you save, so nothing is lost."
      back={{ to: '/reports', label: 'Cell reports' }}
      className="max-w-3xl"
    >
      <div className="border bg-card p-4 md:p-6 dark:border-transparent">
        <ReportForm
          opts={opts}
          draftKey="new"
          submitLabel="Save report"
          onCancel={() => void navigate({ to: '/reports' })}
          onLeaderChange={async (leaderId) =>
            setOpts(await getReportFormOptions({ data: { leaderId } }))
          }
          onSubmit={async (values) => {
            const made = await createReport({ data: values })
            toast.success('Report saved')
            await navigate({
              to: '/reports/$reportId',
              params: { reportId: made.id },
            })
          }}
        />
      </div>
    </Page>
  )
}
