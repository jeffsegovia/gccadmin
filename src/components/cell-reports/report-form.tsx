import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  DoorOpen,
  PenLine,
  Search,
  Sprout,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { CheckMark } from '@/components/check-mark'
import { FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import { StepBar } from '@/components/step-bar'
import { SubmitButton } from '@/components/submit-button'
import { DialogActions } from '@/components/responsive-dialog'
import { RadioCards } from '@/components/radio-cards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagsInput } from '@/components/tags-input'
import { cellReportSchema } from '@/lib/cell-reports/schema'
import type { CellReportInput } from '@/lib/cell-reports/schema'
import { CELL_STATUS, CELL_TYPE } from '@/lib/labels'
import { toLocalInput } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import type { CellStatus, CellType, Gender } from '@/db/schema'

export type ReportFormOptions = {
  lessons: ReadonlyArray<{
    id: string
    title: string
    seriesId: string
    seriesTitle: string
    scriptureReferences: Array<string> | null
    addedAt: string
    seriesAddedAt: string
  }>
  people: ReadonlyArray<{
    id: string
    name: string
    gender: Gender
    cellStatus: CellStatus
    isMyPrimary: boolean
    isPrimary: boolean
    /** The assistant leader who handles them, if any. */
    handledById: string | null
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

function loadDraft(key: string): Partial<CellReportInput> | null {
  try {
    const raw = localStorage.getItem(DRAFT + key)
    return raw ? (JSON.parse(raw) as Partial<CellReportInput>) : null
  } catch {
    return null
  }
}

/** A tappable row that is a checkbox (v2's "I have an assistant leader"
 * and "Create another report"). */
function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-10 w-fit items-center gap-2.5 text-left text-sm"
    >
      <CheckMark on={checked} />
      {children}
    </button>
  )
}

type LessonMode = 'gcc' | 'custom'

/** The attendees after an assistant is picked (or changed): the one who
 * was assistant before and the people only they handled are let go, and
 * the new assistant and everyone they handle are ticked. Anyone can still
 * be unticked afterwards, except the assistant themself (the list keeps
 * them ticked). */
function withAssistantPicked(
  attendees: ReadonlyArray<string>,
  people: ReadonlyArray<{ id: string; handledById: string | null }>,
  before: string | undefined,
  now: string,
) {
  const next = new Set(attendees)
  if (before) {
    next.delete(before)
    for (const p of people) if (p.handledById === before) next.delete(p.id)
  }
  next.add(now)
  for (const p of people) if (p.handledById === now) next.add(p.id)
  return [...next]
}

/** A cell group report, laid out as v2's form in three steps. A new one
 * keeps a draft on the device until it's saved, so a dropped signal or a
 * closed tab doesn't lose it. */
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
  /** `again`: "Create another report" was ticked, so stay on the form. */
  onSubmit: (values: CellReportInput, again: boolean) => Promise<void>
  onCancel?: () => void
  submitLabel: string
}) {
  const fresh = (): CellReportInput => ({
    type: 'DISCIPLESHIP',
    venue: '',
    date: toLocalInput(new Date()),
    lessonId: opts.suggested ?? undefined,
    attendees: [],
    leaderId: opts.leaderId ?? undefined,
    scriptureReferences: [],
    worship: [],
    work: [],
  })
  const start: CellReportInput = initial ?? fresh()
  const seriesOf = (lessonId?: string) =>
    opts.lessons.find((l) => l.id === lessonId)?.seriesId ?? ''
  const [v, setV] = useState<CellReportInput>(start)
  const [mode, setMode] = useState<LessonMode>(
    initial?.lessonTitle && !initial.lessonId ? 'custom' : 'gcc',
  )
  const [seriesId, setSeriesId] = useState(seriesOf(start.lessonId))
  const [withAssistant, setWithAssistant] = useState(!!initial?.assistantId)
  const [again, setAgain] = useState(false)
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
    if (draft.lessonTitle && !draft.lessonId) setMode('custom')
    else if (draft.lessonId)
      setSeriesId(
        opts.lessons.find((l) => l.id === draft.lessonId)?.seriesId ?? '',
      )
    if (draft.assistantId) setWithAssistant(true)
    setRestored(true)
    // The draft is read once, when the form opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  // Series and lessons newest first, by date added (as in v2).
  const series = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; at: string }>()
    for (const l of opts.lessons)
      if (!seen.has(l.seriesId))
        seen.set(l.seriesId, {
          id: l.seriesId,
          name: l.seriesTitle,
          at: l.seriesAddedAt,
        })
    return [...seen.values()].sort((a, b) => b.at.localeCompare(a.at))
  }, [opts.lessons])
  const seriesLessons = useMemo(
    () =>
      opts.lessons
        .filter((l) => l.seriesId === seriesId)
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
        .map((l) => ({ id: l.id, name: l.title })),
    [opts.lessons, seriesId],
  )
  const lesson = opts.lessons.find((l) => l.id === v.lessonId)

  const values = useMemo<CellReportInput>(
    () => ({
      ...v,
      assistantId: withAssistant ? v.assistantId : undefined,
      lessonId: mode === 'gcc' ? v.lessonId : undefined,
      lessonTitle: mode === 'custom' ? v.lessonTitle : undefined,
      // A GCC lesson carries its own scripture.
      scriptureReferences:
        mode === 'gcc'
          ? (lesson?.scriptureReferences ?? [])
          : (v.scriptureReferences ?? []),
    }),
    [v, mode, withAssistant, lesson],
  )

  // Only a form someone has typed into is kept as a draft.
  const [pristine] = useState(() => JSON.stringify(start))
  useEffect(() => {
    if (!draftKey) return
    try {
      if (JSON.stringify(v) === pristine) return
      localStorage.setItem(DRAFT + draftKey, JSON.stringify(values))
    } catch {
      // No storage: the form still works, just without a draft.
    }
  }, [draftKey, values, v, pristine])

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
          isPrimary: false,
          handledById: null,
        })),
    ]
  }, [opts.people, initial])
  const leaderId = v.leaderId ?? opts.leaderId
  // Qualified assistants are primary leaders and primary disciples (v2),
  // never the network leader themself.
  const assistants = opts.people
    .filter((p) => (p.isMyPrimary || p.isPrimary) && p.id !== leaderId)
    .map((p) => ({ id: p.id, name: p.name }))
  const ticked = new Set(v.attendees)
  // The assistant led it with them, so they can't be unticked.
  const locked = withAssistant ? v.assistantId : undefined
  const allTicked = people.length > 0 && people.every((p) => ticked.has(p.id))
  const shown = people.filter(
    (p) =>
      !query.trim() ||
      p.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const reset = () => {
    setV(fresh())
    setMode('gcc')
    setSeriesId(seriesOf(opts.suggested ?? undefined))
    setWithAssistant(false)
    setQuery('')
    setErrors({})
    setStep(0)
    setReached(0)
  }

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
          await onSubmit(values, again)
          if (draftKey) localStorage.removeItem(DRAFT + draftKey)
          if (again) reset()
        } catch (error) {
          toast.error(messageOf(error))
        } finally {
          setPending(false)
        }
      }}
    >
      <div ref={top} className="scroll-mt-4">
        <StepBar steps={STEPS} step={step} reached={reached} onPick={go} />
      </div>
      {restored && (
        <p className="border border-caution/30 bg-caution/10 px-3 py-2 text-[13px] rounded-lg">
          Your unsaved report is back.{' '}
          <button
            type="button"
            className="font-medium text-primary underline underline-offset-2"
            onClick={() => {
              if (draftKey) localStorage.removeItem(DRAFT + draftKey)
              reset()
              setRestored(false)
            }}
          >
            Start over
          </button>
        </p>
      )}

      {step === 0 && (
        <>
          <FormField label="Cell type">
            <RadioCards<CellType>
              label="Cell type"
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
                // v2's form offered these two; a report already filed as
                // soul winning keeps its type when edited.
                ...(initial?.type === 'SOULWINNING'
                  ? [
                      {
                        value: 'SOULWINNING' as const,
                        label: CELL_TYPE.SOULWINNING,
                        hint: 'Sharing the gospel',
                        icon: Sprout,
                      },
                    ]
                  : []),
              ]}
            />
          </FormField>

          {fixedLeader ? (
            <FormField label="Network leader">
              <p className="flex h-10 items-center border bg-muted/40 px-3 text-sm rounded-lg">
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
                  onChange={(id) => {
                    setV({
                      ...v,
                      leaderId: id,
                      attendees: [],
                      assistantId: undefined,
                    })
                    setWithAssistant(false)
                    onLeaderChange?.(id)
                  }}
                  placeholder="Select leader"
                  searchPlaceholder="Search leaders"
                  emptyText="No leader by that name."
                />
              </FormField>
            )
          )}

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <FormField label="Date & time" htmlFor="r-date" error={errors.date}>
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
                placeholder="GCC Chapel"
                aria-invalid={!!errors.venue || undefined}
              />
            </FormField>
          </div>

          {!fixedLeader && (
            <div className="flex min-w-0 flex-col gap-2">
              <CheckRow
                checked={withAssistant}
                onChange={(on) => {
                  setWithAssistant(on)
                  if (!on)
                    setV({
                      ...v,
                      assistantId: undefined,
                      attendees: v.attendees.filter((a) => a !== v.assistantId),
                    })
                }}
              >
                I have an assistant leader
              </CheckRow>
              {withAssistant && (
                <FormField
                  label="Assistant leader"
                  hint="Qualified assistants are primary leaders and primary disciples."
                >
                  <PersonCombobox
                    aria-label="Assistant leader"
                    people={assistants}
                    value={v.assistantId}
                    disabled={assistants.length === 0}
                    onChange={(assistantId) =>
                      // The assistant was there, and so were most of those
                      // they handle: tick them all, to untick whoever
                      // didn't come. The previous assistant's own
                      // disciples are unticked first.
                      setV({
                        ...v,
                        assistantId,
                        attendees: withAssistantPicked(
                          v.attendees,
                          people,
                          v.assistantId,
                          assistantId,
                        ),
                      })
                    }
                    placeholder={
                      assistants.length === 0
                        ? 'No primary disciples yet'
                        : 'Select assistant leader'
                    }
                  />
                </FormField>
              )}
            </div>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <fieldset className="flex min-w-0 flex-col gap-4">
            <legend className="mb-2 text-[13px] font-medium">
              Lesson details
            </legend>
            <RadioCards<LessonMode>
              label="Lesson"
              value={mode}
              onChange={(next) => {
                setMode(next)
                setErrors({})
              }}
              options={[
                {
                  value: 'gcc',
                  label: 'GCC Lesson',
                  hint: 'From a lesson series',
                  icon: BookOpen,
                },
                {
                  value: 'custom',
                  label: 'Custom Lesson',
                  hint: 'Your own title and scripture',
                  icon: PenLine,
                },
              ]}
            />
            {mode === 'gcc' ? (
              <>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <FormField label="Series">
                    <PersonCombobox
                      aria-label="Series"
                      people={series}
                      value={seriesId}
                      onChange={(id) => {
                        setSeriesId(id)
                        setV({ ...v, lessonId: undefined })
                      }}
                      placeholder="Select series"
                      searchPlaceholder="Search series"
                      emptyText="No series by that name."
                    />
                  </FormField>
                  <FormField
                    label="Lesson"
                    error={errors.lessonId}
                    hint={
                      opts.suggested && v.lessonId === opts.suggested
                        ? 'Suggested: the lesson after the one taught last.'
                        : undefined
                    }
                  >
                    <PersonCombobox
                      aria-label="Lesson"
                      people={seriesLessons}
                      value={v.lessonId}
                      disabled={!seriesId}
                      invalid={!!errors.lessonId}
                      onChange={(lessonId) => setV({ ...v, lessonId })}
                      placeholder={
                        seriesId ? 'Select lesson' : 'Select a series first'
                      }
                      searchPlaceholder="Search lessons"
                      emptyText="No lesson by that name."
                    />
                  </FormField>
                </div>
                <FormField label="Scripture references">
                  <p className="min-h-10 border bg-muted/40 px-3 py-2 text-sm break-words text-muted-foreground rounded-lg">
                    {lesson?.scriptureReferences?.length
                      ? lesson.scriptureReferences.join(', ')
                      : 'Comes with the lesson'}
                  </p>
                </FormField>
              </>
            ) : (
              <>
                <FormField
                  label="Lesson title"
                  htmlFor="r-lesson-title"
                  error={errors.lessonId}
                >
                  <Input
                    id="r-lesson-title"
                    value={v.lessonTitle ?? ''}
                    onChange={(e) =>
                      setV({ ...v, lessonTitle: e.target.value })
                    }
                    placeholder="Lesson title"
                    aria-invalid={!!errors.lessonId || undefined}
                  />
                </FormField>
                <FormField
                  label="Scripture references"
                  htmlFor="r-scripture"
                  error={errors.scriptureReferences}
                >
                  <TagsInput
                    id="r-scripture"
                    value={v.scriptureReferences ?? []}
                    onChange={(scriptureReferences) =>
                      setV({ ...v, scriptureReferences })
                    }
                    placeholder="e.g. John 3:16"
                    hint="Type a reference, then press Enter."
                    invalid={!!errors.scriptureReferences}
                  />
                </FormField>
              </>
            )}
          </fieldset>

          <FormField
            label="Worship"
            htmlFor="r-worship"
            optional
            hint="Did you worship during the cell group? Type a song, then press Enter."
          >
            <TagsInput
              id="r-worship"
              value={v.worship ?? []}
              onChange={(worship) => setV({ ...v, worship })}
              placeholder="e.g. One Way, Better Is One Day"
            />
          </FormField>
          <FormField
            label="Work"
            htmlFor="r-work"
            optional
            hint="Any plans of the group? Type one, then press Enter."
          >
            <TagsInput
              id="r-work"
              value={v.work ?? []}
              onChange={(work) => setV({ ...v, work })}
              placeholder="e.g. 3x3 Prayer, Follow-up"
            />
          </FormField>
        </>
      )}

      {step === 2 && (
        <section aria-label="Attendees" className="flex min-w-0 flex-col gap-2">
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="text-[13px] font-medium">
              Attendees · {ticked.size} of {people.length}
            </span>
            {people.length > 0 && (
              <button
                type="button"
                className="shrink-0 text-[13px] font-medium text-primary underline-offset-2 hover:underline"
                onClick={() =>
                  setV({
                    ...v,
                    attendees: allTicked
                      ? locked
                        ? [locked]
                        : []
                      : people.map((p) => p.id),
                  })
                }
              >
                {allTicked ? 'Deselect all' : 'Select all'}
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
                placeholder="Search names"
                aria-label="Search attendees"
                className="h-10 w-full min-w-0 border border-input bg-transparent pr-3 pl-9 text-base outline-none focus-visible:border-ring md:text-sm rounded-lg"
              />
            </div>
          )}
          {people.length === 0 ? (
            <p className="border border-dashed px-4 py-6 text-center text-sm text-muted-foreground rounded-xl">
              {opts.chooseLeader && !v.leaderId
                ? 'Select a leader first.'
                : 'No disciple found for this leader.'}
            </p>
          ) : (
            <div className="flex max-h-[26rem] min-w-0 flex-col overflow-y-auto border [&>*+*]:border-t rounded-lg">
              {shown.map((p) => {
                const on = ticked.has(p.id)
                const fixed = p.id === locked
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-disabled={fixed || undefined}
                    onClick={() => {
                      if (fixed) return
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
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                      {p.name}
                    </span>
                    {fixed && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Assistant
                      </span>
                    )}
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
          {draftKey && (
            <CheckRow checked={again} onChange={setAgain}>
              Create another report
            </CheckRow>
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
