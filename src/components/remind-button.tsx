import { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { CheckMark } from '@/components/check-mark'
import { PendingButton } from '@/components/pending-button'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { timeAgo } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import {
  getReminderRecipients,
  sendReportReminders,
} from '@/server/email/emails.functions'

type Recipient = Awaited<ReturnType<typeof getReminderRecipients>>[number]

/** Email a cell report reminder: opens a confirmation listing the leaders,
 * each ticked if they can get one (a linked account, not reminded today),
 * and sends only to those still ticked. */
export function RemindButton({ leaderIds }: { leaderIds: Array<string> }) {
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState<Array<Recipient> | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const can = (p: Recipient) => !!p.email && !p.remindedToday
  const openDialog = async () => {
    setOpen(true)
    setPeople(null)
    try {
      const list = await getReminderRecipients({ data: { leaderIds } })
      setPeople(list)
      setPicked(new Set(list.filter(can).map((p) => p.id)))
    } catch (error) {
      toast.error(messageOf(error))
      setOpen(false)
    }
  }
  const eligible = people?.filter(can) ?? []
  const allOn = eligible.length > 0 && eligible.every((p) => picked.has(p.id))

  return (
    <>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 text-[13px]"
        onClick={openDialog}
      >
        <Mail aria-hidden="true" /> Email reminder
      </Button>
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              Send a cell report reminder
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Each leader ticked gets one email. A leader is reminded at most
              once a day.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {!people ? (
            <div aria-busy="true" className="flex flex-col gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium">
                  Recipients · {picked.size} of {eligible.length}
                </span>
                {eligible.length > 0 && (
                  <button
                    type="button"
                    className="text-[13px] font-medium text-primary hover:underline"
                    onClick={() =>
                      setPicked(
                        allOn ? new Set() : new Set(eligible.map((p) => p.id)),
                      )
                    }
                  >
                    {allOn ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>
              <div className="flex max-h-[22rem] flex-col overflow-y-auto rounded-xl border [&>*+*]:border-t">
                {people.map((p) => {
                  const on = picked.has(p.id)
                  const disabled = !can(p)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      disabled={disabled}
                      onClick={() => {
                        const next = new Set(picked)
                        if (on) next.delete(p.id)
                        else next.add(p.id)
                        setPicked(next)
                      }}
                      className={cn(
                        'flex min-h-13 min-w-0 items-center gap-3 px-3 py-2 text-left disabled:opacity-55',
                        on && 'bg-covered/8',
                      )}
                    >
                      <CheckMark on={on} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-medium">
                          {p.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {!p.email
                            ? 'No linked account, so no email'
                            : p.remindedToday
                              ? 'Already reminded today'
                              : p.last
                                ? `${p.email} · last report ${timeAgo(p.last)}`
                                : `${p.email} · no reports yet`}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <DialogActions>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <PendingButton
                  size="lg"
                  icon={Send}
                  pendingLabel="Sending…"
                  disabled={picked.size === 0}
                  onClick={async () => {
                    try {
                      const r = await sendReportReminders({
                        data: { leaderIds: [...picked] },
                      })
                      const notes = [
                        r.already && `${r.already} already reminded today`,
                        r.failed && `${r.failed} couldn’t be sent`,
                      ].filter(Boolean)
                      toast.success(
                        `Reminder sent to ${r.sent}${notes.length ? ` (${notes.join(', ')})` : ''}`,
                      )
                      setOpen(false)
                    } catch (error) {
                      toast.error(messageOf(error))
                    }
                  }}
                >
                  Send to {picked.size}
                </PendingButton>
              </DialogActions>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
