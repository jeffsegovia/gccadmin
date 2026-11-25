import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { PersonCombobox } from '@/components/person-combobox'
import { PendingButton } from '@/components/pending-button'
import { FormField } from '@/components/form-field'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import { messageOf } from '@/lib/errors'
import {
  getUnlinkedAccounts,
  linkLeaderAccount,
} from '@/server/admin/admin.functions'

/** Links a primary leader to the account they signed up with, so they
 * can sign in. Opened from the leader's page. */
export function LinkAccountDialog({
  leader,
  onClose,
}: {
  leader: { id: string; name: string } | null
  onClose: () => void
}) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<
    Array<{ id: string; name: string; hint: string }>
  >([])
  const [clerkId, setClerkId] = useState('')
  useEffect(() => {
    if (leader) void getUnlinkedAccounts().then(setAccounts)
  }, [leader])
  return (
    <ResponsiveDialog
      open={!!leader}
      onOpenChange={(o) => {
        if (o) return
        setClerkId('')
        onClose()
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Link {leader?.name}’s account
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            They sign up first (GCC Admin › Sign in › Create an account), then
            appear here. Linking makes them a leader.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-4">
          <FormField label="Account">
            <PersonCombobox
              aria-label="Account"
              people={accounts}
              value={clerkId}
              onChange={setClerkId}
              placeholder="Choose their account"
              searchPlaceholder="Search accounts"
              emptyText="No account by that name or email."
            />
          </FormField>
          <DialogActions>
            <Button variant="secondary" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <PendingButton
              size="lg"
              disabled={!clerkId}
              onClick={async () => {
                try {
                  await linkLeaderAccount({
                    data: { leaderId: leader!.id, clerkId },
                  })
                  toast.success('Account linked')
                  onClose()
                  await router.invalidate()
                } catch (e) {
                  toast.error(messageOf(e))
                }
              }}
            >
              Link
            </PendingButton>
          </DialogActions>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
