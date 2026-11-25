import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChipChoice, FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import { DialogActions } from '@/components/responsive-dialog'
import { SubmitButton, isFormPending } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { discipleSchema } from '@/lib/disciples/schema'
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

/** A disciple's details: on the New disciple page, and in Edit. */
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
  const form = useForm<DiscipleInput>({
    resolver: zodResolver(discipleSchema) as never,
    defaultValues: initial,
  })
  const { register, control, handleSubmit, formState, setValue } = form
  const leaderId = useWatch({ control, name: 'leaderId' })
  const [opts, setOpts] = useState<Options | null>(null)

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

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSubmit(values)
        } catch (error) {
          form.setError('root', { message: messageOf(error) })
          toast.error(messageOf(error))
        }
      })}
    >
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
        <FormField label="Gender" error={errors.gender?.message}>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <ChipChoice
                label="Gender"
                value={field.value}
                onChange={field.onChange}
                options={options(GENDER)}
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
        <FormField label="Member Type" htmlFor="d-type">
          <Controller
            control={control}
            name="memberType"
            render={({ field }) => (
              <Select
                id="d-type"
                value={field.value}
                onChange={field.onChange}
                labels={MEMBER_TYPE}
              />
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

      <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
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

      {!isPrimary && (
        <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
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
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        )}
        <SubmitButton size="lg" pending={pending}>
          {submitLabel}
        </SubmitButton>
      </DialogActions>
    </form>
  )
}
