import { createServerFn } from '@tanstack/react-start'
import { clerkClient } from '@clerk/tanstack-react-start/server'
import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  sql,
} from 'drizzle-orm'
import { welcomeLeaderEmail } from '@/lib/email/templates'
import { sendEmail, site } from '@/server/email/send.server'
import { z } from 'zod'
import { db } from '@/db'
import { cellReports, disciples, users } from '@/db/schema'
import { rangeBounds } from '@/server/cell-reports/cell-reports.server'
import { AccessError, devAuth, requireAdmin } from '@/server/auth/access.server'
import { likeTerm } from '@/server/disciples/disciples.queries'

/* Admin pages: primary leaders and their sign-ins, and the Clerk accounts
   themselves. Roles stay in Clerk's public metadata, as in v2. */

const member = db
  .select({ leaderId: disciples.leaderId, n: count().as('n') })
  .from(disciples)
  .where(and(eq(disciples.isActive, true), eq(disciples.isDeleted, false)))
  .groupBy(disciples.leaderId)
  .as('member')

export const getLeaders = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().optional() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const week = rangeBounds('this_week')!
    return db
      .select({
        id: disciples.id,
        name: disciples.name,
        gender: disciples.gender,
        reportedThisWeek: sql<boolean>`exists (select 1 from ${cellReports} where ${cellReports.leaderId} = ${disciples.id} and ${cellReports.date} >= ${week[0].toISOString()} and ${cellReports.date} < ${week[1].toISOString()})`,
        isActive: disciples.isActive,
        userAccountId: disciples.userAccountId,
        email: users.email,
        disciples: member.n,
      })
      .from(disciples)
      .leftJoin(users, eq(users.clerkId, disciples.userAccountId))
      .leftJoin(member, eq(member.leaderId, disciples.id))
      .where(
        and(
          eq(disciples.isPrimary, true),
          eq(disciples.isDeleted, false),
          data.q?.trim() ? ilike(disciples.name, likeTerm(data.q)) : undefined,
        ),
      )
      .orderBy(asc(disciples.name))
  })

type ClerkUser = Awaited<
  ReturnType<ReturnType<typeof clerkClient>['users']['getUser']>
>

function summarize(u: ClerkUser) {
  const meta = u.publicMetadata as { role?: string; pastor?: boolean }
  const role: 'admin' | 'leader' | null =
    meta.role === 'admin' ? 'admin' : meta.role === 'leader' ? 'leader' : null
  return {
    id: u.id,
    name:
      [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '—',
    email:
      u.primaryEmailAddress?.emailAddress ??
      u.emailAddresses[0]?.emailAddress ??
      '',
    imageUrl: u.hasImage ? u.imageUrl : null,
    role,
    pastor: meta.pastor === true,
    createdAt: new Date(u.createdAt).toISOString(),
    lastSignInAt: u.lastSignInAt
      ? new Date(u.lastSignInAt).toISOString()
      : null,
    // v2's Users table: Email Verified? and Last Active At.
    emailVerified: u.primaryEmailAddress?.verification?.status === 'verified',
    lastActiveAt: u.lastActiveAt
      ? new Date(u.lastActiveAt).toISOString()
      : null,
  }
}

export type AccountRow = ReturnType<typeof summarize> & {
  disciple: { id: string; name: string } | null
}

export const getAccounts = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().optional() }))
  .handler(async ({ data }): Promise<Array<AccountRow>> => {
    await requireAdmin()
    if (devAuth) return []
    const list = await clerkClient().users.getUserList({
      limit: 200,
      query: data.q?.trim() || undefined,
      orderBy: '-created_at',
    })
    const ids = list.data.map((u) => u.id)
    const linked = ids.length
      ? await db
          .select({
            id: disciples.id,
            name: disciples.name,
            account: disciples.userAccountId,
          })
          .from(disciples)
          .where(
            and(
              inArray(disciples.userAccountId, ids),
              eq(disciples.isDeleted, false),
            ),
          )
      : []
    const byAccount = new Map(
      linked.map((d) => [d.account, { id: d.id, name: d.name }]),
    )
    return list.data.map((u) => ({
      ...summarize(u),
      disciple: byAccount.get(u.id) ?? null,
    }))
  })

export const setAccountRole = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      clerkId: z.string(),
      role: z.enum(['admin', 'leader']).nullable(),
      pastor: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const access = await requireAdmin()
    if (data.clerkId === access.clerkId && data.role !== 'admin')
      throw new AccessError('You can’t remove your own admin role.')
    await clerkClient().users.updateUserMetadata(data.clerkId, {
      publicMetadata: { role: data.role ?? null, pastor: data.pastor || null },
    })
    await db
      .update(users)
      .set({ role: data.role === 'admin' ? 'ADMIN' : 'USER' })
      .where(eq(users.clerkId, data.clerkId))
  })

/** Links a Clerk account to a primary leader's record and makes it a
 * leader (v2's "Assign account"). One account, one leader. */
export const linkLeaderAccount = createServerFn({ method: 'POST' })
  .validator(z.object({ leaderId: z.string(), clerkId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const u = summarize(await clerkClient().users.getUser(data.clerkId))
    const [leader] = await db
      .select({ name: disciples.name })
      .from(disciples)
      .where(eq(disciples.id, data.leaderId))
    if (!leader) throw new AccessError('That leader isn’t here anymore.')
    await db.transaction(async (tx) => {
      await tx
        .insert(users)
        .values({
          clerkId: data.clerkId,
          email: u.email,
          name: leader.name,
          role: u.role === 'admin' ? 'ADMIN' : 'USER',
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: { email: u.email, name: leader.name },
        })
      await tx
        .update(disciples)
        .set({ userAccountId: null })
        .where(eq(disciples.userAccountId, data.clerkId))
      await tx
        .update(disciples)
        .set({ userAccountId: data.clerkId })
        .where(eq(disciples.id, data.leaderId))
    })
    if (!u.role)
      await clerkClient().users.updateUserMetadata(data.clerkId, {
        publicMetadata: { role: 'leader' },
      })
    // A newly linked leader hears that they're set up (once per link).
    if (u.email)
      await sendEmail({
        to: u.email,
        tag: 'leader-linked',
        idempotencyKey: `leader-linked-${data.leaderId}-${data.clerkId}`,
        email: welcomeLeaderEmail({ site: site() }, { name: leader.name }),
      })
  })

export const unlinkLeaderAccount = createServerFn({ method: 'POST' })
  .validator(z.object({ leaderId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    await db
      .update(disciples)
      .set({ userAccountId: null })
      .where(eq(disciples.id, data.leaderId))
  })

/** Accounts not linked to anyone yet, for "Link an account". */
export const getUnlinkedAccounts = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAdmin()
    if (devAuth) return []
    const list = await clerkClient().users.getUserList({
      limit: 200,
      orderBy: '-created_at',
    })
    const taken = new Set(
      (
        await db
          .select({ id: disciples.userAccountId })
          .from(disciples)
          .where(isNotNull(disciples.userAccountId))
      ).map((r) => r.id),
    )
    return list.data
      .filter((u) => !taken.has(u.id))
      .map((u) => {
        const s = summarize(u)
        return { id: s.id, name: s.name, hint: s.email }
      })
  },
)
