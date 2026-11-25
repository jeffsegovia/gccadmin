import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Empty, Page } from '@/components/shell/page'
import { ListSearch } from '@/components/list-search'
import { Pill } from '@/components/status-pill'
import { UserAvatar } from '@/components/shell/user-menu'
import { ChipChoice } from '@/components/form-field'
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
import { Group } from '@/components/ui/list'
import { Switch } from '@/components/ui/switch'
import { messageOf } from '@/lib/errors'
import { timeAgo } from '@/lib/dates'
import { getAccounts, setAccountRole } from '@/server/admin/admin.functions'
import type { AccountRow } from '@/server/admin/admin.functions'

export const Route = createFileRoute('/_app/users')({
  validateSearch: z.object({ q: z.string().optional() }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getAccounts({ data: deps }),
  head: () => ({ meta: [{ title: 'Users · GCC Admin' }] }),
  component: UsersPage,
})

type RoleChoice = 'admin' | 'leader' | 'none'

function UsersPage() {
  const accounts = Route.useLoaderData()
  const { q } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [editing, setEditing] = useState<AccountRow | null>(null)
  const waiting = accounts.filter((a) => !a.role)
  return (
    <Page
      title="Users"
      description={`${accounts.length} accounts${waiting.length ? ` · ${waiting.length} waiting for access` : ''}`}
    >
      <ListSearch
        value={q}
        placeholder="Search by name or email"
        onChange={(next) =>
          void navigate({ search: { q: next }, replace: true })
        }
      />
      {accounts.length === 0 ? (
        <Empty icon={UserCog} title="No accounts found." />
      ) : (
        <Group>
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setEditing(a)}
              className="flex min-h-15 w-full min-w-0 items-center gap-3 px-3.5 py-2 text-left hover:bg-muted/50"
            >
              <UserAvatar user={a} className="size-9" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium">
                  {a.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {a.email}
                  {a.disciple ? ` · ${a.disciple.name}` : ''}
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span
                    className={a.disciple ? 'text-covered' : 'text-caution'}
                  >
                    {a.disciple ? 'Account Linked' : 'Unregistered'}
                  </span>
                  <span
                    className={
                      a.emailVerified ? 'text-covered' : 'text-caution'
                    }
                  >
                    {a.emailVerified ? 'Verified' : 'Unverified'}
                  </span>
                  <span>
                    Last active {a.lastActiveAt ? timeAgo(a.lastActiveAt) : '—'}
                  </span>
                </span>
              </span>
              {a.pastor && <Pill tone="men">Pastor</Pill>}
              <Pill
                tone={
                  a.role === 'admin'
                    ? 'primary'
                    : a.role === 'leader'
                      ? 'covered'
                      : 'caution'
                }
              >
                {a.role === 'admin'
                  ? 'Admin'
                  : a.role === 'leader'
                    ? 'Leader'
                    : 'Unassigned'}
              </Pill>
            </button>
          ))}
        </Group>
      )}
      <RoleDialog account={editing} onClose={() => setEditing(null)} />
    </Page>
  )
}

function RoleDialog({
  account,
  onClose,
}: {
  account: AccountRow | null
  onClose: () => void
}) {
  const router = useRouter()
  const [role, setRole] = useState<RoleChoice>('none')
  const [pastor, setPastor] = useState(false)
  useEffect(() => {
    if (!account) return
    setRole(account.role ?? 'none')
    setPastor(account.pastor)
  }, [account])
  return (
    <ResponsiveDialog open={!!account} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{account?.name}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {account?.email}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-5">
          <ChipChoice
            label="Access"
            value={role}
            onChange={setRole}
            options={[
              { value: 'leader', label: 'Leader' },
              { value: 'admin', label: 'Admin' },
              { value: 'none', label: 'No access' },
            ]}
          />
          <label className="flex items-center gap-3">
            <Switch checked={pastor} onCheckedChange={setPastor} />
            <span className="flex flex-col">
              <span className="text-sm font-medium">Pastor</span>
              <span className="text-xs text-muted-foreground">
                Sees every network, like an admin, without the admin pages.
              </span>
            </span>
          </label>
          <DialogActions>
            <Button variant="secondary" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <PendingButton
              size="lg"
              onClick={async () => {
                try {
                  await setAccountRole({
                    data: {
                      clerkId: account!.id,
                      role: role === 'none' ? null : role,
                      pastor,
                    },
                  })
                  toast.success(
                    'Access saved. It applies the next time they open the app.',
                  )
                  onClose()
                  await router.invalidate()
                } catch (e) {
                  toast.error(messageOf(e))
                }
              }}
            >
              Save
            </PendingButton>
          </DialogActions>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
