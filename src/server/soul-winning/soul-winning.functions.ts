import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  notExists,
  or,
  sql,
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import {
  disciples,
  lessons,
  newBelievers,
  soulWinningNewBelievers,
  soulWinningReports,
} from '@/db/schema'
import {
  AccessError,
  requireAccess,
  seesEveryone,
} from '@/server/auth/access.server'
import type { Access } from '@/server/auth/access.server'
import {
  attendeeChoices,
  lessonChoices,
  rangeBounds,
} from '@/server/cell-reports/cell-reports.server'
import {
  likeTerm,
  listAssistants,
  listLeaders,
} from '@/server/disciples/disciples.queries'
import { fromLocalInput } from '@/lib/dates'
import {
  lessonsTakenBy,
  trackedLessons,
} from '@/server/soul-winning/believers.server'
import {
  consolidationSchema,
  listSoulWinningSchema,
  newBelieverSchema,
  soulWinningSchema,
} from '@/lib/soul-winning/schema'

const leader = alias(disciples, 'leader')
const assistant = alias(disciples, 'assistant')
const handler = alias(disciples, 'handler')

const believerCount = db
  .select({
    reportId: soulWinningNewBelievers.reportId,
    n: sql<number>`count(*)`.mapWith(Number).as('n'),
  })
  .from(soulWinningNewBelievers)
  .groupBy(soulWinningNewBelievers.reportId)
  .as('believer_count')

function scopeOf(access: Access, mine: boolean | undefined) {
  if (seesEveryone(access) && !mine) return undefined
  const id = access.disciple?.id
  return id
    ? or(
        eq(soulWinningReports.networkLeaderId, id),
        eq(soulWinningReports.assistantLeaderId, id),
      )
    : sql`false`
}

