import { createServerFn } from '@tanstack/react-start'
import { auth, clerkClient } from '@clerk/tanstack-react-start/server'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { devAuth, getAccess } from './access.server'

export type Viewer = {
  clerkId: string
  name: string
  email: string
  imageUrl: string | null
  isAdmin: boolean
  isPastor: boolean
  disciple: { id: string; name: string; isPrimary: boolean } | null
}

/** The app's pages: signed in with a role, else to sign in or to Request
 * access. Server functions check again on their own. */
export const requireViewer = createServerFn({ method: 'GET' })
  .validator(z.object({ redirectTo: z.string().optional() }))
  .handler(async ({ data }): Promise<Viewer> => {
    const access = await getAccess()
    if (!access)
      throw redirect({
        to: '/sign-in/$',
        params: { _splat: '' },
        search: { redirect_url: data.redirectTo },
      })
    if (access === 'no-role') throw redirect({ to: '/unauthorized' })
    if (devAuth)
      return {
        clerkId: 'dev',
        name: access.disciple?.name ?? 'Local preview',
        email: 'preview@localhost',
        imageUrl: null,
        isAdmin: access.isAdmin,
        isPastor: access.isPastor,
        disciple: access.disciple,
      }
    const user = await clerkClient().users.getUser(access.clerkId)
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      access.disciple?.name ||
      user.username ||
      'You'
    return {
      clerkId: access.clerkId,
      name,
      email: user.primaryEmailAddress?.emailAddress ?? '',
      imageUrl: user.hasImage ? user.imageUrl : null,
      isAdmin: access.isAdmin,
      isPastor: access.isPastor,
      disciple: access.disciple,
    }
  })

/** Whether someone is signed in at all (the landing page and Request access). */
export const getSignedIn = createServerFn({ method: 'GET' }).handler(
  async () => {
    if (devAuth) return { signedIn: true as const, hasRole: true }
    const session = await auth()
    if (!session.userId) return { signedIn: false as const }
    const access = await getAccess()
    return {
      signedIn: true as const,
      hasRole: access !== null && access !== 'no-role',
    }
  },
)
