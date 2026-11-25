import { useMemo, useState } from 'react'
import { createId } from '@paralleldrive/cuid2'
import { CircleAlert, Plus } from 'lucide-react'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { ChipChoice, FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { guestSchema } from '@/lib/attendance/schema'
import type { GuestInput } from '@/lib/attendance/schema'
import type { Gender, MemberType } from '@/db/schema'
import { GENDER, MEMBER_TYPE, options } from '@/lib/labels'

export type KnownGuest = {
  id: string
  name: string
  hint: string
}

const GROUPS = options(MEMBER_TYPE).filter((o) => o.value !== 'UNCATEGORIZED')

/** Adds a first-timer (or edits a guest). New guests get their id here,
 * on the device, so adding one offline is safe to sync more than once. */
export function GuestDialog({
  open,
  onOpenChange,
  guest,
  serviceLabel,
  inviters,
  known,
  onSave,
  onMarkReturning,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Editing this guest; else adding a new one. */
  guest?: GuestInput
  serviceLabel?: string
  inviters: ReadonlyArray<{ id: string; name: string }>
  /** Guests who came before, to catch the same person added twice. */
  known: ReadonlyArray<KnownGuest>
  onSave: (guest: GuestInput) => void | Promise<void>
  onMarkReturning?: (guestId: string) => void
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {guest ? 'Edit guest' : 'Add a first-timer'}
          </ResponsiveDialogTitle>
          {!guest && serviceLabel && (
            <ResponsiveDialogDescription>
              Marked present at {serviceLabel}.
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>
        {open && (
          <GuestForm
            guest={guest}
            inviters={inviters}
            known={known}
            onCancel={() => onOpenChange(false)}
            onSave={async (g) => {
              await onSave(g)
              onOpenChange(false)
            }}
            onMarkReturning={
              onMarkReturning &&
              ((id) => {
                onMarkReturning(id)
                onOpenChange(false)
              })
            }
          />
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

function GuestForm({
  guest,
  inviters,
  known,
  onCancel,
  onSave,
  onMarkReturning,
}: {
  guest?: GuestInput
  inviters: ReadonlyArray<{ id: string; name: string }>
  known: ReadonlyArray<KnownGuest>
  onCancel: () => void
  onSave: (guest: GuestInput) => Promise<void>
  onMarkReturning?: (guestId: string) => void
}) {
  const [name, setName] = useState(guest?.name ?? '')
  const [gender, setGender] = useState<Gender | null>(guest?.gender ?? null)
  const [memberType, setMemberType] = useState<MemberType | null>(
    guest?.memberType && guest.memberType !== 'UNCATEGORIZED'
      ? guest.memberType
      : null,
  )
  const [invitedById, setInvitedById] = useState(guest?.invitedById ?? '')
  const [more, setMore] = useState(
    !!(guest?.contactNo || guest?.email || guest?.address),
  )
  const [contactNo, setContactNo] = useState(guest?.contactNo ?? '')
  const [email, setEmail] = useState(guest?.email ?? '')
  const [address, setAddress] = useState(guest?.address ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  const twin = useMemo(() => {
    const n = name.trim().toLowerCase()
    if (guest || n.length < 3) return null
    return known.find((k) => k.name.trim().toLowerCase() === n) ?? null
  }, [name, known, guest])

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const next: Record<string, string> = {}
        if (!gender) next.gender = 'Choose one'
        const parsed = guestSchema.safeParse({
          id: guest?.id ?? createId(),
          name,
          gender: gender ?? 'MALE',
          memberType: memberType ?? 'UNCATEGORIZED',
          invitedById: invitedById || null,
          contactNo: contactNo || null,
          email: email || null,
          address: address || null,
        })
        if (!parsed.success)
          for (const issue of parsed.error.issues)
            next[String(issue.path[0])] = issue.message
        setErrors(next)
        if (Object.keys(next).length || !parsed.success) return
        setPending(true)
        try {
          await onSave(parsed.data)
        } finally {
          setPending(false)
        }
      }}
    >
      <FormField label="Name" htmlFor="guest-name" error={errors.name}>
        <Input
          id="guest-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          autoFocus
          aria-invalid={!!errors.name || undefined}
        />
      </FormField>
      {twin && (
        <div
          role="status"
          className="flex gap-2.5 border border-caution/30 bg-caution/10 p-3 text-[13px] rounded-lg"
        >
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-caution"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span>
              A <b>{twin.name}</b> came before ({twin.hint}).
            </span>
            {onMarkReturning && (
              <button
                type="button"
                onClick={() => onMarkReturning(twin.id)}
                className="w-fit text-left font-semibold text-primary hover:underline"
              >
                Same person? Mark them as returning
              </button>
            )}
          </div>
        </div>
      )}
      <FormField label="Gender" error={errors.gender}>
        <ChipChoice
          label="Gender"
          value={gender}
          onChange={setGender}
          options={options(GENDER)}
        />
      </FormField>
      <FormField label="Member Type" optional>
        <ChipChoice
          label="Member Type"
          value={memberType}
          onChange={setMemberType}
          options={GROUPS}
        />
      </FormField>
      <FormField label="Invited by" optional>
        <PersonCombobox
          people={inviters}
          value={invitedById}
          onChange={setInvitedById}
          placeholder="Walk-in"
          noneLabel="Walk-in (nobody)"
          aria-label="Invited by"
        />
      </FormField>
      {more ? (
        <>
          <FormField label="Phone" htmlFor="guest-phone" optional>
            <Input
              id="guest-phone"
              type="tel"
              inputMode="tel"
              value={contactNo}
              onChange={(e) => setContactNo(e.target.value)}
            />
          </FormField>
          <FormField label="Email" htmlFor="guest-email" optional>
            <Input
              id="guest-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Address" htmlFor="guest-address" optional>
            <Input
              id="guest-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </FormField>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setMore(true)}
          className="flex h-9 w-fit items-center gap-1.5 text-sm font-medium text-primary"
        >
          <Plus aria-hidden="true" className="size-4" /> Phone, email, address
        </button>
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
        <SubmitButton
          size="lg"
          pending={pending}
          data-short={guest ? 'Save' : 'Add'}
        >
          {guest ? 'Save' : 'Add and mark present'}
        </SubmitButton>
      </DialogActions>
    </form>
  )
}
