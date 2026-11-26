import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChipChoice, FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import { DialogActions } from '@/components/responsive-dialog'
import { StepBar } from '@/components/step-bar'
import { SubmitButton, isFormPending } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { discipleFields, discipleSchema } from '@/lib/disciples/schema'
import { GROUP_GENDER, genderFor, groupIssue } from '@/lib/disciples/rules'
import type { DiscipleInput } from '@/lib/disciples/schema'
import {
  CELL_STATUS,
  CHURCH_STATUS,
  GENDER,
  MEMBER_TYPE,
  PROCESS_LEVEL,
  PROCESS_STATUS,
  options,
} from '@/lib/labels'
import { messageOf } from '@/lib/errors'
import { getDiscipleFormOptions } from '@/server/disciples/disciples.functions'

type Options = Awaited<ReturnType<typeof getDiscipleFormOptions>>

export const EMPTY_DISCIPLE: DiscipleInput = {
  name: '',
  address: '',
  birthdate: '',
  gender: 'MALE',
  contactNo: '',
  memberType: 'UNCATEGORIZED',
  cellStatus: 'FIRST_TIMER',
  churchStatus: 'NACS',
  processLevel: 'NONE',
  processLevelStatus: 'NOT_STARTED',
  isMyPrimary: false,
  handledById: '',
  leaderId: '',
}

/** The form in short steps, so a phone never scrolls through all of it:
 * who they are, where they are in church, then who looks after them. A
 * primary leader's network is changed by promoting, so they have two. */
const STEPS = ['Basics', 'Church', 'Network'] as const
const STEP_OF: Record<string, number> = {
  name: 0,
  gender: 0,
  birthdate: 0,
  contactNo: 0,
  memberType: 0,
  address: 0,
  churchStatus: 1,
  cellStatus: 1,
  processLevel: 1,
  processLevelStatus: 1,
  leaderId: 2,
  handledById: 2,
  isMyPrimary: 2,
}

