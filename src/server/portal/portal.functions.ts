import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import {
  attendances,
  attendedCellGroups,
  cellReports,
  disciplePortalLinks,
  disciples,
  lessons,
  newBelievers,
  soulWinningNewBelievers,
  soulWinningReports,
  users,
} from '@/db/schema'
import { dateTime, dayToDate, fromLocalInput, manilaDay } from '@/lib/dates'
import { cellReportSchema } from '@/lib/cell-reports/schema'
import { portalDiscipleSchema } from '@/lib/disciples/schema'
import { newBelieverSchema } from '@/lib/soul-winning/schema'
import type { CellReportInput } from '@/lib/cell-reports/schema'
import { CELL_TYPE } from '@/lib/labels'
import { portalReportEmail } from '@/lib/email/templates'
import { sendEmail, site } from '@/server/email/send.server'
import {
  attendeeChoices,
  insertReport,
  lessonChoices,
  suggestedLesson,
} from '@/server/cell-reports/cell-reports.server'
import {
  attendanceHistory,
  lessonsTaken,
} from '@/server/disciples/disciple-detail.queries'

/* The disciple portal: no sign-in, the link's token is the key. It only
   ever shows the one disciple the token belongs to, and only while the
   link is on and they are an active, non-primary disciple. */

const tokenSchema = z.object({ token: z.string().min(16).max(64) })
const leader = alias(disciples, 'leader')
const handler = alias(disciples, 'handler')

class PortalClosed extends Error {
  constructor() {
    super('This link doesn’t work anymore. Ask your leader for a new one.')
  }
}

async function discipleFor(token: string) {
  const [row] = await db
    .select({
      linkId: disciplePortalLinks.id,
      lastOpenedAt: disciplePortalLinks.lastOpenedAt,
      disciple: disciples,
      leaderName: leader.name,
      handledByName: handler.name,
    })
    .from(disciplePortalLinks)
    .innerJoin(disciples, eq(disciples.id, disciplePortalLinks.discipleId))
    .leftJoin(leader, eq(leader.id, disciples.leaderId))
    .leftJoin(handler, eq(handler.id, disciples.handledById))
    .where(
      and(
        eq(disciplePortalLinks.token, token),
        eq(disciplePortalLinks.isEnabled, true),
        eq(disciples.isDeleted, false),
        eq(disciples.isActive, true),
        eq(disciples.isPrimary, false),
      ),
    )
  if (!row) throw new PortalClosed()
  return row
}

export const getPortal = createServerFn({ method: 'GET' })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    const d = row.disciple
    // Counted at most every ten minutes, so a refresh doesn't write.
    if (!row.lastOpenedAt || Date.now() - row.lastOpenedAt.getTime() > 600_000)
      await db
        .update(disciplePortalLinks)
        .set({ lastOpenedAt: new Date() })
        .where(eq(disciplePortalLinks.id, row.linkId))

    const [history, taken, nextService, lastCell] = await Promise.all([
      attendanceHistory(d.id),
      lessonsTaken(d.id),
      db
        .select({ title: attendances.title, date: attendances.date })
        .from(attendances)
        .where(gte(attendances.date, dayToDate(manilaDay())))
        .orderBy(asc(attendances.date))
        .limit(1),
      db
        .select({ date: cellReports.date, venue: cellReports.venue })
        .from(attendedCellGroups)
        .innerJoin(
          cellReports,
          eq(cellReports.id, attendedCellGroups.cellReportId),
        )
        .where(eq(attendedCellGroups.discipleId, d.id))
        .orderBy(desc(cellReports.date))
        .limit(1),
    ])
    const leaderName = row.handledByName ?? row.leaderName
    const [leaderContact] = await db
      .select({ contactNo: disciples.contactNo })
      .from(disciples)
      .where(eq(disciples.id, d.handledById ?? d.leaderId ?? ''))
    return {
      name: d.name,
      gender: d.gender,
      processLevel: d.processLevel,
      processLevelStatus: d.processLevelStatus,
      leader: leaderName
        ? { name: leaderName, contactNo: leaderContact?.contactNo ?? null }
        : null,
      history,
      lessons: taken.slice(0, 30),
      lessonCount: taken.length,
      nextService: nextService[0] ?? null,
      lastCellGroup: lastCell[0] ?? null,
      contactNo: d.contactNo ?? '',
      address: d.address,
    }
  })

export const updatePortalDetails = createServerFn({ method: 'POST' })
  .validator(
    tokenSchema.extend({
      contactNo: z.string().trim().max(40),
      address: z
        .string()
        .trim()
        .min(1, { message: 'Enter your address' })
        .max(300),
    }),
  )
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    await db
      .update(disciples)
      .set({ contactNo: data.contactNo || null, address: data.address })
      .where(eq(disciples.id, row.disciple.id))
  })

