import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, X, HeartHandshake, Sprout } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { cn } from 'cn'
import { CheckMark } from '@/components/check-mark'
import { Page } from '@/components/shell/page'
import { ChipChoice, FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import { DialogActions } from '@/components/responsive-dialog'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioCards } from '@/components/radio-cards'
import {
  consolidationSchema,
  soulWinningSchema,
} from '@/lib/soul-winning/schema'
import type { NewBelieverInput } from '@/lib/soul-winning/schema'
import { GENDER, MEMBER_TYPE, options } from '@/lib/labels'
import { toLocalInput } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import {
  createConsolidation,
  createSoulWinning,
  getSoulWinningFormOptions,
} from '@/server/soul-winning/soul-winning.functions'

export const Route = createFileRoute('/_app/soul-winning/new')({
  validateSearch: z.object({
    type: z.enum(['SOUL_WINNING', 'CONSOLIDATION']).optional(),
  }),
  loader: () => getSoulWinningFormOptions({ data: {} }),
  head: () => ({ meta: [{ title: 'New soul-winning session · GCC Admin' }] }),
  component: NewSessionPage,
})

const GROUPS = options(MEMBER_TYPE).filter((o) => o.value !== 'UNCATEGORIZED')
const blank = (): NewBelieverInput => ({
  name: '',
  gender: 'MALE',
  memberType: 'UNCATEGORIZED',
  contactNo: '',
})

