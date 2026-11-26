import { useState } from 'react'
import { ChipChoice, FormField } from '@/components/form-field'
import { DialogActions } from '@/components/responsive-dialog'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { portalDiscipleSchema } from '@/lib/disciples/schema'
import type { PortalDiscipleInput } from '@/lib/disciples/schema'
import {
  CELL_STATUS,
  CHURCH_STATUS,
  GENDER,
  MEMBER_TYPE,
  options,
} from '@/lib/labels'
import { GROUP_GENDER, genderFor } from '@/lib/disciples/rules'
import { messageOf } from '@/lib/errors'

const blank: PortalDiscipleInput = {
  name: '',
  address: '',
  birthdate: '',
  gender: 'MALE',
  contactNo: '',
  memberType: 'YOUTH',
  cellStatus: 'FIRST_TIMER',
  churchStatus: 'NACS',
}

/** A disciple added from someone's own page: v2's personal and church
 * fields; the network, handler and Growth Process are set for them. */
export function PortalDiscipleForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: PortalDiscipleInput) => Promise<void>
  onCancel: () => void
}) {
  const [v, setV] = useState<PortalDiscipleInput>(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)
  return (
    <form
      noValidate
      className="flex min-w-0 flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const parsed = portalDiscipleSchema.safeParse(v)
        if (!parsed.success) {
          const next: Record<string, string> = {}
          for (const i of parsed.error.issues)
            next[String(i.path[0])] ??= i.message
          setErrors(next)
          return
        }
        setErrors({})
        setPending(true)
        try {
          await onSubmit(parsed.data)
        } catch (error) {
          setErrors({ form: messageOf(error) })
        } finally {
          setPending(false)
        }
      }}
    >
      <FormField label="Name" htmlFor="pd-name" error={errors.name}>
        <Input
          id="pd-name"
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          placeholder="Juan dela Cruz"
        />
      </FormField>
      <ChipChoice
        label="Gender"
        value={v.gender}
        onChange={(gender) => setV({ ...v, gender })}
        options={options(GENDER)}
        // Men and Women fix the gender; change the group to change it.
        disabledValues={
          GROUP_GENDER[v.memberType]
            ? (['MALE', 'FEMALE'] as const).filter(
                (g) => g !== GROUP_GENDER[v.memberType],
              )
            : undefined
        }
      />
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <FormField
          label="Birthdate"
          htmlFor="pd-birth"
          error={errors.birthdate}
        >
          <Input
            id="pd-birth"
            type="date"
            value={v.birthdate}
            onChange={(e) => setV({ ...v, birthdate: e.target.value })}
          />
        </FormField>
        <FormField label="Contact No." htmlFor="pd-phone" optional>
          <Input
            id="pd-phone"
            type="tel"
            inputMode="tel"
            value={v.contactNo ?? ''}
            onChange={(e) => setV({ ...v, contactNo: e.target.value })}
            placeholder="+639XXXXXXXXX"
          />
        </FormField>
      </div>
      <FormField label="Address" htmlFor="pd-address" error={errors.address}>
        <Input
          id="pd-address"
          value={v.address}
          onChange={(e) => setV({ ...v, address: e.target.value })}
          placeholder="Barangay, town"
        />
      </FormField>
      <ChipChoice
        label="Member Type"
        value={v.memberType}
        onChange={(memberType) =>
          setV({ ...v, memberType, gender: genderFor(memberType, v.gender) })
        }
        options={options(MEMBER_TYPE).filter(
          (o) => o.value !== 'UNCATEGORIZED',
        )}
      />
      <ChipChoice
        label="Cell Status"
        value={v.cellStatus}
        onChange={(cellStatus) => setV({ ...v, cellStatus })}
        options={options(CELL_STATUS)}
      />
      <ChipChoice
        label="Church Status"
        value={v.churchStatus}
        onChange={(churchStatus) => setV({ ...v, churchStatus })}
        options={options(CHURCH_STATUS)}
      />
      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
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
          Add disciple
        </SubmitButton>
      </DialogActions>
    </form>
  )
}
