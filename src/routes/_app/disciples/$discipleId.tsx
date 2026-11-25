import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Ellipsis,
  Link2,
  Pencil,
  Phone,
  Power,
  Trash2,
  Unlink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/shell/page'
import { ChurchStatusPill, KindPill, Pill } from '@/components/status-pill'
import { PortalSheet } from '@/components/disciples/portal-sheet'
import { GrowthBar, Weeks } from '@/components/disciples/progress'
import { DiscipleForm } from '@/components/disciples/disciple-form'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  DialogActions,
  ResponsiveDialogDescription,
} from '@/components/responsive-dialog'
import { PersonCombobox } from '@/components/person-combobox'
import { PendingButton } from '@/components/pending-button'
import { FormField } from '@/components/form-field'
import { LinkAccountDialog } from '@/components/leaders/link-account-dialog'
import { UnderlineTabs } from '@/components/ui/underline-tabs'
import { Button, buttonVariants } from '@/components/ui/button'
import { Group, RowChevron } from '@/components/ui/list'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  CELL_STATUS,
  GENDER,
  MEMBER_TYPE,
  PROCESS_LEVEL,
  PROCESS_STATUS,
} from '@/lib/labels'
import { ageOn, dateToDay, longDay, shortDate } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import {
  deleteDisciple,
  demoteFromPrimary,
  getDiscipleDetail,
  getDiscipleFormOptions,
  promoteToPrimary,
  setDiscipleActive,
  updateDisciple,
} from '@/server/disciples/disciples.functions'
import { unlinkLeaderAccount } from '@/server/admin/admin.functions'