function NewSessionPage() {
  const initial = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [opts, setOpts] = useState(initial)
  const [type, setType] = useState(search.type ?? 'SOUL_WINNING')
  const [leaderId, setLeaderId] = useState(initial.leaderId ?? '')
  const [venue, setVenue] = useState('')
  const [date, setDate] = useState(toLocalInput(new Date()))
  const [lessonId, setLessonId] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [souls, setSouls] = useState<Array<NewBelieverInput>>([blank()])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const lessonPeople = opts.lessons.map((l) => ({
    id: l.id,
    name: l.title,
    hint: l.seriesTitle,
  }))

  return (
    <Page
      title={
        type === 'SOUL_WINNING'
          ? 'New soul-winning session'
          : 'New consolidation'
      }
      back={{ to: '/soul-winning', label: 'Soul winning' }}
      className="max-w-3xl pb-0 md:pb-12"
    >
      <form
        noValidate
        className="flex flex-col gap-5 md:rounded-xl md:border md:bg-card md:p-6 md:dark:border-transparent"
        onSubmit={async (e) => {
          e.preventDefault()
          const base = {
            venue,
            date,
            lessonId,
            networkLeaderId: leaderId || undefined,
            assistantLeaderId: assistantId || undefined,
          }
          const parsed =
            type === 'SOUL_WINNING'
              ? soulWinningSchema.safeParse({
                  ...base,
                  newBelievers: souls.filter((s) => s.name.trim()),
                })
              : consolidationSchema.safeParse({
                  ...base,
                  newBelieverIds: [...picked],
                })
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Check the form')
            return
          }
          setError(null)
          setPending(true)
          try {
            if (type === 'SOUL_WINNING')
              await createSoulWinning({ data: parsed.data as never })
            else await createConsolidation({ data: parsed.data as never })
            toast.success('Session saved')
            await navigate({ to: '/soul-winning' })
          } catch (err) {
            toast.error(messageOf(err))
          } finally {
            setPending(false)
          }
        }}
      >
        <RadioCards
          label="Kind"
          value={type}
          onChange={setType}
          options={[
            {
              value: 'SOUL_WINNING',
              label: 'Soul winning',
              hint: 'New believers won',
              icon: Sprout,
            },
            {
              value: 'CONSOLIDATION',
              label: 'Consolidation',
              hint: 'Following up believers',
              icon: HeartHandshake,
            },
          ]}
        />
        {opts.chooseLeader && (
          <FormField label="Network leader">
            <PersonCombobox
              aria-label="Network leader"
              people={opts.leaders}
              value={leaderId}
              onChange={async (id) => {
                setLeaderId(id)
                setAssistantId('')
                setPicked(new Set())
                setOpts(
                  await getSoulWinningFormOptions({ data: { leaderId: id } }),
                )
              }}
              placeholder="Choose a leader"
            />
          </FormField>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Date and time" htmlFor="sw-date">
            <Input
              id="sw-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormField>
          <FormField label="Venue" htmlFor="sw-venue">
            <Input
              id="sw-venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Plaza Rizal"
            />
          </FormField>
        </div>
        <FormField label="Lesson">
          <PersonCombobox
            aria-label="Lesson"
            people={lessonPeople}
            value={lessonId}
            onChange={setLessonId}
            placeholder="Select lesson"
            searchPlaceholder="Search lessons"
            emptyText="No lesson by that name."
          />
        </FormField>
        <FormField label="Assistant leader" optional>
          <PersonCombobox
            aria-label="Assistant leader"
            people={opts.assistants}
            value={assistantId}
            onChange={setAssistantId}
            noneLabel="Nobody"
            placeholder="Nobody"
          />
        </FormField>

        {type === 'SOUL_WINNING' ? (
          <section aria-label="New believers" className="flex flex-col gap-3">
            <span className="text-[13px] font-medium">
              New believers · {souls.filter((s) => s.name.trim()).length}
            </span>
            {souls.map((s, i) => (
              <div
                key={i}
                className="flex min-w-0 flex-col gap-3 border p-3 rounded-lg"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Input
                    aria-label={`Name ${i + 1}`}
                    placeholder="Name"
                    value={s.name}
                    onChange={(e) =>
                      setSouls(
                        souls.map((x, j) =>
                          j === i ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  {souls.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      aria-label="Remove"
                      onClick={() => setSouls(souls.filter((_, j) => j !== i))}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <ChipChoice
                  label="Gender"
                  value={s.gender}
                  onChange={(g) =>
                    setSouls(
                      souls.map((x, j) => (j === i ? { ...x, gender: g } : x)),
                    )
                  }
                  options={options(GENDER)}
                />
                <ChipChoice
                  label="Member Type"
                  value={s.memberType === 'UNCATEGORIZED' ? null : s.memberType}
                  onChange={(t) =>
                    setSouls(
                      souls.map((x, j) =>
                        j === i ? { ...x, memberType: t } : x,
                      ),
                    )
                  }
                  options={GROUPS}
                />
                <Input
                  aria-label={`Phone ${i + 1}`}
                  type="tel"
                  inputMode="tel"
                  placeholder="Phone (optional)"
                  value={s.contactNo ?? ''}
                  onChange={(e) =>
                    setSouls(
                      souls.map((x, j) =>
                        j === i ? { ...x, contactNo: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setSouls([...souls, blank()])}
            >
              <Plus aria-hidden="true" /> Another believer
            </Button>
          </section>
        ) : (
          <section
            aria-label="Believers followed up"
            className="flex flex-col gap-2"
          >
            <span className="text-[13px] font-medium">
              Who was there · {picked.size}
            </span>
            {opts.believers.length === 0 ? (
              <p className="border border-dashed px-4 py-6 text-center text-sm text-muted-foreground rounded-xl">
                No new believers in this network yet.
              </p>
            ) : (
              <div className="flex max-h-[24rem] flex-col overflow-y-auto border [&>*+*]:border-t rounded-lg">
                {opts.believers.map((b) => {
                  const on = picked.has(b.id)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => {
                        const next = new Set(picked)
                        if (on) next.delete(b.id)
                        else next.add(b.id)
                        setPicked(next)
                      }}
                      className={cn(
                        'flex min-h-12 min-w-0 items-center gap-3 px-3 text-left',
                        on && 'bg-covered/8',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {b.name}
                      </span>
                      <CheckMark on={on} />
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}
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
            onClick={() => void navigate({ to: '/soul-winning' })}
          >
            Cancel
          </Button>
          <SubmitButton size="lg" pending={pending}>
            Save session
          </SubmitButton>
        </DialogActions>
      </form>
    </Page>
  )
}