/* ---- Cell reports from the portal ----
   A disciple who handles others (an assistant leader) files reports for
   their own cell group: the network leader is their primary leader, they
   are the report's assistant, and the people they can tick are the ones
   they handle (and themself). */

export const getPortalReportForm = createServerFn({ method: 'GET' })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    const d = row.disciple
    const [people, allLessons] = await Promise.all([
      attendeeChoices({ handlerId: d.id }),
      lessonChoices(),
    ])
    return {
      me: { id: d.id, name: d.name },
      leader: d.leaderId
        ? { id: d.leaderId, name: row.leaderName ?? '' }
        : null,
      people,
      lessons: allLessons,
      suggested: await suggestedLesson({ assistantId: d.id }, allLessons),
      canReport: people.length > 1 && !!d.leaderId,
    }
  })

export const createPortalReport = createServerFn({ method: 'POST' })
  .validator(tokenSchema.extend({ report: cellReportSchema }))
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    const d = row.disciple
    if (!d.leaderId)
      throw new Error('Ask your leader to add you to a network first.')
    const allowed = new Set(
      (await attendeeChoices({ handlerId: d.id })).map((p) => p.id),
    )
    if (data.report.attendees.some((id) => !allowed.has(id)))
      throw new Error('You can only report the people you handle.')
    const made = await insertReport(
      { ...data.report, assistantId: d.id, leaderId: d.leaderId },
      d.leaderId,
    )
    // Tell the network leader; a failed email never fails the report.
    await notifyLeader(d.leaderId, d.name, made.id, data.report).catch(
      (e: unknown) => console.error('Portal report email failed', e),
    )
    return made
  })

async function notifyLeader(
  leaderId: string,
  discipleName: string,
  reportId: string,
  report: CellReportInput,
) {
  const [to] = await db
    .select({ name: disciples.name, email: users.email })
    .from(disciples)
    .innerJoin(users, eq(users.clerkId, disciples.userAccountId))
    .where(eq(disciples.id, leaderId))
  if (!to) return
  const [names, [lesson]] = await Promise.all([
    report.attendees.length
      ? db
          .select({ name: disciples.name })
          .from(disciples)
          .where(inArray(disciples.id, report.attendees))
      : Promise.resolve([]),
    report.lessonId
      ? db
          .select({ title: lessons.title })
          .from(lessons)
          .where(eq(lessons.id, report.lessonId))
      : Promise.resolve([]),
  ])
  await sendEmail({
    to: to.email,
    tag: 'portal-report',
    idempotencyKey: `portal-report-${reportId}`,
    email: portalReportEmail(
      { site: site() },
      {
        leader: to.name,
        disciple: discipleName,
        type: CELL_TYPE[report.type],
        date: dateTime(fromLocalInput(report.date)),
        venue: report.venue,
        lesson: lesson?.title ?? report.lessonTitle ?? null,
        attendees: names.map((n) => n.name),
        reportId,
      },
    ),
  })
}

/** The portal's own reports, newest first. */
/** The portal's own reports of every kind, newest first: cell groups it
 * led (as the assistant) and soul-winning or consolidation sessions, each
 * with its kind, when, how many came and the lesson. */
export const getPortalReports = createServerFn({ method: 'GET' })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    const me = row.disciple.id
    const [cells, sessions] = await Promise.all([
      db
        .select({
          id: cellReports.id,
          date: cellReports.date,
          venue: cellReports.venue,
          type: cellReports.type,
          topic: sql<
            string | null
          >`coalesce(${lessons.title}, ${cellReports.lessonTitle})`,
          attendees:
            sql<number>`(select count(*) from ${attendedCellGroups} where ${attendedCellGroups.cellReportId} = ${cellReports.id})`.mapWith(
              Number,
            ),
        })
        .from(cellReports)
        .leftJoin(lessons, eq(lessons.id, cellReports.lessonId))
        .where(eq(cellReports.assistantId, me))
        .orderBy(desc(cellReports.date))
        .limit(30),
      db
        .select({
          id: soulWinningReports.id,
          date: soulWinningReports.date,
          venue: soulWinningReports.venue,
          type: soulWinningReports.type,
          topic: lessons.title,
          attendees:
            sql<number>`(select count(*) from ${soulWinningNewBelievers} where ${soulWinningNewBelievers.reportId} = ${soulWinningReports.id})`.mapWith(
              Number,
            ),
        })
        .from(soulWinningReports)
        .leftJoin(lessons, eq(lessons.id, soulWinningReports.lessonId))
        .where(eq(soulWinningReports.assistantLeaderId, me))
        .orderBy(desc(soulWinningReports.date))
        .limit(30),
    ])
    return [...cells, ...sessions]
      .sort((x, y) => y.date.getTime() - x.date.getTime())
      .slice(0, 40)
  })

