import { randomBytes } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, ilike } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { missingLessons } from '@/server/soul-winning/believers.server'
import {
  disciplePortalLinks,
  disciples,
  newBelievers,
  newComers,
} from '@/db/schema'
import {
  AccessError,
  requireAccess,
  requireAdmin,
  requireCanEditDisciple,
  seesEveryone,
} from '@/server/auth/access.server'
import {
  discipleIdSchema,
  discipleSchema,
  importRowSchema,
  listDisciplesSchema,
} from '@/lib/disciples/schema'
import type { DiscipleInput } from '@/lib/disciples/schema'
import { dayToDate } from '@/lib/dates'
import {
  listAssistants,
  listDisciples,
  listHandlers,
  listLeaders,
} from './disciples.queries'
import {
  attendanceHistory,
  cellGroupCount,
  findDisciple,
  handledDisciples,
  lessonsTaken,
  portalLinkOf,
  recentCellGroups,
} from './disciple-detail.queries'

export const getDisciplesPage = createServerFn({ method: 'GET' })
  .validator(listDisciplesSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const everyone = seesEveryone(access)
    const [list, leaders, handlers] = await Promise.all([
      listDisciples(access, data),
      everyone ? listLeaders() : Promise.resolve([]),
      listHandlers(access),
    ])
    return {
      ...list,
      leaders,
      handlers,
      everyone,
      scope: data.scope ?? (everyone ? 'all' : 'mine'),
      myId: access.disciple?.id ?? null,
    }
  })

/** Every matching disciple, for the spreadsheet export. */
export const exportDisciples = createServerFn({ method: 'GET' })
  .validator(listDisciplesSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const { rows } = await listDisciples(access, data, true)
    return rows
  })

/** Leaders and a network's assistant leaders, for the disciple form. */
export const getDiscipleFormOptions = createServerFn({ method: 'GET' })
  .validator(z.object({ leaderId: z.string().optional() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const leaderId = access.isAdmin
      ? data.leaderId
      : (access.disciple?.id ?? undefined)
    const [leaders, assistants] = await Promise.all([
      access.isAdmin ? listLeaders() : Promise.resolve([]),
      listAssistants(leaderId),
    ])
    return {
      leaders,
      assistants,
      chooseLeader: access.isAdmin,
      leaderId: leaderId ?? null,
    }
  })

export const getDiscipleDetail = createServerFn({ method: 'GET' })
  .validator(discipleIdSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const found = await findDisciple(data.id)
    if (!found) throw new AccessError('That disciple isn’t here anymore.')
    const d = found.disciple
    const mine = access.disciple?.id
    const inMyNetwork =
      !!mine && (d.leaderId === mine || d.handledById === mine)
    if (!seesEveryone(access) && !inMyNetwork && d.id !== mine)
      throw new AccessError('This disciple is in another network.')
    const [history, recent, taken, handled, counts, portal] = await Promise.all(
      [
        attendanceHistory(d.id),
        recentCellGroups(d.id),
        lessonsTaken(d.id),
        d.isPrimary || d.isMyPrimary
          ? handledDisciples(d.id, d.isPrimary)
          : Promise.resolve([]),
        cellGroupCount(d.id),
        portalLinkOf(d.id),
      ],
    )
    return {
      disciple: {
        ...d,
        leaderName: found.leaderName,
        handledByName: found.handledByName,
      },
      history,
      recent,
      lessonsTaken: taken,
      handled,
      cellGroupTotal: counts.n,
      portal: portal && {
        token: portal.token,
        isEnabled: portal.isEnabled,
        lastOpenedAt: portal.lastOpenedAt,
      },
      canEdit: access.isAdmin || inMyNetwork,
      canPromote: access.isAdmin,
    }
  })

function valuesOf(input: Omit<z.output<typeof discipleSchema>, 'leaderId'>) {
  return {
    name: input.name,
    address: input.address,
    birthdate: dayToDate(input.birthdate),
    gender: input.gender,
    contactNo: input.contactNo?.trim() || null,
    memberType: input.memberType,
    cellStatus: input.cellStatus,
    churchStatus: input.churchStatus,
    processLevel: input.processLevel,
    processLevelStatus: input.processLevelStatus,
    isMyPrimary: input.isMyPrimary,
    handledById: input.handledById ?? null,
  }
}

