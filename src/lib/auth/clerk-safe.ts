import { useClerk } from '@clerk/tanstack-react-start'
import { DEV_AUTH } from './dev'

/** Sign out, or nothing in the local preview (there's no Clerk there).
 * DEV_AUTH never changes while the app runs, so the hook order is fixed. */
export function useClerkSafe(): () => void {
  if (DEV_AUTH)
    return () => alert('Local preview: there is no sign-in to leave.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const clerk = useClerk()
  return () => void clerk.signOut({ redirectUrl: '/' })
}
