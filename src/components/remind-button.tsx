import { Mail } from 'lucide-react'
import { toast } from 'sonner'
import { PendingButton } from '@/components/pending-button'
import { messageOf } from '@/lib/errors'
import { sendReportReminders } from '@/server/admin/admin.functions'

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
          toast.success(
            `Reminder sent to ${r.sent}${r.skipped ? `; ${r.skipped} have no linked account` : ''}`,
          )
        } catch (error) {
          toast.error(messageOf(error))
        }
      }}
    >
      Email reminder
    </PendingButton>
  )
}