export const getSoulWinningPage = createServerFn({ method: 'GET' })
  .validator(listSoulWinningSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const bounds = rangeBounds(data.range ?? 'this_month')
    const everyone = seesEveryone(access)
    const parts: Array<SQL | undefined> = [
      scopeOf(access, data.mine),
      everyone && data.leader
        ? eq(soulWinningReports.networkLeaderId, data.leader)
        : undefined,
      data.assistant
        ? eq(soulWinningReports.assistantLeaderId, data.assistant)
        : undefined,
    ]
    if (bounds)
      parts.push(
        gte(soulWinningReports.date, bounds[0]),
        lt(soulWinningReports.date, bounds[1]),
      )
    const inRange = and(...parts)
    const [stats] = await db
      .select({
        sw: sql<number>`count(*) filter (where ${soulWinningReports.type} = 'SOUL_WINNING')`.mapWith(
          Number,
        ),
        conso:
          sql<number>`count(*) filter (where ${soulWinningReports.type} = 'CONSOLIDATION')`.mapWith(
            Number,
          ),
        souls:
          sql<number>`coalesce(sum(${believerCount.n}) filter (where ${soulWinningReports.type} = 'SOUL_WINNING'), 0)`.mapWith(
            Number,
          ),
      })
      .from(soulWinningReports)
      .leftJoin(
        believerCount,
        eq(believerCount.reportId, soulWinningReports.id),
      )
      .where(inRange)

    const sessions =
      data.view === 'souls'
        ? []
        : await db
            .select({
              id: soulWinningReports.id,
              date: soulWinningReports.date,
              type: soulWinningReports.type,
              venue: soulWinningReports.venue,
              lessonTitle: lessons.title,
              leaderName: leader.name,
              leaderId: soulWinningReports.networkLeaderId,
              assistantName: assistant.name,
              believers: sql<number>`coalesce(${believerCount.n}, 0)`.mapWith(
                Number,
              ),
            })
            .from(soulWinningReports)
            .leftJoin(lessons, eq(lessons.id, soulWinningReports.lessonId))
            .leftJoin(leader, eq(leader.id, soulWinningReports.networkLeaderId))
            .leftJoin(
              assistant,
              eq(assistant.id, soulWinningReports.assistantLeaderId),
            )
            .leftJoin(
              believerCount,
              eq(believerCount.reportId, soulWinningReports.id),
            )
            .where(
              and(
                inRange,
                data.type ? eq(soulWinningReports.type, data.type) : undefined,
              ),
            )
            .orderBy(desc(soulWinningReports.date))
            .limit(200)

    const believerScope =
      everyone && !data.mine
        ? undefined
        : access.disciple
          ? or(
              eq(newBelievers.networkLeaderId, access.disciple.id),
              eq(newBelievers.handledById, access.disciple.id),
            )
          : sql`false`
    const souls =
      data.view !== 'souls'
        ? []
        : await db
            .select({
              id: newBelievers.id,
              name: newBelievers.name,
              gender: newBelievers.gender,
              memberType: newBelievers.memberType,
              leaderName: leader.name,
              handledByName: handler.name,
              discipleProfileId: newBelievers.discipleProfileId,
              createdAt: newBelievers.createdAt,
            })
            .from(newBelievers)
            .leftJoin(leader, eq(leader.id, newBelievers.networkLeaderId))
            .leftJoin(handler, eq(handler.id, newBelievers.handledById))
            .where(
              and(
                believerScope,
                everyone && data.leader
                  ? eq(newBelievers.networkLeaderId, data.leader)
                  : undefined,
                data.wonBy
                  ? eq(newBelievers.handledById, data.wonBy)
                  : undefined,
                data.memberType?.length
                  ? inArray(newBelievers.memberType, data.memberType)
                  : undefined,
                data.session
                  ? inArray(
                      newBelievers.id,
                      db
                        .select({ id: soulWinningNewBelievers.newBelieverId })
                        .from(soulWinningNewBelievers)
                        .where(
                          eq(soulWinningNewBelievers.reportId, data.session),
                        ),
                    )
                  : undefined,
                data.q?.trim()
                  ? ilike(newBelievers.name, likeTerm(data.q))
                  : undefined,
              ),
            )
            .orderBy(asc(newBelievers.name), desc(newBelievers.createdAt))
            .limit(300)

    // Lesson tracking, as v2's New believers table: the soul-winning and
    // consolidation lessons each believer has taken.
    const [allLessons, taken, leaders, winners] =
      data.view === 'souls'
        ? await Promise.all([
            trackedLessons(),
            lessonsTakenBy(souls.map((s) => s.id)),
            everyone ? listLeaders() : Promise.resolve([]),
            db
              .selectDistinct({ id: handler.id, name: handler.name })
              .from(newBelievers)
              .innerJoin(handler, eq(handler.id, newBelievers.handledById))
              .where(believerScope)
              .orderBy(asc(handler.name)),
          ])
        : [
            [],
            new Map<string, Map<string, Date>>(),
            everyone ? await listLeaders() : [],
            [],
          ]
    const shownLessons = data.lessons
      ? allLessons.filter((l) => l.kind === data.lessons)
      : allLessons

    return {
      stats,
      sessions,
      souls: souls.map((s) => {
        const mine = taken.get(s.id) ?? new Map<string, Date>()
        return {
          ...s,
          taken: shownLessons.filter((l) => mine.has(l.id)).map((l) => l.id),
          complete:
            allLessons.length > 0 && allLessons.every((l) => mine.has(l.id)),
        }
      }),
      lessons: shownLessons,
      leaders,
      winners,
      sessionName: data.session
        ? ((
            await db
              .select({ venue: soulWinningReports.venue })
              .from(soulWinningReports)
              .where(eq(soulWinningReports.id, data.session))
          )[0]?.venue ?? null)
        : null,
      myId: access.disciple?.id ?? null,
      everyone,
    }
  })

