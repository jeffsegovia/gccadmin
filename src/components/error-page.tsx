import { useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/** A route's loader or component threw. The message is shown only when
 * it's one of ours (a server function's `Error`), never a stack. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="font-heading text-3xl font-semibold">
        {offline ? 'You’re offline' : 'Something went wrong'}
      </h1>
      <p className="text-muted-foreground">
        {offline
          ? 'GCC Admin needs a connection for this page. Attendance sheets you opened before still work offline.'
          : (error instanceof Error && error.message) ||
            'Try again in a moment.'}
      </p>
      <Button
        size="lg"
        className="mt-3"
        onClick={() => {
          reset()
          void router.invalidate()
        }}
      >
        Try again
      </Button>
    </div>
  )
}