export const Route = createFileRoute('/_app/disciples/$discipleId')({
  loader: ({ params }) =>
    getDiscipleDetail({ data: { id: params.discipleId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.disciple.name ?? 'Disciple'} · GCC Admin` }],
  }),
  component: DisciplePage,
})

type Tab = 'cell' | 'details' | 'lessons' | 'disciples'

function DisciplePage() {
  const data = Route.useLoaderData()
  const d = data.disciple
  const router = useRouter()
  const navigate = useNavigate()
  // v2 opened a disciple on Details.
  const [tab, setTab] = useState<Tab>('details')
  const [sharing, setSharing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [demoting, setDemoting] = useState(false)
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  const run = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work()
      toast.success(done)
      await router.invalidate()
    } catch (error) {
      toast.error(messageOf(error))
    }
  }

  // v2's tabs, in its order.
  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'details', label: 'Details' },
    { value: 'lessons', label: 'Lessons Taken' },
    { value: 'cell', label: 'Cell Groups' },
    { value: 'disciples', label: 'Handled Disciples' },
  ]

  return (
    <Page
      back={{ to: '/disciples', label: 'Disciples' }}
      title={
        <span className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 break-words">{d.name}</span>
        </span>
      }
      action={
        data.canEdit && (
          <>
            {!d.isPrimary && d.isActive && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setSharing(true)}
              >
                <Link2 aria-hidden="true" /> Portal link
              </Button>
            )}
            {d.contactNo && (
              <a
                href={`tel:${d.contactNo}`}
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                <Phone aria-hidden="true" /> Call
              </a>
            )}
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden="true" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="secondary"
                    size="icon-lg"
                    aria-label="More actions"
                  >
                    <Ellipsis aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() =>
                    void run(
                      () =>
                        setDiscipleActive({
                          data: { id: d.id, isActive: !d.isActive },
                        }),
                      d.isActive ? 'Marked inactive' : 'Marked active',
                    )
                  }
                >
                  <Power /> {d.isActive ? 'Mark inactive' : 'Mark active'}
                </DropdownMenuItem>
                {data.canPromote &&
                  (d.isPrimary ? (
                    <DropdownMenuItem onClick={() => setDemoting(true)}>
                      <ArrowDownToLine /> Remove as primary leader
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() =>
                        void run(
                          () => promoteToPrimary({ data: { id: d.id } }),
                          `${d.name} is now a primary leader`,
                        )
                      }
                    >
                      <ArrowUpToLine /> Make primary leader
                    </DropdownMenuItem>
                  ))}
                {/* A primary leader's sign-in, kept off the Leaders list. */}
                {data.canPromote &&
                  d.isPrimary &&
                  (d.userAccountId ? (
                    <DropdownMenuItem onClick={() => setUnlinking(true)}>
                      <Unlink /> Unlink account
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setLinking(true)}>
                      <Link2 /> Link account
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )
      }
    >
      <div className="-mt-2 flex flex-wrap gap-1.5">
        <ChurchStatusPill status={d.churchStatus} />
        <Pill>{MEMBER_TYPE[d.memberType]}</Pill>
        {d.isPrimary && <Pill tone="primary">Primary leader</Pill>}
        {d.isMyPrimary && !d.isPrimary && (
          <Pill tone="primary">Assistant leader</Pill>
        )}
        {!d.isActive && <Pill tone="short">Inactive</Pill>}
        {data.portal?.isEnabled && <Pill tone="covered">Portal on</Pill>}
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <GrowthBar level={d.processLevel} status={d.processLevelStatus} />
          <UnderlineTabs
            label="Sections"
            value={tab}
            onChange={setTab}
            options={tabs}
          />

          {tab === 'cell' && (
            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-3 border bg-card p-4 dark:border-transparent rounded-xl">
                <h2 className="text-[13px] font-medium text-muted-foreground">
                  Last 12 weeks
                </h2>
                <Weeks label="Cell group" weeks={data.history.cellWeeks} />
                <Weeks label="Sundays" weeks={data.history.sundays} />
              </div>
              <section className="flex min-w-0 flex-col gap-2">
                <h2 className="px-0.5 text-[13px] font-medium text-muted-foreground">
                  Cell groups · {data.cellGroupTotal}
                </h2>
                {data.recent.length === 0 ? (
                  <p className="border border-dashed px-4 py-6 text-center text-sm text-muted-foreground rounded-xl">
                    No cell groups yet.
                  </p>
                ) : (
                  <Group>
                    {data.recent.map((r) => (
                      <Link
                        key={r.id}
                        to="/reports/$reportId"
                        params={{ reportId: r.id }}
                        className="flex min-h-14 min-w-0 items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
                      >
                        <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground uppercase">
                          {shortDate(r.date)}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[15px] font-medium">
                            {r.lessonTitle ?? r.customTitle ?? 'Cell group'}
                          </span>
                          <span className="flex min-w-0 items-center gap-1.5">
                            <KindPill kind={r.type} />
                            <span className="truncate text-xs text-muted-foreground">
                              {r.leaderName ? `led by ${r.leaderName}` : ''}
                            </span>
                          </span>
                        </span>
                        <RowChevron />
                      </Link>
                    ))}
                  </Group>
                )}
              </section>
            </div>
          )}

          {tab === 'details' && (
            <dl className="grid min-w-0 grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-4 gap-y-3 border bg-card p-4 text-sm dark:border-transparent rounded-xl">
              {[
                ['Gender', GENDER[d.gender]],
                [
                  'Birthdate',
                  `${longDay(d.birthdate)} (${ageOn(d.birthdate)})`,
                ],
                ['Phone', d.contactNo || '—'],
                ['Address', d.address || '—'],
                ['Network', d.leaderName ?? '—'],
                ['Handled By', d.handledByName ?? d.leaderName ?? '—'],
                ['Cell Status', CELL_STATUS[d.cellStatus]],
                [
                  'Process Level',
                  `${PROCESS_LEVEL[d.processLevel]} · ${PROCESS_STATUS[d.processLevelStatus]}`,
                ],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab === 'lessons' &&
            (data.lessonsTaken.length === 0 ? (
              <p className="border border-dashed px-4 py-6 text-center text-sm text-muted-foreground rounded-xl">
                No lessons yet.
              </p>
            ) : (
              <Group>
                {data.lessonsTaken.map((l) => (
                  <div
                    key={l.title}
                    className="flex min-h-12 min-w-0 items-center gap-3 px-3.5 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {l.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {shortDate(l.date)}
                    </span>
                  </div>
                ))}
              </Group>
            ))}

          {tab === 'disciples' && data.handled.length === 0 && (
            <p className="border border-dashed px-4 py-8 text-center text-sm text-muted-foreground rounded-xl">
              No disciples being handled yet.
            </p>
          )}
          {tab === 'disciples' && data.handled.length > 0 && (
            <Group>
              {data.handled.map((h) => (
                <Link
                  key={h.id}
                  to="/disciples/$discipleId"
                  params={{ discipleId: h.id }}
                  className="flex min-h-14 min-w-0 items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{h.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {MEMBER_TYPE[h.memberType]} ·{' '}
                      {PROCESS_LEVEL[h.processLevel]}
                    </span>
                  </span>
                  <ChurchStatusPill status={h.churchStatus} />
                  <RowChevron />
                </Link>
              ))}
            </Group>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-3 border bg-card p-4 text-sm dark:border-transparent max-lg:hidden rounded-xl">
          <h2 className="text-[13px] font-medium text-muted-foreground">
            Leader
          </h2>
          <span className="font-medium">
            {d.handledByName ?? d.leaderName ?? '—'}
          </span>
          {d.handledByName && d.leaderName && (
            <span className="text-xs text-muted-foreground">
              Network of {d.leaderName}
            </span>
          )}
          <h2 className="pt-2 text-[13px] font-medium text-muted-foreground">
            Portal
          </h2>
          <span className="text-xs text-muted-foreground">
            {d.isPrimary
              ? 'Primary leaders sign in instead.'
              : data.portal?.isEnabled
                ? data.portal.lastOpenedAt
                  ? `On · last opened ${shortDate(data.portal.lastOpenedAt)}`
                  : 'On · not opened yet'
                : 'Not shared yet.'}
          </span>
        </aside>
      </div>

      {!d.isPrimary && (
        <PortalSheet
          open={sharing}
          onOpenChange={setSharing}
          disciple={{ id: d.id, name: d.name }}
          lastOpenedAt={data.portal?.lastOpenedAt ?? null}
        />
      )}

      <ResponsiveDialog open={editing} onOpenChange={setEditing}>
        <ResponsiveDialogContent className="sm:max-w-2xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Edit {d.name}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          {editing && (
            <DiscipleForm
              isPrimary={d.isPrimary}
              initial={{
                name: d.name,
                address: d.address,
                birthdate: dateToDay(d.birthdate),
                gender: d.gender,
                contactNo: d.contactNo ?? '',
                memberType: d.memberType,
                cellStatus: d.cellStatus,
                churchStatus: d.churchStatus,
                processLevel: d.processLevel,
                processLevelStatus: d.processLevelStatus,
                isMyPrimary: d.isMyPrimary,
                handledById: d.handledById ?? '',
                leaderId: d.leaderId ?? '',
              }}
              submitLabel="Save"
              onCancel={() => setEditing(false)}
              onSubmit={async (values) => {
                await updateDisciple({ data: { ...values, id: d.id } })
                toast.success('Saved')
                setEditing(false)
                await router.invalidate()
              }}
            />
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <DemoteDialog open={demoting} onOpenChange={setDemoting} disciple={d} />

      <LinkAccountDialog
        leader={linking ? { id: d.id, name: d.name } : null}
        onClose={() => setLinking(false)}
      />

      <AlertDialog open={unlinking} onOpenChange={setUnlinking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink {d.name}’s account?</AlertDialogTitle>
            <AlertDialogDescription>
              They can’t sign in until their account is linked again. Their
              disciples and reports stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <PendingButton
              variant="destructive"
              icon={Unlink}
              pendingLabel="Unlinking…"
              onClick={async () => {
                await run(
                  () => unlinkLeaderAccount({ data: { leaderId: d.id } }),
                  'Account unlinked',
                )
                setUnlinking(false)
              }}
            >
              Unlink
            </PendingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {d.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They leave the lists and attendance sheets, and their portal link
              stops working. Past cell groups keep their name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteDisciple({ data: { id: d.id } })
                  toast.success(`${d.name} deleted`)
                  await navigate({ to: '/disciples' })
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

function DemoteDialog({
  open,
  onOpenChange,
  disciple,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  disciple: { id: string; name: string }
}) {
  const router = useRouter()
  const [leaders, setLeaders] = useState<Array<{ id: string; name: string }>>(
    [],
  )
  const [leaderId, setLeaderId] = useState('')
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        if (o)
          void getDiscipleFormOptions({ data: {} }).then((r) =>
            setLeaders(r.leaders.filter((l) => l.id !== disciple.id)),
          )
        onOpenChange(o)
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Remove as primary leader
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {disciple.name} and the disciples they handle join another network.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-4">
          <FormField label="New network leader">
            <PersonCombobox
              aria-label="New network leader"
              people={leaders}
              value={leaderId}
              onChange={setLeaderId}
              placeholder="Choose a leader"
            />
          </FormField>
          <DialogActions>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <PendingButton
              size="lg"
              disabled={!leaderId}
              onClick={async () => {
                try {
                  await demoteFromPrimary({
                    data: { id: disciple.id, newLeaderId: leaderId },
                  })
                  toast.success(`${disciple.name} moved`)
                  onOpenChange(false)
                  await router.invalidate()
                } catch (error) {
                  toast.error(messageOf(error))
                }
              }}
            >
              Move
            </PendingButton>
          </DialogActions>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
