import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

/** A button that saves something: while `onClick`'s promise runs it is
 * disabled, busy, and shows a spinner in place of its icon (and
 * `pendingLabel`, if given). Icon-only buttons pass the icon as `icon`
 * and no children. Every mutation button uses this or `SubmitButton`. */
export function PendingButton({
  onClick,
  icon: Icon,
  pendingLabel,
  children,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  onClick: () => Promise<unknown>
  icon?: LucideIcon
  pendingLabel?: ReactNode
  children?: ReactNode
}) {
  const [pending, setPending] = useState(false)
  return (
    <Button
      {...props}
      disabled={pending || disabled}
      aria-busy={pending}
      onClick={async () => {
        if (pending) return
        setPending(true)
        try {
          await onClick()
        } finally {
          setPending(false)
        }
      }}
    >
      {pending ? (
        <Spinner aria-hidden="true" />
      ) : (
        Icon && <Icon aria-hidden="true" />
      )}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  )
}