/** The disciples this disciple handles (their "Disciples" tab). */
export const getPortalDisciples = createServerFn({ method: 'GET' })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    return db
      .select({
        id: disciples.id,
        name: disciples.name,
        memberType: disciples.memberType,
        cellStatus: disciples.cellStatus,
        churchStatus: disciples.churchStatus,
        processLevel: disciples.processLevel,
        contactNo: disciples.contactNo,
      })
      .from(disciples)
      .where(
        and(
          eq(disciples.handledById, row.disciple.id),
          eq(disciples.isDeleted, false),
          eq(disciples.isActive, true),
        ),
      )
      .orderBy(asc(disciples.name))
  })

/** Someone this disciple handles, added from their page: in their
 * leader's network, handled by them, at the start of the Growth Process. */
export const createPortalDisciple = createServerFn({ method: 'POST' })
  .validator(tokenSchema.extend({ disciple: portalDiscipleSchema }))
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    const d = row.disciple
    if (!d.leaderId)
      throw new Error('Ask your leader to add you to a network first.')
    const v = data.disciple
    const [made] = await db
      .insert(disciples)
      .values({
        name: v.name,
        address: v.address,
        birthdate: dayToDate(v.birthdate),
        gender: v.gender,
        contactNo: v.contactNo?.trim() || null,
        memberType: v.memberType,
        cellStatus: v.cellStatus,
        churchStatus: v.churchStatus,
        processLevel: 'NONE',
        processLevelStatus: 'NOT_STARTED',
        isMyPrimary: false,
        leaderId: d.leaderId,
        handledById: d.id,
      })
      .returning({ id: disciples.id })
    return made
  })

/** What a soul-winning or consolidation session from the portal needs:
 * the lessons, and the new believers this disciple handles. */
export const getPortalSessionForm = createServerFn({ method: 'GET' })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    const [allLessons, believers] = await Promise.all([
      lessonChoices(),
      db
        .select({ id: newBelievers.id, name: newBelievers.name })
        .from(newBelievers)
        .where(
          and(
            eq(newBelievers.handledById, row.disciple.id),
            isNull(newBelievers.discipleProfileId),
          ),
        )
        .orderBy(asc(newBelievers.name)),
    ])
    return { lessons: allLessons, believers }
  })

/** A soul-winning session (new believers won) or a consolidation (the
 * believers this disciple handles), filed in their leader's network with
 * them as the one who won or followed up. */
export const createPortalSession = createServerFn({ method: 'POST' })
  .validator(
    tokenSchema.extend({
      kind: z.enum(['SOUL_WINNING', 'CONSOLIDATION']),
      venue: z.string().trim().min(1, { message: 'Where was it?' }).max(200),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
      lessonId: z.string().min(1, { message: 'Choose the lesson' }),
      newBelievers: z.array(newBelieverSchema).max(50).default([]),
      newBelieverIds: z.array(z.string()).max(100).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    const d = row.disciple
    if (!d.leaderId)
      throw new Error('Ask your leader to add you to a network first.')
    const leaderId = d.leaderId
    if (data.kind === 'SOUL_WINNING' && data.newBelievers.length === 0)
      throw new Error('Add at least one new believer.')
    if (data.kind === 'CONSOLIDATION') {
      if (data.newBelieverIds.length === 0)
        throw new Error('Tick at least one believer.')
      const mine = await db
        .select({ id: newBelievers.id })
        .from(newBelievers)
        .where(
          and(
            inArray(newBelievers.id, data.newBelieverIds),
            eq(newBelievers.handledById, d.id),
          ),
        )
      if (mine.length !== new Set(data.newBelieverIds).size)
        throw new Error('You can only follow up the believers you handle.')
    }
    return db.transaction(async (tx) => {
      const ids =
        data.kind === 'SOUL_WINNING'
          ? (
              await tx
                .insert(newBelievers)
                .values(
                  data.newBelievers.map((b) => ({
                    name: b.name,
                    gender: b.gender,
                    memberType: b.memberType,
                    contactNo: b.contactNo || null,
                    networkLeaderId: leaderId,
                    handledById: d.id,
                  })),
                )
                .returning({ id: newBelievers.id })
            ).map((b) => b.id)
          : [...new Set(data.newBelieverIds)]
      const [report] = await tx
        .insert(soulWinningReports)
        .values({
          venue: data.venue,
          date: fromLocalInput(data.date),
          lessonId: data.lessonId,
          type: data.kind,
          networkLeaderId: leaderId,
          assistantLeaderId: d.id,
        })
        .returning({ id: soulWinningReports.id })
      await tx
        .insert(soulWinningNewBelievers)
        .values(ids.map((id) => ({ newBelieverId: id, reportId: report.id })))
      return report
    })
  })
