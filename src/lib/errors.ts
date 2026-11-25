/** A server function's message for a person, never a stack. */
export function messageOf(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  if (error instanceof Error && error.message && error.message.length < 200)
    return error.message
  return fallback
}

/** A fetch that never reached the server (offline, dropped signal). */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  return (
    error instanceof TypeError &&
    /fetch|network|load failed/i.test(error.message)
  )
}
