import { useRouter } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { PendingButton } from '@/components/pending-button'
import { shortDate } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import { emailWeeklySummary } from '@/server/email/emails.functions'

/** Opt-in: email last week's summary to the admins and pastors, once a
 * week. Says who sent it once it's gone. */
export function SummaryEmail({
  status,
}: {
  status: { week: string; sentAt: string | null; by: string | null }
}) {
  const router = useRouter()
  if (status.sentAt)
    return (
      <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Mail aria-hidden="true" className="size-4 shrink-0" />
        Summary for {status.week} emailed {shortDate(status.sentAt)}
        {status.by ? ` by ${status.by}` : ''}.
      </p>
    )
  return (
    <PendingButton
      variant="link"
      size="sm"
      className="h-auto self-start p-0 text-[13px]"
      icon={Mail}
      pendingLabel="Sending…"
      onClick={async () => {
        try {
          const r = await emailWeeklySummary()
          toast.success(
            `Summary sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}`,
          )
          await router.invalidate()
        } catch (error) {
          toast.error(messageOf(error))
        }
      }}
    >
      Email last week’s summary ({status.week}) to admins and pastors
    </PendingButton>
  )
}
