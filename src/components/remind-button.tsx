import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { PendingButton } from '@/components/pending-button'
import { messageOf } from '@/lib/errors'
import { sendReportReminders } from '@/server/email/emails.functions'

export function RemindButton({ leaderIds }: { leaderIds: Array<string> }) {
  return (
    <PendingButton
      variant="link"
      size="sm"
      className="h-auto p-0 text-[13px]"
      icon={Mail}
      pendingLabel="Sending…"
      onClick={async () => {
        try {
          const r = await sendReportReminders({ data: { leaderIds } })
          const notes = [
            r.already && `${r.already} already reminded today`,
            r.noAccount && `${r.noAccount} without a linked account`,
            r.failed && `${r.failed} couldn’t be sent`,
          ].filter(Boolean)
          const line = notes.length ? ` (${notes.join(', ')})` : ''
          if (r.sent) toast.success(`Reminder sent to ${r.sent}${line}`)
          else toast.info(`Nobody to remind${line}`)
        } catch (error) {
          toast.error(messageOf(error))
        }
      }}
    >
      Email reminder
    </PendingButton>
  )
}
