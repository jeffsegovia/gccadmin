import { auth, clerkClient } from '@clerk/tanstack-react-start/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { disciples } from '@/db/schema'

/* Who may do what, exactly as in v2: roles live in the Clerk user's public
   metadata (`role: 'admin' | 'leader'`, `pastor: true`), copied into the
   session token as `metadata` when the Clerk instance is set up that way.
   A signed-in person with neither role sees the Request access page. */

export type Role = 'admin' | 'leader'

export type Access = {
  clerkId: string
  role: Role
  isAdmin: boolean
  /** Pastors read every network, like admins, without the admin pages. */
  isPastor: boolean
  /** The signed-in person's own disciple record (a primary leader), if any. */
  disciple: { id: string; name: string; isPrimary: boolean } | null
}

type Metadata = { role?: unknown; pastor?: unknown }

export class AccessError extends Error {}

async function metadataOf(
  userId: string,
  claims: Record<string, unknown> | null,
): Promise<Metadata> {
  const fromToken = claims?.metadata as Metadata | undefined
  if (fromToken && typeof fromToken === 'object') return fromToken
  // No custom session claim configured: ask Clerk.
  const user = await clerkClient().users.getUser(userId)
  return user.publicMetadata
}

/** The signed-in person with a role, or null (signed out, or no role). */
/** Local preview only: no Clerk secret in dev. */
export const devAuth =
  process.env.NODE_ENV !== 'production' && !process.env.CLERK_SECRET_KEY

async function devAccess(): Promise<Access> {
  const wanted = process.env.DEV_DISCIPLE_ID
  const [disciple] = await db
    .select({
      id: disciples.id,
      name: disciples.name,
      isPrimary: disciples.isPrimary,
    })
    .from(disciples)
    .where(
      wanted
        ? eq(disciples.id, wanted)
        : and(eq(disciples.isPrimary, true), eq(disciples.isDeleted, false)),
    )
    .orderBy(disciples.createdAt)
    .limit(1)
  return {
    clerkId: 'dev',
    role: 'admin',
    isAdmin: process.env.DEV_ROLE !== 'leader',
    isPastor: false,
    disciple: disciple ?? null,
  }
}

export async function getAccess(): Promise<Access | null | 'no-role'> {
  if (devAuth) return devAccess()
  const session = await auth()
  if (!session.userId) return null
  const meta = await metadataOf(session.userId, session.sessionClaims)
  const role =
    meta.role === 'admin' || meta.role === 'leader' ? meta.role : null
  if (!role) return 'no-role'
  const [disciple] = await db
    .select({
      id: disciples.id,
      name: disciples.name,
      isPrimary: disciples.isPrimary,
    })
    .from(disciples)
    .where(
      and(
        eq(disciples.userAccountId, session.userId),
        eq(disciples.isDeleted, false),
      ),
    )
    .limit(1)
  return {
    clerkId: session.userId,
    role,
    isAdmin: role === 'admin',
    isPastor: meta.pastor === true,
    disciple: disciple ?? null,
  }
}

/** For every server function that reads or writes church data. */
export async function requireAccess(): Promise<Access> {
  const access = await getAccess()
  if (!access) throw new AccessError('Please sign in again.')
  if (access === 'no-role')
    throw new AccessError('Your account has no access yet.')
  return access
}

export async function requireAdmin(): Promise<Access> {
  const access = await requireAccess()
  if (!access.isAdmin) throw new AccessError('Only admins can do that.')
  return access
}

/** Admins and pastors see every network; a leader sees their own. */
export function seesEveryone(access: Access): boolean {
  return access.isAdmin || access.isPastor
}

/** A leader may change disciples in their own network; admins any. */
export async function requireCanEditDisciple(
  access: Access,
  discipleId: string,
): Promise<void> {
  if (access.isAdmin) return
  const [row] = await db
    .select({
      leaderId: disciples.leaderId,
      handledById: disciples.handledById,
    })
    .from(disciples)
    .where(eq(disciples.id, discipleId))
  if (!row) throw new AccessError('That disciple is gone.')
  const mine = access.disciple?.id
  if (!mine || (row.leaderId !== mine && row.handledById !== mine))
    throw new AccessError('Only their leader can change this disciple.')
}
