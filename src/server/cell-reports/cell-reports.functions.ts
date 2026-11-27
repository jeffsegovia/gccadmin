import { createServerFn } from '@tanstack/react-start'
import { asc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import {
  cellReportAttendeeSnapshots,
  cellReports,
  disciples,
  lessons,
} from '@/db/schema'
import {
  AccessError,
  requireAccess,
  seesEveryone,
} from '@/server/auth/access.server'
import { listLeaders } from '@/server/disciples/disciples.queries'
import { cellReportSchema, listReportsSchema } from '@/lib/cell-reports/schema'
import {
  attendeeChoices,
  findReport,
  insertReport,
  lessonChoices,
  listReports,
  notReportedThisWeek,
  replaceReport,
  suggestedLesson,
} from './cell-reports.server'

/* Everyone with access reads every report, as in v2 (with "Mine" to narrow
   it). A leader files and edits their own network's reports; admins any. */

export const getReportsPage = createServerFn({ method: 'GET' })
  .validator(listReportsSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const me = access.disciple?.id ?? null
    // Who hasn't reported makes sense only for this week, across both
    // kinds of cell group; a leader sees only themselves (as on Home).
    const askNotReported =
      (data.range ?? 'this_week') === 'this_week' &&
      !data.type &&
      !data.assistant
    const only = seesEveryone(access)
      ? data.mine
        ? me
        : (data.leader ?? null)
      : !me || (data.leader && data.leader !== me)
        ? ''
        : me
    const [list, leaders, notReported] = await Promise.all([
      listReports(data, me),
      seesEveryone(access) ? listLeaders() : Promise.resolve([]),
      askNotReported && only !== ''
        ? notReportedThisWeek(only ?? undefined)
        : Promise.resolve(null),
    ])
    return {
      ...list,
      leaders,
      notReported,
      // Reminders are an admin's, as on Home.
      canRemind: access.isAdmin,
      canFilterLeader: seesEveryone(access),
      myId: access.disciple?.id ?? null,
    }
  })

export const exportReports = createServerFn({ method: 'GET' })
  .validator(listReportsSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    return (await listReports(data, access.disciple?.id ?? null, true)).rows
  })

export const getReport = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const found = await findReport(data.id)
    if (!found) throw new AccessError('That report isn’t here anymore.')
    return {
      ...found,
      canEdit: access.isAdmin || found.report.leaderId === access.disciple?.id,
    }
  })

/** Lessons, the network's people and a suggested lesson, for the form. */
export const getReportFormOptions = createServerFn({ method: 'GET' })
  .validator(z.object({ leaderId: z.string().optional() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const leaderId = access.isAdmin
      ? (data.leaderId ?? access.disciple?.id)
      : access.disciple?.id
    const [allLessons, people, leaders] = await Promise.all([
      lessonChoices(),
      attendeeChoices({ leaderId }),
      access.isAdmin ? listLeaders() : Promise.resolve([]),
    ])
    return {
      lessons: allLessons,
      people,
      leaders,
      leaderId: leaderId ?? null,
      chooseLeader: access.isAdmin,
      suggested: leaderId
        ? await suggestedLesson({ leaderId }, allLessons)
        : null,
    }
  })

function ownerFor(
  access: Awaited<ReturnType<typeof requireAccess>>,
  wanted?: string,
) {
  const leaderId = access.isAdmin
    ? (wanted ?? access.disciple?.id)
    : access.disciple?.id
  if (!leaderId) throw new AccessError('Choose the network leader.')
  return leaderId
}

export const createReport = createServerFn({ method: 'POST' })
  .validator(cellReportSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    return insertReport(data, ownerFor(access, data.leaderId))
  })

export const updateReport = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), report: cellReportSchema }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const found = await findReport(data.id)
    if (!found) throw new AccessError('That report isn’t here anymore.')
    if (!access.isAdmin && found.report.leaderId !== access.disciple?.id)
      throw new AccessError('Only its leader can change this report.')
    await replaceReport(
      data.id,
      data.report,
      access.isAdmin
        ? (data.report.leaderId ?? found.report.leaderId)
        : found.report.leaderId,
    )
  })

export const deleteReport = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const found = await findReport(data.id)
    if (!found) return
    if (!access.isAdmin && found.report.leaderId !== access.disciple?.id)
      throw new AccessError('Only its leader can delete this report.')
    await db.delete(cellReports).where(eq(cellReports.id, data.id))
  })

/** Everything v2's PDF page shows, for each report asked for: who led and
 * handled it, the lesson and its scripture, and the attendees as they
 * were that day (the snapshots), oldest report first. */
export const getReportsForPdf = createServerFn({ method: 'GET' })
  .validator(z.object({ ids: z.array(z.string()).min(1).max(500) }))
  .handler(async ({ data }) => {
    await requireAccess()
    const leader = alias(disciples, 'pdf_leader')
    const assistant = alias(disciples, 'pdf_assistant')
    const [reports, people] = await Promise.all([
      db
        .select({
          id: cellReports.id,
          type: cellReports.type,
          date: cellReports.date,
          createdAt: cellReports.createdAt,
          venue: cellReports.venue,
          leaderName: leader.name,
          assistantName: assistant.name,
          lessonTitle: sql<
            string | null
          >`coalesce(${lessons.title}, ${cellReports.lessonTitle})`,
          customLesson: sql<boolean>`${cellReports.lessonId} is null`,
          lessonScripture: lessons.scriptureReferences,
          scripture: cellReports.scriptureReferences,
        })
        .from(cellReports)
        .leftJoin(lessons, eq(lessons.id, cellReports.lessonId))
        .leftJoin(leader, eq(leader.id, cellReports.leaderId))
        .leftJoin(assistant, eq(assistant.id, cellReports.assistantId))
        .where(inArray(cellReports.id, data.ids))
        .orderBy(asc(cellReports.date)),
      db
        .select({
          reportId: cellReportAttendeeSnapshots.cellReportId,
          name: cellReportAttendeeSnapshots.name,
          status: cellReportAttendeeSnapshots.status,
          churchStatus: cellReportAttendeeSnapshots.churchStatus,
        })
        .from(cellReportAttendeeSnapshots)
        .where(inArray(cellReportAttendeeSnapshots.cellReportId, data.ids))
        .orderBy(asc(cellReportAttendeeSnapshots.name)),
    ])
    return reports.map((r) => ({
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      scripture: r.customLesson
        ? (r.scripture ?? [])
        : (r.lessonScripture ?? r.scripture ?? []),
      attendees: people.filter((p) => p.reportId === r.id),
    }))
  })
