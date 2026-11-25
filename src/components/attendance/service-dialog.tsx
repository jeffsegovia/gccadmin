import { useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { FormField, ChipChoice } from '@/components/form-field'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { serviceSchema } from '@/lib/attendance/schema'
import type { ServiceInput } from '@/lib/attendance/schema'
import { ATTENDANCE_TYPE, options } from '@/lib/labels'
import { addDays, manilaDay, weekStart } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import {
  createService,
  updateService,
} from '@/server/attendance/attendance.functions'

/** This coming Sunday (or today, on a Sunday), in Manila. */
function nextSunday(): string {
  return addDays(weekStart(manilaDay()), 6)
}

export function ServiceDialog({
  open,
  onOpenChange,
  service,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Editing this one; else a new service, opened when saved. */
  service?: ServiceInput & { id: string }
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {service ? 'Edit service' : 'New service or event'}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        {open && (
          <ServiceForm service={service} onDone={() => onOpenChange(false)} />
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function ServiceForm({
  service,
  onDone,
}: {
  service?: ServiceInput & { id: string }
  onDone: () => void
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const [title, setTitle] = useState(service?.title ?? 'Sunday Service')
  const [type, setType] = useState(service?.type ?? 'SUNDAY_SERVICE')
  const [date, setDate] = useState(service?.date ?? nextSunday())
  const [tag, setTag] = useState(service?.tags?.[0] ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const parsed = serviceSchema.safeParse({
          title,
          type,
          date,
          tags: tag.trim() ? [tag.trim()] : [],
        })
        if (!parsed.success) {
          setErrors(
            Object.fromEntries(
              parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
            ),
          )
          return
        }
        setPending(true)
        try {
          if (service) {
            await updateService({ data: { ...parsed.data, id: service.id } })
            toast.success('Service saved')
            await router.invalidate()
            onDone()
          } else {
            const made = await createService({ data: parsed.data })
            onDone()
            await navigate({
              to: '/attendance/$attendanceId',
              params: { attendanceId: made.id },
            })
          }
        } catch (error) {
          toast.error(messageOf(error))
        } finally {
          setPending(false)
        }
      }}
    >
      <FormField label="Type">
        <ChipChoice
          label="Type"
          value={type}
          onChange={(v) => {
            setType(v)
            if (v === 'SUNDAY_SERVICE' && !title.trim())
              setTitle('Sunday Service')
          }}
          options={options(ATTENDANCE_TYPE)}
        />
      </FormField>
      <FormField label="Name" htmlFor="service-title" error={errors.title}>
        <Input
          id="service-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sunday Service, Youth Night"
          aria-invalid={!!errors.title || undefined}
        />
      </FormField>
      <FormField label="Date" htmlFor="service-date" error={errors.date}>
        <Input
          id="service-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={!!errors.date || undefined}
        />
      </FormField>
      <FormField
        label="Tag"
        htmlFor="service-tag"
        optional
        hint="Like “Anniversary” or “Christmas”."
      >
        <Input
          id="service-tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          maxLength={40}
        />
      </FormField>
      <DialogActions>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onDone}
          disabled={pending}
        >
          Cancel
        </Button>
        <SubmitButton
          size="lg"
          pending={pending}
          data-short={service ? 'Save' : 'Create'}
        >
          {service ? 'Save' : 'Create and open'}
        </SubmitButton>
      </DialogActions>
    </form>
  )
}
