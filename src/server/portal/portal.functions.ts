import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, gte } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import {
  attendances,
  attendedCellGroups,
  cellReports,
  disciplePortalLinks,
  disciples,
} from '@/db/schema'
import { dayToDate, manilaDay } from '@/lib/dates'
import { cellReportSchema } from '@/lib/cell-reports/schema'
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
    return insertReport(
      { ...data.report, assistantId: d.id, leaderId: d.leaderId },
      d.leaderId,
    )
  })

/** The portal's own reports, newest first. */
export const getPortalReports = createServerFn({ method: 'GET' })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const row = await discipleFor(data.token)
    return db
      .select({
        id: cellReports.id,
        date: cellReports.date,
        venue: cellReports.venue,
      })
      .from(cellReports)
      .where(eq(cellReports.assistantId, row.disciple.id))
      .orderBy(desc(cellReports.date))
      .limit(10)
  })
