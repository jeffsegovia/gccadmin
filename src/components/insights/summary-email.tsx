import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Mail, Send } from 'lucide-react'
import { toast } from 'sonner'
import { PendingButton } from '@/components/pending-button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { shortDate } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import { emailWeeklySummary } from '@/server/email/emails.functions'

/** Opt-in: email last week's summary to the admins and pastors, once a
 * week, after a confirmation. Says who sent it once it's gone. */
export function SummaryEmail({
  status,
}: {
  status: { week: string; sentAt: string | null; by: string | null }
}) {
  const router = useRouter()
  const [asking, setAsking] = useState(false)
  if (status.sentAt)
    return (
      <p className="flex min-w-0 items-start gap-2 text-[13px] text-muted-foreground">
        <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span className="min-w-0 break-words">
          Last week’s summary ({status.week}) was emailed{' '}
          {shortDate(status.sentAt)}
          {status.by ? ` by ${status.by}` : ''}.
        </span>
      </p>
    )
  return (
    <>
      <Button
        variant="secondary"
        size="lg"
        className="self-start"
        onClick={() => setAsking(true)}
      >
        <Mail aria-hidden="true" /> Email last week’s summary
      </Button>
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Email last week’s summary?</AlertDialogTitle>
            <AlertDialogDescription>
              The summary for {status.week} goes to every admin and pastor. It
              can be sent once a week.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <PendingButton
              icon={Send}
              pendingLabel="Sending…"
              onClick={async () => {
                try {
                  const r = await emailWeeklySummary()
                  toast.success(
                    `Summary sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}`,
                  )
                  setAsking(false)
                  await router.invalidate()
                } catch (error) {
                  toast.error(messageOf(error))
                }
              }}
            >
              Send
            </PendingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