export const createDisciple = createServerFn({ method: 'POST' })
  .validator(
    discipleSchema.extend({
      fromNewComerId: z.string().optional(),
      fromNewBelieverId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const leaderId = access.isAdmin
      ? (data.leaderId ?? access.disciple?.id)
      : access.disciple?.id
    if (!leaderId) throw new AccessError('Choose their network leader.')
    if (data.fromNewBelieverId) {
      const missing = await missingLessons(data.fromNewBelieverId)
      if (missing.length)
        throw new AccessError(
          `They can become a disciple once every soul-winning and consolidation lesson is taken (${missing.length} to go).`,
        )
    }
    const [created] = await db
      .insert(disciples)
      .values({ ...valuesOf(data), leaderId })
      .returning({ id: disciples.id })
    // A guest or a new believer who became a disciple keeps the link to
    // their old record, as in v2.
    if (data.fromNewComerId)
      await db
        .update(newComers)
        .set({ discipleProfileId: created.id })
        .where(eq(newComers.id, data.fromNewComerId))
    if (data.fromNewBelieverId)
      await db
        .update(newBelievers)
        .set({ discipleProfileId: created.id })
        .where(eq(newBelievers.id, data.fromNewBelieverId))
    return created
  })

export const updateDisciple = createServerFn({ method: 'POST' })
  .validator(discipleSchema.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    await requireCanEditDisciple(access, data.id)
    const values: Partial<typeof disciples.$inferInsert> = valuesOf(data)
    if (access.isAdmin && data.leaderId) values.leaderId = data.leaderId
    await db.update(disciples).set(values).where(eq(disciples.id, data.id))
  })

export const setDiscipleActive = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), isActive: z.boolean() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    await requireCanEditDisciple(access, data.id)
    await db
      .update(disciples)
      .set({ isActive: data.isActive })
      .where(eq(disciples.id, data.id))
  })

/** Hidden, not erased: their cell group history stays (as in v2). */
export const deleteDisciple = createServerFn({ method: 'POST' })
  .validator(discipleIdSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    await requireCanEditDisciple(access, data.id)
    await db
      .update(disciples)
      .set({ isDeleted: true, isActive: false })
      .where(eq(disciples.id, data.id))
    await db
      .update(disciplePortalLinks)
      .set({ isEnabled: false })
      .where(eq(disciplePortalLinks.discipleId, data.id))
  })

/** Makes a disciple a primary leader under the senior pastor; the people
 * they handled become their network. Their portal link turns off: primary
 * leaders sign in. */
export const promoteToPrimary = createServerFn({ method: 'POST' })
  .validator(discipleIdSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const pastorName = process.env.SENIOR_PASTOR_NAME ?? 'John De Guzman'
    await db.transaction(async (tx) => {
      const [pastor] = await tx
        .select({ id: disciples.id })
        .from(disciples)
        .where(
          and(
            ilike(disciples.name, `%${pastorName}%`),
            eq(disciples.isPrimary, true),
          ),
        )
        .limit(1)
      if (!pastor)
        throw new AccessError(`The senior pastor (${pastorName}) wasn’t found.`)
      await tx
        .update(disciples)
        .set({ isPrimary: true, leaderId: pastor.id })
        .where(eq(disciples.id, data.id))
      await tx
        .update(disciples)
        .set({ leaderId: data.id })
        .where(eq(disciples.handledById, data.id))
      await tx
        .update(disciplePortalLinks)
        .set({ isEnabled: false })
        .where(eq(disciplePortalLinks.discipleId, data.id))
    })
  })