/** One new believer: their details, sessions and lessons. */
export const getNewBeliever = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    await requireBelieverAccess(access, data.id)
    const [[b], sessions, all, taken] = await Promise.all([
      db
        .select({
          id: newBelievers.id,
          name: newBelievers.name,
          gender: newBelievers.gender,
          memberType: newBelievers.memberType,
          contactNo: newBelievers.contactNo,
          email: newBelievers.email,
          address: newBelievers.address,
          leaderName: leader.name,
          handledByName: handler.name,
          handledById: newBelievers.handledById,
          networkLeaderId: newBelievers.networkLeaderId,
          discipleProfileId: newBelievers.discipleProfileId,
          createdAt: newBelievers.createdAt,
        })
        .from(newBelievers)
        .leftJoin(leader, eq(leader.id, newBelievers.networkLeaderId))
        .leftJoin(handler, eq(handler.id, newBelievers.handledById))
        .where(eq(newBelievers.id, data.id)),
      db
        .select({
          id: soulWinningReports.id,
          date: soulWinningReports.date,
          type: soulWinningReports.type,
          venue: soulWinningReports.venue,
          lessonTitle: lessons.title,
        })
        .from(soulWinningNewBelievers)
        .innerJoin(
          soulWinningReports,
          eq(soulWinningReports.id, soulWinningNewBelievers.reportId),
        )
        .leftJoin(lessons, eq(lessons.id, soulWinningReports.lessonId))
        .where(eq(soulWinningNewBelievers.newBelieverId, data.id))
        .orderBy(desc(soulWinningReports.date)),
      trackedLessons(),
      lessonsTakenBy([data.id]),
    ])
    const mine = taken.get(data.id) ?? new Map<string, Date>()
    // v2: anyone in the believer's network can handle them.
    const handlers = (
      await attendeeChoices({ leaderId: b.networkLeaderId })
    ).map((p) => ({ id: p.id, name: p.name }))
    return {
      ...b,
      handlers,
      sessions,
      lessons: all.map((l) => ({
        ...l,
        takenOn: mine.get(l.id)?.toISOString() ?? null,
      })),
      complete: all.length > 0 && all.every((l) => mine.has(l.id)),
    }
  })

export const getSoulWinningFormOptions = createServerFn({ method: 'GET' })
  .validator(z.object({ leaderId: z.string().optional() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const leaderId = access.isAdmin
      ? (data.leaderId ?? access.disciple?.id)
      : access.disciple?.id
    const [allLessons, leaders, assistants, believers] = await Promise.all([
      lessonChoices(),
      access.isAdmin ? listLeaders() : Promise.resolve([]),
      listAssistants(leaderId),
      leaderId
        ? db
            .select({
              id: newBelievers.id,
              name: newBelievers.name,
              gender: newBelievers.gender,
            })
            .from(newBelievers)
            .where(
              and(
                eq(newBelievers.networkLeaderId, leaderId),
                sql`${newBelievers.discipleProfileId} is null`,
              ),
            )
            .orderBy(asc(newBelievers.name))
        : Promise.resolve([]),
    ])
    return {
      lessons: allLessons,
      leaders,
      assistants,
      believers,
      leaderId: leaderId ?? null,
      chooseLeader: access.isAdmin,
    }
  })

function owner(access: Access, wanted?: string) {
  const id = access.isAdmin
    ? wanted || access.disciple?.id
    : access.disciple?.id
  if (!id) throw new AccessError('Choose the network leader.')
  return id
}

export const createSoulWinning = createServerFn({ method: 'POST' })
  .validator(soulWinningSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const leaderId = owner(access, data.networkLeaderId)
    const assistantId = data.assistantLeaderId || null
    return db.transaction(async (tx) => {
      const made = await tx
        .insert(newBelievers)
        .values(
          data.newBelievers.map((b) => ({
            name: b.name,
            gender: b.gender,
            memberType: b.memberType,
            contactNo: b.contactNo || null,
            email: b.email || null,
            address: b.address || null,
            networkLeaderId: leaderId,
            handledById: assistantId,
          })),
        )
        .returning({ id: newBelievers.id })
      const [report] = await tx
        .insert(soulWinningReports)
        .values({
          venue: data.venue,
          date: fromLocalInput(data.date),
          lessonId: data.lessonId,
          type: 'SOUL_WINNING',
          networkLeaderId: leaderId,
          assistantLeaderId: assistantId,
        })
        .returning({ id: soulWinningReports.id })
      await tx
        .insert(soulWinningNewBelievers)
        .values(made.map((b) => ({ newBelieverId: b.id, reportId: report.id })))
      return report
    })
  })