function Select<T extends string>({
  id,
  value,
  onChange,
  labels,
}: {
  id: string
  value: T
  onChange: (v: T) => void
  labels: Record<T, string>
}) {
  return (
    <NativeSelect
      id={id}
      size="lg"
      className="w-full"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options(labels).map((o) => (
        <NativeSelectOption key={o.value} value={o.value}>
          {o.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}

/** A disciple's details, in steps: on the New disciple page, and in Edit. */
export function DiscipleForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  isPrimary,
}: {
  initial: DiscipleInput
  submitLabel: string
  onSubmit: (values: DiscipleInput) => Promise<void>
  onCancel?: () => void
  /** A primary leader's network and role are changed by promoting. */
  isPrimary?: boolean
}) {
  const steps = isPrimary ? STEPS.slice(0, 2) : STEPS
  const last = steps.length - 1
  const form = useForm<DiscipleInput>({
    resolver: zodResolver(discipleSchema) as never,
    // Someone saved before this rule (a man marked female) opens fixed.
    defaultValues: {
      ...initial,
      gender: genderFor(initial.memberType, initial.gender),
    },
  })
  const { register, control, handleSubmit, formState, setValue } = form
  const leaderId = useWatch({ control, name: 'leaderId' })
  const memberType = useWatch({ control, name: 'memberType' })
  const gender = useWatch({ control, name: 'gender' })
  const [opts, setOpts] = useState<Options | null>(null)
  // An edit can jump to any step; a new disciple opens them in turn.
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(initial.name ? last : 0)
  const top = useRef<HTMLDivElement>(null)
  const go = (next: number) => {
    setStep(next)
    setReached((r) => Math.max(r, next))
    requestAnimationFrame(() =>
      top.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    )
  }

  useEffect(() => {
    let live = true
    getDiscipleFormOptions({ data: { leaderId: leaderId || undefined } })
      .then((o) => live && setOpts(o))
      .catch(() => live && setOpts(null))
    return () => {
      live = false
    }
  }, [leaderId])

  const errors = formState.errors
  const pending = isFormPending(formState)
  // Men and Women fix the gender; the other chip is off until the group
  // changes.
  const fixedGender = GROUP_GENDER[memberType]

  /** The problems in the given fields (all of them at once: a refined
   * schema doesn't report the group until the rest is right). */
  const problems = () => {
    const values = form.getValues()
    const found: Record<string, string> = {}
    const parsed = discipleFields.safeParse(values)
    if (!parsed.success)
      for (const i of parsed.error.issues)
        found[String(i.path[0])] ??= i.message
    const group = groupIssue(values.memberType, values.gender)
    if (group) found[group.field] ??= group.message
    return found
  }
  const showProblems = (found: Record<string, string>, upTo: number) => {
    form.clearErrors()
    let first = Infinity
    for (const [field, message] of Object.entries(found)) {
      const at = STEP_OF[field] ?? last
      if (at > upTo) continue
      form.setError(field as keyof DiscipleInput, { message })
      first = Math.min(first, at)
    }
    return first
  }

  const save = handleSubmit(
    async (values) => {
      try {
        await onSubmit(values)
      } catch (error) {
        form.setError('root', { message: messageOf(error) })
        toast.error(messageOf(error))
      }
    },
    () => {
      // Something on an earlier step: go to it.
      const first = showProblems(problems(), last)
      if (first < step) go(first)
      toast.error('Check the form')
    },
  )

  return (
    <form
      noValidate
      className="flex min-w-0 flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (step < last) {
          // Next checks only this step's fields.
          const first = showProblems(problems(), step)
          if (first === Infinity) go(step + 1)
          return
        }
        void save(e)
      }}
    >
      <div ref={top} className="scroll-mt-4">
        <StepBar steps={steps} step={step} reached={reached} onPick={go} />
      </div>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Name"
            htmlFor="d-name"
            error={errors.name?.message}
            className="sm:col-span-2"
          >
            <Input
              id="d-name"
              autoComplete="off"
              {...register('name')}
              aria-invalid={!!errors.name || undefined}
            />
          </FormField>
          <FormField
            label="Gender"
            error={errors.gender?.message}
            hint={
              fixedGender
                ? `Set by ${MEMBER_TYPE[memberType]}: change the group to change it.`
                : undefined
            }
          >
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <ChipChoice
                  label="Gender"
                  value={field.value}
                  onChange={field.onChange}
                  options={options(GENDER)}
                  disabledValues={
                    fixedGender
                      ? (['MALE', 'FEMALE'] as const).filter(
                          (g) => g !== fixedGender,
                        )
                      : undefined
                  }
                />
              )}
            />
          </FormField>
          <FormField
            label="Birthdate"
            htmlFor="d-birth"
            error={errors.birthdate?.message}
          >
            <Input
              id="d-birth"
              type="date"
              {...register('birthdate')}
              aria-invalid={!!errors.birthdate || undefined}
            />
          </FormField>
          <FormField label="Phone" htmlFor="d-phone" optional>
            <Input
              id="d-phone"
              type="tel"
              inputMode="tel"
              {...register('contactNo')}
            />
          </FormField>
          <FormField
            label="Member Type"
            htmlFor="d-type"
            error={errors.memberType?.message}
            hint={
              memberType === 'UNCATEGORIZED'
                ? undefined
                : fixedGender
                  ? `${MEMBER_TYPE[memberType]} are ${GENDER[fixedGender].toLowerCase()}, so gender follows.`
                  : undefined
            }
          >
            <Controller
              control={control}
              name="memberType"
              render={({ field }) => (
                <NativeSelect
                  id="d-type"
                  size="lg"
                  className="w-full"
                  value={field.value}
                  aria-invalid={!!errors.memberType || undefined}
                  onChange={(e) => {
                    const next = e.target.value as typeof field.value
                    field.onChange(next)
                    // Men are male, Women female: gender follows the group.
                    setValue('gender', genderFor(next, gender), {
                      shouldValidate: formState.isSubmitted,
                    })
                    form.clearErrors(['memberType', 'gender'])
                  }}
                >
                  {/* Everyone belongs to a group: "No group" can't be
                      picked, only left (v2 disciples that have none). */}
                  <NativeSelectOption value="UNCATEGORIZED" disabled>
                    Choose a group
                  </NativeSelectOption>
                  {options(MEMBER_TYPE)
                    .filter((o) => o.value !== 'UNCATEGORIZED')
                    .map((o) => (
                      <NativeSelectOption key={o.value} value={o.value}>
                        {o.label}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              )}
            />
          </FormField>
          <FormField
            label="Address"
            htmlFor="d-address"
            error={errors.address?.message}
            className="sm:col-span-2"
          >
            <Input
              id="d-address"
              {...register('address')}
              aria-invalid={!!errors.address || undefined}
            />
          </FormField>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Church Status" className="sm:col-span-2">
            <Controller
              control={control}
              name="churchStatus"
              render={({ field }) => (
                <ChipChoice
                  label="Church Status"
                  value={field.value}
                  onChange={field.onChange}
                  options={options(CHURCH_STATUS)}
                />
              )}
            />
          </FormField>
          <FormField label="Cell Status" htmlFor="d-cell">
            <Controller
              control={control}
              name="cellStatus"
              render={({ field }) => (
                <Select
                  id="d-cell"
                  value={field.value}
                  onChange={field.onChange}
                  labels={CELL_STATUS}
                />
              )}
            />
          </FormField>
          <FormField label="Process Level" htmlFor="d-level">
            <Controller
              control={control}
              name="processLevel"
              render={({ field }) => (
                <Select
                  id="d-level"
                  value={field.value}
                  onChange={field.onChange}
                  labels={PROCESS_LEVEL}
                />
              )}
            />
          </FormField>
          <FormField label="Step status" htmlFor="d-level-status">
            <Controller
              control={control}
              name="processLevelStatus"
              render={({ field }) => (
                <Select
                  id="d-level-status"
                  value={field.value}
                  onChange={field.onChange}
                  labels={PROCESS_STATUS}
                />
              )}
            />
          </FormField>
        </div>
      )}

      {step === 2 && !isPrimary && (
        <div className="grid gap-4 sm:grid-cols-2">
          {opts?.chooseLeader && (
            <FormField label="Network leader">
              <Controller
                control={control}
                name="leaderId"
                render={({ field }) => (
                  <PersonCombobox
                    aria-label="Network leader"
                    people={opts.leaders}
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v)
                      setValue('handledById', '')
                    }}
                    placeholder="Choose a leader"
                  />
                )}
              />
            </FormField>
          )}
          <FormField
            label="Handled By"
            optional
            hint="An assistant leader in the network."
          >
            <Controller
              control={control}
              name="handledById"
              render={({ field }) => (
                <PersonCombobox
                  aria-label="Handled by"
                  people={opts?.assistants ?? []}
                  value={field.value}
                  onChange={field.onChange}
                  noneLabel="The network leader"
                  placeholder="The network leader"
                />
              )}
            />
          </FormField>
          <Controller
            control={control}
            name="isMyPrimary"
            render={({ field }) => (
              <label className="flex min-w-0 items-center gap-3 sm:col-span-2">
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">Assistant leader</span>
                  <span className="text-xs text-muted-foreground">
                    Can handle disciples in this network.
                  </span>
                </span>
              </label>
            )}
          />
        </div>
      )}

      {errors.root?.message && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
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
        {step < last ? (
          <Button type="submit" size="lg" data-short="Next">
            Next: {steps[step + 1]} <ArrowRight aria-hidden="true" />
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