export const demoteFromPrimary = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), newLeaderId: z.string().min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin()
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ isPrimary: disciples.isPrimary })
        .from(disciples)
        .where(eq(disciples.id, data.id))
      if (!row?.isPrimary)
        throw new AccessError('They aren’t a primary leader.')
      await tx
        .update(disciples)
        .set({ isPrimary: false, leaderId: data.newLeaderId })
        .where(eq(disciples.id, data.id))
      await tx
        .update(disciples)
        .set({ leaderId: data.newLeaderId })
        .where(eq(disciples.handledById, data.id))
    })
  })

export const importDisciples = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      rows: z.array(importRowSchema).min(1).max(500),
      leaderId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const leaderId = access.isAdmin
      ? (data.leaderId ?? access.disciple?.id)
      : access.disciple?.id
    if (!leaderId) throw new AccessError('Choose their network leader.')
    const names = new Set<string>()
    for (const row of data.rows) {
      const key = row.name.trim().toLowerCase()
      if (names.has(key))
        throw new AccessError(`${row.name} is in the file twice.`)
      names.add(key)
    }
    await db.insert(disciples).values(
      data.rows.map((row) => ({
        ...valuesOf(row),
        handledById: null,
        leaderId,
      })),
    )
    return { count: data.rows.length }
  })

/* ---- Portal links (non-primary disciples only) ---- */

function newToken() {
  return randomBytes(16).toString('base64url')
}

async function requirePortalTarget(discipleId: string) {
  const access = await requireAccess()
  await requireCanEditDisciple(access, discipleId)
  const [d] = await db
    .select({ isPrimary: disciples.isPrimary, isDeleted: disciples.isDeleted })
    .from(disciples)
    .where(eq(disciples.id, discipleId))
  if (!d || d.isDeleted) throw new AccessError('That disciple is gone.')
  if (d.isPrimary)
    throw new AccessError('Primary leaders sign in instead of using a link.')
  return access
}

/** The disciple's link, made the first time it's asked for. */
export const ensurePortalLink = createServerFn({ method: 'POST' })
  .validator(discipleIdSchema)
  .handler(async ({ data }) => {
    const access = await requirePortalTarget(data.id)
    const existing = await portalLinkOf(data.id)
    if (existing) {
      if (!existing.isEnabled)
        await db
          .update(disciplePortalLinks)
          .set({ isEnabled: true })
          .where(eq(disciplePortalLinks.id, existing.id))
      return { token: existing.token }
    }
    const token = newToken()
    await db
      .insert(disciplePortalLinks)
      .values({
        discipleId: data.id,
        token,
        createdById: access.disciple?.id ?? access.clerkId,
      })
      .onConflictDoNothing()
    const made = await portalLinkOf(data.id)
    return { token: made.token }
  })

/** A new link; the old one stops working at once. */
export const resetPortalLink = createServerFn({ method: 'POST' })
  .validator(discipleIdSchema)
  .handler(async ({ data }) => {
    await requirePortalTarget(data.id)
    const token = newToken()
    await db
      .update(disciplePortalLinks)
      .set({ token, isEnabled: true, lastOpenedAt: null })
      .where(eq(disciplePortalLinks.discipleId, data.id))
    return { token }
  })

export const turnOffPortal = createServerFn({ method: 'POST' })
  .validator(discipleIdSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    await requireCanEditDisciple(access, data.id)
    await db
      .update(disciplePortalLinks)
      .set({ isEnabled: false })
      .where(eq(disciplePortalLinks.discipleId, data.id))
  })

export type { DiscipleInput }

/** A guest's or a new believer's details, to start their disciple form. */
export const getDisciplePrefill = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      fromGuest: z.string().optional(),
      fromBeliever: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAccess()
    const table = data.fromGuest
      ? newComers
      : data.fromBeliever
        ? newBelievers
        : null
    const id = data.fromGuest ?? data.fromBeliever
    if (!table || !id) return null
    const [row] = await db
      .select({
        name: table.name,
        gender: table.gender,
        memberType: table.memberType,
        contactNo: table.contactNo,
        address: table.address,
        discipleProfileId: table.discipleProfileId,
      })
      .from(table)
      .where(eq(table.id, id))
    if (!row) return null
    return {
      ...row,
      kind: data.fromGuest ? ('guest' as const) : ('believer' as const),
      id,
    }
  })
