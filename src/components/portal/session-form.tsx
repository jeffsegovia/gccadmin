import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from 'cn'
import { CheckMark } from '@/components/check-mark'
import { ChipChoice, FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import { DialogActions } from '@/components/responsive-dialog'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GENDER, MEMBER_TYPE, options } from '@/lib/labels'
import { toLocalInput } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import type { NewBelieverInput } from '@/lib/soul-winning/schema'

type Kind = 'SOUL_WINNING' | 'CONSOLIDATION'
export type SessionValues = {
  kind: Kind
  venue: string
  date: string
  lessonId: string
  newBelievers: Array<NewBelieverInput>
  newBelieverIds: Array<string>
}

const blank = (): NewBelieverInput => ({
  name: '',
  gender: 'MALE',
  memberType: 'UNCATEGORIZED',
  contactNo: '',
})

/** A soul-winning session (the new believers won) or a consolidation (the
 * believers they handle), from a disciple's own page. */
export function PortalSessionForm({
  kind,
  lessons,
  believers,
  onSubmit,
  onCancel,
}: {
  kind: Kind
  lessons: ReadonlyArray<{ id: string; title: string; seriesTitle: string }>
  believers: ReadonlyArray<{ id: string; name: string }>
  onSubmit: (values: SessionValues) => Promise<void>
  onCancel: () => void
}) {
  const [venue, setVenue] = useState('')
  const [date, setDate] = useState(toLocalInput(new Date()))
  const [lessonId, setLessonId] = useState('')
  const [souls, setSouls] = useState<Array<NewBelieverInput>>([blank()])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const won = kind === 'SOUL_WINNING'

  return (
    <form
      noValidate
      className="flex min-w-0 flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const named = souls.filter((s) => s.name.trim())
        const problem = !venue.trim()
          ? 'Where was it?'
          : !lessonId
            ? 'Choose the lesson'
            : won && named.length === 0
              ? 'Add at least one new believer'
              : !won && picked.size === 0
                ? 'Tick at least one believer'
                : null
        if (problem) return setError(problem)
        setError(null)
        setPending(true)
        try {
          await onSubmit({
            kind,
            venue,
            date,
            lessonId,
            newBelievers: won ? named : [],
            newBelieverIds: won ? [] : [...picked],
          })
        } catch (err) {
          setError(messageOf(err))
        } finally {
          setPending(false)
        }
      }}
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <FormField label="Date & time" htmlFor="ps-date">
          <Input
            id="ps-date"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>
        <FormField label="Venue" htmlFor="ps-venue">
          <Input
            id="ps-venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="GCC Chapel"
          />
        </FormField>
      </div>
      <FormField label="Lesson">
        <PersonCombobox
          aria-label="Lesson"
          people={lessons.map((l) => ({
            id: l.id,
            name: l.title,
            hint: l.seriesTitle,
          }))}
          value={lessonId}
          onChange={setLessonId}
          placeholder="Select lesson"
          searchPlaceholder="Search lessons"
          emptyText="No lesson by that name."
        />
      </FormField>

      {won ? (
        <section aria-label="New believers" className="flex flex-col gap-3">
          <span className="text-[13px] font-medium">
            New believers · {souls.filter((s) => s.name.trim()).length}
          </span>
          {souls.map((s, i) => (
            <div
              key={i}
              className="flex min-w-0 flex-col gap-3 rounded-xl border p-3"
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
                options={options(MEMBER_TYPE).filter(
                  (o) => o.value !== 'UNCATEGORIZED',
                )}
              />
              <Input
                aria-label={`Contact No. ${i + 1}`}
                type="tel"
                inputMode="tel"
                placeholder="Contact No. (optional)"
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
        <section aria-label="Believers" className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">
            Who was there · {picked.size}
          </span>
          {believers.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              You don’t handle any new believers yet. Record a soul-winning
              session first.
            </p>
          ) : (
            <div className="flex max-h-[22rem] flex-col overflow-y-auto rounded-xl border [&>*+*]:border-t">
              {believers.map((b) => {
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
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <SubmitButton size="lg" pending={pending}>
          Send report
        </SubmitButton>
      </DialogActions>
    </form>
  )
}
