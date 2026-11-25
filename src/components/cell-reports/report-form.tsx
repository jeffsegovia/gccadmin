import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  DoorOpen,
  Search,
  Sprout,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { CheckMark } from '@/components/check-mark'
import { FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import { SubmitButton } from '@/components/submit-button'
import { DialogActions } from '@/components/responsive-dialog'
import { RadioCards } from '@/components/radio-cards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cellReportSchema, splitList } from '@/lib/cell-reports/schema'
import type { CellReportInput } from '@/lib/cell-reports/schema'
import { CELL_STATUS, CELL_TYPE } from '@/lib/labels'
import { toLocalInput } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import type { CellStatus, CellType, Gender } from '@/db/schema'

export type ReportFormOptions = {
  lessons: ReadonlyArray<{ id: string; title: string; seriesTitle: string }>
  people: ReadonlyArray<{
    id: string
    name: string
    gender: Gender
    cellStatus: CellStatus
    isMyPrimary: boolean
  }>
  leaders: ReadonlyArray<{ id: string; name: string }>
  chooseLeader: boolean
  leaderId: string | null
  suggested: string | null
}

const DRAFT = 'gcc-report-draft:v1:'

/** The form in three short steps, so a phone never scrolls through all of
 * it at once: the details, what was taught, then the attendees. */
const STEPS = ['Details', 'Lesson', 'Attendees'] as const
const STEP_OF: Record<string, number> = {
  type: 0,
  leaderId: 0,
  date: 0,
  venue: 0,
  assistantId: 0,
  lessonId: 1,
  lessonTitle: 1,
  scriptureReferences: 1,
  worship: 1,
  work: 1,
  attendees: 2,
}
const LAST = STEPS.length - 1

function errorsOf(values: CellReportInput) {
  const parsed = cellReportSchema.safeParse(values)
  const found: Record<string, string> = {}
  if (!parsed.success)
    for (const i of parsed.error.issues) found[String(i.path[0])] ??= i.message
  return { parsed, found }
}

function StepBar({
  step,
  reached,
  onPick,
}: {
  step: number
  reached: number
  onPick: (step: number) => void
}) {
  return (
    <ol aria-label="Steps" className="grid grid-cols-3 gap-1.5">
      {STEPS.map((label, i) => {
        const can = i <= reached && i !== step
        return (
          <li key={label} className="min-w-0">
            <button
              type="button"
              disabled={!can}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => onPick(i)}
              className="flex w-full min-w-0 flex-col gap-1.5 text-left disabled:cursor-default"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-1 w-full',
                  i <= step ? 'bg-primary' : 'bg-foreground/12',
                )}
              />
              <span
                className={cn(
                  'truncate text-xs',
                  i === step
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground',
                  can && 'hover:text-foreground',
                )}
              >
                {i + 1}. {label}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function loadDraft(key: string): Partial<CellReportInput> | null {
  try {
    const raw = localStorage.getItem(DRAFT + key)
    return raw ? (JSON.parse(raw) as Partial<CellReportInput>) : null
  } catch {
    return null
  }
}

/** A cell group report. A new one keeps a draft on the device until it's
 * saved, so a dropped signal or a closed tab doesn't lose it. */
export function ReportForm({
  opts,
  initial,
  draftKey,
  fixedLeader,
  onLeaderChange,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  opts: ReportFormOptions
  initial?: CellReportInput
  /** New reports only: where the draft is kept. */
  draftKey?: string
  /** The portal: the network leader is theirs, shown and not chosen. */
  fixedLeader?: string
  onLeaderChange?: (leaderId: string) => void
  onSubmit: (values: CellReportInput) => Promise<void>
  onCancel?: () => void
  submitLabel: string
}) {
  const start: CellReportInput = initial ?? {
    type: 'DISCIPLESHIP',
    venue: '',
    date: toLocalInput(new Date()),
    lessonId: opts.suggested ?? undefined,
    attendees: [],
    leaderId: opts.leaderId ?? undefined,
  }
  const [v, setV] = useState<CellReportInput>(start)
  const [custom, setCustom] = useState(
    !!initial?.lessonTitle && !initial.lessonId,
  )
  const [scripture, setScripture] = useState(
    (start.scriptureReferences ?? []).join(', '),
  )
  const [worship, setWorship] = useState((start.worship ?? []).join(', '))
  const [work, setWork] = useState((start.work ?? []).join('\n'))
  const [query, setQuery] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  const [restored, setRestored] = useState(false)
  // An edit can jump to any step; a new report opens them in turn.
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(initial ? LAST : 0)
  const top = useRef<HTMLDivElement>(null)
  const go = (next: number) => {
    setStep(next)
    setReached((r) => Math.max(r, next))
    requestAnimationFrame(() =>
      top.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    )
  }

  useEffect(() => {
    if (!draftKey) return
    const draft = loadDraft(draftKey)
    if (!draft) return
    setV((cur) => ({ ...cur, ...draft }))
    if (draft.lessonTitle && !draft.lessonId) setCustom(true)
    setScripture((draft.scriptureReferences ?? []).join(', '))
    setWorship((draft.worship ?? []).join(', '))
    setWork((draft.work ?? []).join('\n'))
    setRestored(true)
  }, [draftKey])

  const values = useMemo<CellReportInput>(
    () => ({
      ...v,
      lessonId: custom ? undefined : v.lessonId,
      lessonTitle: custom ? v.lessonTitle : undefined,
      scriptureReferences: splitList(scripture),
      worship: splitList(worship),
      work: splitList(work),
    }),
    [v, custom, scripture, worship, work],
  )

  // Only a form someone has typed into is kept as a draft.
  const [pristine] = useState(() => JSON.stringify(start))
  useEffect(() => {
    if (!draftKey) return
    try {
      if (
        JSON.stringify({ ...v, lessonTitle: v.lessonTitle }) === pristine &&
        !scripture &&
        !worship &&
        !work
      )
        return
      localStorage.setItem(DRAFT + draftKey, JSON.stringify(values))
    } catch {
      // No storage: the form still works, just without a draft.
    }
  }, [draftKey, values, v, pristine, scripture, worship, work])

  // Someone who left the network's list since this report was filed still
  // shows, so an edit doesn't drop them.
  const people = useMemo(() => {
    const known = new Set(opts.people.map((p) => p.id))
    return [
      ...opts.people,
      ...(initial?.attendees ?? [])
        .filter((id) => !known.has(id))
        .map((id) => ({
          id,
          name: 'Someone no longer listed',
          gender: 'MALE' as const,
          cellStatus: 'REGULAR' as const,
          isMyPrimary: false,
        })),
    ]
  }, [opts.people, initial])
  const ticked = new Set(v.attendees)
  const shown = people.filter(
    (p) =>
      !query.trim() ||
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const lessonPeople = opts.lessons.map((l) => ({
    id: l.id,
    name: l.title,
    hint: l.seriesTitle,
  }))

  return (
    <form
      noValidate
      className="flex min-w-0 flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault()
        const { parsed, found } = errorsOf(values)
        // Next checks only this step's fields; the last step checks all.
        const here = Object.fromEntries(
          Object.entries(found).filter(([k]) => (STEP_OF[k] ?? LAST) <= step),
        )
        if (step < LAST) {
          setErrors(here)
          if (Object.keys(here).length === 0) go(step + 1)
          return
        }
        if (!parsed.success) {
          setErrors(found)
          const first = Object.keys(found)[0]
          go(Math.min(...Object.keys(found).map((k) => STEP_OF[k] ?? LAST)))
          toast.error(found[first] ?? 'Check the form')
          return
        }
        setErrors({})
        setPending(true)
        try {
          await onSubmit(values)
          if (draftKey) localStorage.removeItem(DRAFT + draftKey)
        } catch (error) {
          toast.error(messageOf(error))
        } finally {
          setPending(false)
        }
      }}
    >
      <div ref={top} className="scroll-mt-4">
        <StepBar step={step} reached={reached} onPick={go} />
      </div>
      {restored && (
        <p className="border border-caution/30 bg-caution/10 px-3 py-2 text-[13px]">
          Your unsaved report is back.{' '}
          <button
            type="button"
            className="font-medium text-primary"
            onClick={() => {
              if (draftKey) localStorage.removeItem(DRAFT + draftKey)
              setV(start)
              setCustom(false)
              setScripture('')
              setWorship('')
              setWork('')
              setRestored(false)
            }}
          >
            Start over
          </button>
        </p>
      )}

      {step === 0 && (
        <>
          <FormField label="Type">
            <RadioCards<CellType>
              label="Type"
              value={v.type}
              onChange={(type) => setV({ ...v, type })}
              options={[
                {
                  value: 'OPEN',
                  label: CELL_TYPE.OPEN,
                  hint: 'Anyone welcome, guests too',
                  icon: DoorOpen,
                },
                {
                  value: 'DISCIPLESHIP',
                  label: CELL_TYPE.DISCIPLESHIP,
                  hint: 'Your disciples, a lesson series',
                  icon: BookOpen,
                },
                {
                  value: 'SOULWINNING',
                  label: CELL_TYPE.SOULWINNING,
                  hint: 'Sharing the gospel',
                  icon: Sprout,
                },
              ]}
            />
          </FormField>

          {fixedLeader ? (
            <FormField label="Network leader">
              <p className="flex h-10 items-center border bg-muted/40 px-3 text-sm">
                {fixedLeader}
              </p>
            </FormField>
          ) : (
            opts.chooseLeader && (
              <FormField label="Network leader">
                <PersonCombobox
                  aria-label="Network leader"
                  people={opts.leaders}
                  value={v.leaderId}
                  onChange={(leaderId) => {
                    setV({ ...v, leaderId, attendees: [] })
                    onLeaderChange?.(leaderId)
                  }}
                  placeholder="Choose a leader"
                />
              </FormField>
            )
          )}

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <FormField
              label="Date and time"
              htmlFor="r-date"
              error={errors.date}
            >
              <Input
                id="r-date"
                type="datetime-local"
                value={v.date}
                onChange={(e) => setV({ ...v, date: e.target.value })}
              />
            </FormField>
            <FormField label="Venue" htmlFor="r-venue" error={errors.venue}>
              <Input
                id="r-venue"
                value={v.venue}
                onChange={(e) => setV({ ...v, venue: e.target.value })}
                placeholder="Reyes residence"
                aria-invalid={!!errors.venue || undefined}
              />
            </FormField>
          </div>

          {!fixedLeader && (
            <FormField
              label="Assistant leader"
              optional
              hint="If an assistant led this cell group."
            >
              <PersonCombobox
                aria-label="Assistant leader"
                people={opts.people.filter((p) => p.isMyPrimary)}
                value={v.assistantId}
                onChange={(assistantId) =>
                  setV({ ...v, assistantId: assistantId || undefined })
                }
                noneLabel="Nobody"
                placeholder="Nobody"
              />
            </FormField>
          )}
        </>
      )}
      {step === 1 && (
        <>
          <FormField
            label="Lesson"
            error={errors.lessonId}
            hint={
              !custom && opts.suggested && v.lessonId === opts.suggested
                ? 'Suggested: the lesson after the one you taught last.'
                : undefined
            }
          >
            {custom ? (
              <Input
                aria-label="Your own lesson"
                value={v.lessonTitle ?? ''}
                onChange={(e) => setV({ ...v, lessonTitle: e.target.value })}
                placeholder="The lesson’s title"
              />
            ) : (
              <PersonCombobox
                aria-label="Lesson"
                people={lessonPeople}
                value={v.lessonId}
                onChange={(lessonId) => setV({ ...v, lessonId })}
                placeholder="Choose a lesson"
              />
            )}
            <button
              type="button"
              onClick={() => setCustom(!custom)}
              className="w-fit text-[13px] font-medium text-primary"
            >
              {custom ? 'Choose from the lessons' : 'Use my own lesson'}
            </button>
          </FormField>

          <FormField
            label="Scripture"
            htmlFor="r-scripture"
            optional
            hint="Separate with commas."
          >
            <Input
              id="r-scripture"
              value={scripture}
              onChange={(e) => setScripture(e.target.value)}
              placeholder="Matthew 6:5–15, James 5:16"
            />
          </FormField>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <FormField
              label="Worship songs"
              htmlFor="r-worship"
              optional
              hint="Separate with commas."
            >
              <Textarea
                id="r-worship"
                rows={2}
                value={worship}
                onChange={(e) => setWorship(e.target.value)}
              />
            </FormField>
            <FormField
              label="Follow-up"
              htmlFor="r-work"
              optional
              hint="One per line."
            >
              <Textarea
                id="r-work"
                rows={2}
                value={work}
                onChange={(e) => setWork(e.target.value)}
              />
            </FormField>
          </div>
        </>
      )}
      {step === 2 && (
        <section aria-label="Attendees" className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="text-[13px] font-medium">
              Attendees · {ticked.size} of {people.length}
            </span>
            {ticked.size < people.length && people.length > 0 && (
              <button
                type="button"
                className="shrink-0 text-[13px] font-medium text-primary"
                onClick={() =>
                  setV({ ...v, attendees: people.map((p) => p.id) })
                }
              >
                Tick everyone
              </button>
            )}
          </div>
          {errors.attendees && (
            <p role="alert" className="text-xs text-destructive">
              {errors.attendees}
            </p>
          )}
          {people.length > 8 && (
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a name"
                aria-label="Find a name"
                className="h-10 w-full min-w-0 border border-input bg-transparent pr-3 pl-9 text-base outline-none focus-visible:border-ring md:text-sm"
              />
            </div>
          )}
          {people.length === 0 ? (
            <p className="border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {opts.chooseLeader && !v.leaderId
                ? 'Choose the network leader first.'
                : 'Nobody in this network yet. Add disciples first.'}
            </p>
          ) : (
            <div className="flex max-h-[26rem] min-w-0 flex-col overflow-y-auto border [&>*+*]:border-t">
              {shown.map((p) => {
                const on = ticked.has(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => {
                      const next = new Set(ticked)
                      if (on) next.delete(p.id)
                      else next.add(p.id)
                      setV({ ...v, attendees: [...next] })
                    }}
                    className={cn(
                      'flex min-h-12 min-w-0 items-center gap-3 px-3 text-left',
                      on && 'bg-covered/8',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-6 w-1 shrink-0',
                        p.gender === 'MALE' ? 'bg-men' : 'bg-women',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                      {p.name}
                    </span>
                    {p.cellStatus !== 'REGULAR' && (
                      <span className="shrink-0 text-xs text-caution">
                        {CELL_STATUS[p.cellStatus]}
                      </span>
                    )}
                    <CheckMark on={on} />
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      <DialogActions>
        {step === 0 ? (
          onCancel && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </Button>
          )
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => go(step - 1)}
            disabled={pending}
          >
            <ArrowLeft aria-hidden="true" /> Back
          </Button>
        )}
        {step < LAST ? (
          <Button type="submit" size="lg" data-short="Next">
            Next: {STEPS[step + 1]} <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <SubmitButton size="lg" pending={pending}>
            {submitLabel}
          </SubmitButton>
        )}
      </DialogActions>
    </form>
  )
}