export const createConsolidation = createServerFn({ method: 'POST' })
  .validator(consolidationSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const leaderId = owner(access, data.networkLeaderId)
    return db.transaction(async (tx) => {
      const [report] = await tx
        .insert(soulWinningReports)
        .values({
          venue: data.venue,
          date: fromLocalInput(data.date),
          lessonId: data.lessonId,
          type: 'CONSOLIDATION',
          networkLeaderId: leaderId,
          assistantLeaderId: data.assistantLeaderId || null,
        })
        .returning({ id: soulWinningReports.id })
      await tx
        .insert(soulWinningNewBelievers)
        .values(
          [...new Set(data.newBelieverIds)].map((id) => ({
            newBelieverId: id,
            reportId: report.id,
          })),
        )
        .onConflictDoNothing()
      return report
    })
  })

async function requireReportOwner(access: Access, id: string) {
  const [r] = await db
    .select({ leaderId: soulWinningReports.networkLeaderId })
    .from(soulWinningReports)
    .where(eq(soulWinningReports.id, id))
  if (!r) return false
  if (!access.isAdmin && r.leaderId !== access.disciple?.id)
    throw new AccessError('Only its leader can change this report.')
  return true
}

/** Deletes a session. Believers won at it who have no other session go
 * too (v2's version removed every believer with no session at all). */
export const deleteSoulWinning = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    if (!(await requireReportOwner(access, data.id))) return
    await db.transaction(async (tx) => {
      const ids = (
        await tx
          .select({ id: soulWinningNewBelievers.newBelieverId })
          .from(soulWinningNewBelievers)
          .where(eq(soulWinningNewBelievers.reportId, data.id))
      ).map((r) => r.id)
      await tx
        .delete(soulWinningReports)
        .where(eq(soulWinningReports.id, data.id))
      if (ids.length)
        await tx.delete(newBelievers).where(
          and(
            inArray(newBelievers.id, ids),
            sql`${newBelievers.discipleProfileId} is null`,
            notExists(
              tx
                .select({ one: sql`1` })
                .from(soulWinningNewBelievers)
                .where(
                  eq(soulWinningNewBelievers.newBelieverId, newBelievers.id),
                ),
            ),
          ),
        )
    })
  })

async function requireBelieverAccess(access: Access, id: string) {
  const [b] = await db
    .select({
      leaderId: newBelievers.networkLeaderId,
      handledById: newBelievers.handledById,
    })
    .from(newBelievers)
    .where(eq(newBelievers.id, id))
  if (!b) throw new AccessError('That believer isn’t here anymore.')
  const mine = access.disciple?.id
  if (!access.isAdmin && b.leaderId !== mine && b.handledById !== mine)
    throw new AccessError('This believer is in another network.')
}

export const updateNewBeliever = createServerFn({ method: 'POST' })
  .validator(
    newBelieverSchema.extend({
      id: z.string(),
      handledById: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const access = await requireAccess()
    await requireBelieverAccess(access, data.id)
    if (data.handledById) {
      const [b] = await db
        .select({ leaderId: newBelievers.networkLeaderId })
        .from(newBelievers)
        .where(eq(newBelievers.id, data.id))
      const allowed = await attendeeChoices({ leaderId: b.leaderId })
      if (!allowed.some((p) => p.id === data.handledById))
        throw new AccessError('Choose someone in their network.')
    }
    await db
      .update(newBelievers)
      .set({
        name: data.name,
        gender: data.gender,
        memberType: data.memberType,
        contactNo: data.contactNo || null,
        email: data.email || null,
        address: data.address || null,
        ...(data.handledById !== undefined
          ? { handledById: data.handledById }
          : {}),
      })
      .where(eq(newBelievers.id, data.id))
  })

export const deleteNewBeliever = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    await requireBelieverAccess(access, data.id)
    await db.delete(newBelievers).where(eq(newBelievers.id, data.id))
  })
