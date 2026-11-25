import { useEffect, useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { Link2, Shield, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Empty, Page } from '@/components/shell/page'
import { ListSearch } from '@/components/list-search'
import { Pill } from '@/components/status-pill'
import { RemindButton } from '@/components/remind-button'
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
import { Group, RowChevron } from '@/components/ui/list'
import { messageOf } from '@/lib/errors'
import {
  getLeaders,
  getUnlinkedAccounts,
  linkLeaderAccount,
  unlinkLeaderAccount,
} from '@/server/admin/admin.functions'

export const Route = createFileRoute('/_app/leaders')({
  validateSearch: z.object({ q: z.string().optional() }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getLeaders({ data: deps }),
  head: () => ({ meta: [{ title: 'Leaders · GCC Admin' }] }),
  component: LeadersPage,
})

function LeadersPage() {
  const leaders = Route.useLoaderData()
  const { q } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const [linking, setLinking] = useState<{ id: string; name: string } | null>(
    null,
  )
  const withAccount = leaders.filter((l) => l.userAccountId).map((l) => l.id)

  return (
    <Page
      title="Primary leaders"
      description={`${leaders.length} leaders · ${withAccount.length} can sign in`}
      action={
        withAccount.length > 0 ? (
          <RemindButton leaderIds={withAccount} />
        ) : undefined
      }
    >
      <ListSearch
        value={q}
        placeholder="Search leaders"
        onChange={(next) =>
          void navigate({ search: { q: next }, replace: true })
        }
      />
      {leaders.length === 0 ? (
        <Empty icon={Shield} title="No primary leaders found." />
      ) : (
        <Group>
          {leaders.map((l) => (
            <div
              key={l.id}
              className="flex min-h-15 min-w-0 items-center gap-3 px-3.5 py-2"
            >
              <Link
                to="/disciples/$discipleId"
                params={{ discipleId: l.id }}
                className="flex min-w-0 flex-1 flex-col"
              >
                <span className="truncate text-[15px] font-medium">
                  {l.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {l.disciples ?? 0} disciples · {l.email ?? 'no sign-in yet'}
                </span>
                <RowChevron />
              </Link>
              {l.userAccountId ? (
                <PendingButton
                  variant="ghost"
                  size="sm"
                  icon={Unlink}
                  onClick={async () => {
                    try {
                      await unlinkLeaderAccount({ data: { leaderId: l.id } })
                      toast.success('Account unlinked')
                      await router.invalidate()
                    } catch (e) {
                      toast.error(messageOf(e))
                    }
                  }}
                >
                  <span className="max-sm:sr-only">Unlink</span>
                </PendingButton>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setLinking({ id: l.id, name: l.name })}
                >
                  <Link2 aria-hidden="true" />{' '}
                  <span className="max-sm:sr-only">Link account</span>
                </Button>
              )}
              {!l.isActive && <Pill tone="short">Inactive</Pill>}
            </div>
          ))}
        </Group>
      )}
      <LinkDialog leader={linking} onClose={() => setLinking(null)} />
    </Page>
  )
}

function LinkDialog({
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
