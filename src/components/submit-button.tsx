import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

/** Whether a react-hook-form form is busy: submitting, or submitted fine
 * and waiting on the next page (so the button doesn't flash back). */
export function isFormPending(formState: {
  isSubmitting: boolean
  isSubmitSuccessful: boolean
  errors: { root?: unknown }
}): boolean {
  return (
    formState.isSubmitting ||
    (formState.isSubmitSuccessful && !formState.errors.root)
  )
}

/** A form's submit button. While `pending` it is disabled and shows a
 * spinner with `pendingLabel` (or the usual label). */
export function SubmitButton({
  pending,
  pendingLabel,
  children,
  disabled,
  size = 'xl',
  ...props
}: Omit<ComponentProps<typeof Button>, 'type'> & {
  pending: boolean
  pendingLabel?: ReactNode
}) {
  return (
    <Button
      type="submit"
      size={size}
      disabled={pending || disabled}
      aria-busy={pending}
      {...props}
    >
      {pending && <Spinner aria-hidden="true" />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  )
}
