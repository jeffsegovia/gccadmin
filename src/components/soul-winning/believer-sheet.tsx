import { CheckMark } from '@/components/check-mark'
import { DateTile } from '@/components/date-tile'
import { RowChevron, rowClass } from '@/components/ui/list'
import { useEffect, useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { ChipChoice, FormField } from '@/components/form-field'
import { PendingButton } from '@/components/pending-button'
import { PersonCombobox } from '@/components/person-combobox'
import { SubmitButton } from '@/components/submit-button'
import { Pill } from '@/components/status-pill'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { GENDER, MEMBER_TYPE, SOUL_WINNING_TYPE, options } from '@/lib/labels'
import { shortDate } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import { newBelieverSchema } from '@/lib/soul-winning/schema'
import type { NewBelieverInput } from '@/lib/soul-winning/schema'
import {
  deleteNewBeliever,
  getNewBeliever,
  updateNewBeliever,
} from '@/server/soul-winning/soul-winning.functions'

type Believer = Awaited<ReturnType<typeof getNewBeliever>>

/** A new believer: the lessons they've taken (v2's tracking), the sessions
 * they were at, and Edit, Delete and Make disciple. */
export function BelieverSheet({
  id,
  onClose,
}: {
  id: string | null
  onClose: () => void
}) {
  const router = useRouter()
  const [b, setB] = useState<Believer | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view')

  useEffect(() => {
    setB(null)
    setMode('view')
    if (!id) return
    let live = true
    getNewBeliever({ data: { id } })
      .then((r) => live && setB(r))
      .catch((e: unknown) => {
        toast.error(messageOf(e))
        onClose()
      })
    return () => {
      live = false
    }
  }, [id, onClose])

  const groups = b
    ? (['soul-winning', 'consolidation'] as const)
        .map((kind) => ({
          kind,
          title: kind === 'soul-winning' ? 'Soul winning' : 'Consolidation',
          lessons: b.lessons.filter((l) => l.kind === kind),
        }))
        .filter((g) => g.lessons.length > 0)
    : []
  const done = b ? b.lessons.filter((l) => l.takenOn).length : 0

  return (
    <ResponsiveDialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {mode === 'edit'
              ? 'Edit new believer'
              : (b?.name ?? 'New believer')}
          </ResponsiveDialogTitle>
          {b && mode === 'view' && (
            <ResponsiveDialogDescription>
              {MEMBER_TYPE[b.memberType]} · won {shortDate(b.createdAt)}
              {b.handledByName
                ? ` · handled by ${b.handledByName}`
                : b.leaderName
                  ? ` · ${b.leaderName}’s network`
                  : ''}
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>
        {!b ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-48" />
          </div>
        ) : mode === 'edit' ? (
          <EditBeliever
            b={b}
            onCancel={() => setMode('view')}
            onSaved={async () => {
              setB(await getNewBeliever({ data: { id: b.id } }))
              setMode('view')
              await router.invalidate()
            }}
          />
        ) : mode === 'delete' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              {b.name} is removed from every session they were part of. This
              can’t be undone.
            </p>
            <DialogActions>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setMode('view')}
              >
                Keep
              </Button>
              <PendingButton
                variant="destructive"
                size="lg"
                icon={Trash2}
                pendingLabel="Deleting…"
                onClick={async () => {
                  try {
                    await deleteNewBeliever({ data: { id: b.id } })
                    toast.success(`${b.name} deleted`)
                    onClose()
                    await router.invalidate()
                  } catch (e) {
                    toast.error(messageOf(e))
                  }
                }}
              >
                Delete
              </PendingButton>
            </DialogActions>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-5">
            <section aria-label="Lessons" className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[13px] font-medium">Lessons taken</h3>
                <span className="numeric text-[13px] text-muted-foreground">
                  {done} of {b.lessons.length}
                </span>
              </div>
              {b.lessons.length === 0 ? (
                <p className="border border-dashed px-3 py-4 text-sm text-muted-foreground rounded-xl">
                  No Soul-Winning or Consolidation lesson series in Lessons yet.
                </p>
              ) : (
                groups.map((g) => (
                  <div key={g.kind} className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {g.title}
                    </span>
                    <ul className="flex flex-col overflow-hidden rounded-xl bg-muted/40 [&>*+*]:border-t">
                      {g.lessons.map((l) => (
                        <li
                          key={l.id}
                          className="flex min-h-11 min-w-0 items-center gap-3 px-3.5 py-2 text-sm"
                        >
                          <CheckMark on={!!l.takenOn} />
                          <span className="min-w-0 flex-1 break-words">
                            {l.title}
                          </span>
                          <span
                            className={cn(
                              'shrink-0 text-xs',
                              l.takenOn
                                ? 'text-muted-foreground'
                                : 'text-caution',
                            )}
                          >
                            {l.takenOn ? shortDate(l.takenOn) : 'Not yet'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>

            {b.sessions.length > 0 && (
              <section aria-label="Sessions" className="flex flex-col gap-1.5">
                <h3 className="text-[13px] font-medium">Sessions</h3>
                <ul className="flex flex-col overflow-hidden rounded-xl bg-muted/40 [&>*+*]:border-t">
                  {b.sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex min-h-13 min-w-0 items-center gap-3 px-3.5 py-2 text-sm"
                    >
                      <DateTile date={s.date} instant />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{s.venue}</span>
                        {s.lessonTitle && (
                          <span className="truncate text-xs text-muted-foreground">
                            {s.lessonTitle}
                          </span>
                        )}
                      </span>
                      <Pill
                        tone={s.type === 'SOUL_WINNING' ? 'covered' : 'men'}
                      >
                        {SOUL_WINNING_TYPE[s.type]}
                      </Pill>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(b.contactNo || b.email || b.address) && (
              <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-0 overflow-hidden rounded-xl bg-muted/40 px-3.5 text-sm [&>dd]:py-2.5 [&>dt]:py-2.5">
                {b.contactNo && (
                  <>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="min-w-0 break-words">{b.contactNo}</dd>
                  </>
                )}
                {b.email && (
                  <>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="min-w-0 break-words">{b.email}</dd>
                  </>
                )}
                {b.address && (
                  <>
                    <dt className="text-muted-foreground">Address</dt>
                    <dd className="min-w-0 break-words">{b.address}</dd>
                  </>
                )}
              </dl>
            )}

            {b.discipleProfileId ? (
              <Link
                to="/disciples/$discipleId"
                params={{ discipleId: b.discipleProfileId }}
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                Open their disciple record
              </Link>
            ) : b.complete ? (
              <Link
                to="/disciples/new"
                search={{ fromBeliever: b.id }}
                className={buttonVariants({ size: 'lg' })}
              >
                <UserPlus aria-hidden="true" /> Make a disciple
              </Link>
            ) : (
              <p className="border border-caution/30 bg-caution/10 px-3 py-2 text-[13px] rounded-lg">
                {b.name.split(' ')[0]} can become a disciple once every
                soul-winning and consolidation lesson is taken:{' '}
                {b.lessons.length - done} to go.
              </p>
            )}

            {/* The rest as rows (as in Osamu), not a pair of buttons. */}
            <div className="flex flex-col overflow-hidden rounded-xl bg-muted/40 [&>*+*]:border-t">
              <button
                type="button"
                className={rowClass}
                onClick={() => setMode('edit')}
              >
                <Pencil
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                <span className="flex-1 text-sm font-medium">Edit details</span>
                <RowChevron />
              </button>
              <button
                type="button"
                className={rowClass}
                onClick={() => setMode('delete')}
              >
                <Trash2 aria-hidden="true" className="size-4 text-short" />
                <span className="flex-1 text-sm font-medium text-short">
                  Delete
                </span>
              </button>
            </div>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

const GROUPS = options(MEMBER_TYPE)

function EditBeliever({
  b,
  onCancel,
  onSaved,
}: {
  b: Believer
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const [v, setV] = useState<NewBelieverInput>({
    name: b.name,
    gender: b.gender,
    memberType: b.memberType,
    contactNo: b.contactNo ?? '',
    email: b.email ?? '',
    address: b.address ?? '',
  })
  const [handledById, setHandledById] = useState(b.handledById ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const parsed = newBelieverSchema.safeParse(v)
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? 'Check the form')
          return
        }
        setError(null)
        setPending(true)
        try {
          await updateNewBeliever({
            data: {
              ...parsed.data,
              id: b.id,
              handledById: handledById || null,
            },
          })
          toast.success('Saved')
          await onSaved()
        } catch (err) {
          toast.error(messageOf(err))
        } finally {
          setPending(false)
        }
      }}
    >
      <FormField label="Name" htmlFor="nb-name">
        <Input
          id="nb-name"
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </FormField>
      <ChipChoice
        label="Gender"
        value={v.gender}
        onChange={(gender) => setV({ ...v, gender })}
        options={options(GENDER)}
      />
      <ChipChoice
        label="Member Type"
        value={v.memberType}
        onChange={(memberType) => setV({ ...v, memberType })}
        options={GROUPS}
      />
      <FormField label="Who handles this new believer?" optional>
        <PersonCombobox
          aria-label="Handled By"
          people={b.handlers}
          value={handledById}
          onChange={setHandledById}
          noneLabel="Their network leader"
          placeholder={
            b.handlers.length === 0
              ? 'No qualified option'
              : 'Select Handled By'
          }
        />
      </FormField>
      <FormField label="Phone" htmlFor="nb-phone" optional>
        <Input
          id="nb-phone"
          type="tel"
          inputMode="tel"
          value={v.contactNo ?? ''}
          onChange={(e) => setV({ ...v, contactNo: e.target.value })}
        />
      </FormField>
      <FormField label="Email" htmlFor="nb-email" optional>
        <Input
          id="nb-email"
          type="email"
          value={v.email ?? ''}
          onChange={(e) => setV({ ...v, email: e.target.value })}
        />
      </FormField>
      <FormField label="Address" htmlFor="nb-address" optional>
        <Input
          id="nb-address"
          value={v.address ?? ''}
          onChange={(e) => setV({ ...v, address: e.target.value })}
        />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogActions>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <SubmitButton size="lg" pending={pending}>
          Save
        </SubmitButton>
      </DialogActions>
    </form>
  )
}
