import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  or,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import {
  attendanceDisciples,
  attendances,
  attendedCellGroups,
  cellReports,
  disciplePortalLinks,
  disciples,
  lessons,
} from '@/db/schema'
import { addDays, manilaDay, manilaDayStart, weekStart } from '@/lib/dates'

const leader = alias(disciples, 'leader')
const handler = alias(disciples, 'handler')
const reportLeader = alias(disciples, 'reportLeader')

export const WEEKS = 12

export async function findDisciple(id: string) {
  const [row] = await db
    .select({
      disciple: disciples,
      leaderName: leader.name,
      handledByName: handler.name,
    })
    .from(disciples)
    .leftJoin(leader, eq(leader.id, disciples.leaderId))
    .leftJoin(handler, eq(handler.id, disciples.handledById))
    .where(and(eq(disciples.id, id), eq(disciples.isDeleted, false)))
  return row ?? null
}

/** For each of the last 12 Manila weeks (oldest first), whether they came
 * to a cell group; and for the last 12 Sunday services, whether they were
 * marked present. */
export async function attendanceHistory(discipleId: string) {
  const firstWeek = addDays(weekStart(manilaDay()), -7 * (WEEKS - 1))
  const since = manilaDayStart(firstWeek)
  const cellDates = await db
    .select({ date: cellReports.date })
    .from(attendedCellGroups)
    .innerJoin(cellReports, eq(cellReports.id, attendedCellGroups.cellReportId))
    .where(
      and(
        eq(attendedCellGroups.discipleId, discipleId),
        gte(cellReports.date, since),
      ),
    )
  const weeksHit = new Set(cellDates.map((r) => weekStart(manilaDay(r.date))))
  const cellWeeks = Array.from({ length: WEEKS }, (_, i) =>
    weeksHit.has(addDays(firstWeek, i * 7)),
  )

  const services = await db
    .select({ id: attendances.id })
    .from(attendances)
    .where(eq(attendances.type, 'SUNDAY_SERVICE'))
    .orderBy(desc(attendances.date))
    .limit(WEEKS)
  const present = services.length
    ? await db
        .select({ id: attendanceDisciples.attendanceId })
        .from(attendanceDisciples)
        .where(
          and(
            eq(attendanceDisciples.discipleId, discipleId),
            inArray(
              attendanceDisciples.attendanceId,
              services.map((s) => s.id),
            ),
          ),
        )
    : []
  const presentIds = new Set(present.map((p) => p.id))
  const sundays = services.map((s) => presentIds.has(s.id)).reverse()
  // Fewer than 12 services so far: the missing weeks show as not there.
  while (sundays.length < WEEKS) sundays.unshift(false)
  return { cellWeeks, sundays }
}

export async function recentCellGroups(discipleId: string, limit = 10) {
  return db
    .select({
      id: cellReports.id,
      date: cellReports.date,
      type: cellReports.type,
      lessonTitle: lessons.title,
      customTitle: cellReports.lessonTitle,
      leaderName: reportLeader.name,
    })
    .from(attendedCellGroups)
    .innerJoin(cellReports, eq(cellReports.id, attendedCellGroups.cellReportId))
    .leftJoin(lessons, eq(lessons.id, cellReports.lessonId))
    .leftJoin(reportLeader, eq(reportLeader.id, cellReports.leaderId))
    .where(eq(attendedCellGroups.discipleId, discipleId))
    .orderBy(desc(cellReports.date))
    .limit(limit)
}

/** Lessons from the cell groups they came to, newest first, each once. */
export async function lessonsTaken(discipleId: string) {
  const rows = await db
    .select({
      lessonId: cellReports.lessonId,
      title: lessons.title,
      customTitle: cellReports.lessonTitle,
      date: cellReports.date,
    })
    .from(attendedCellGroups)
    .innerJoin(cellReports, eq(cellReports.id, attendedCellGroups.cellReportId))
    .leftJoin(lessons, eq(lessons.id, cellReports.lessonId))
    .where(eq(attendedCellGroups.discipleId, discipleId))
    .orderBy(desc(cellReports.date))
  const seen = new Set<string>()
  const out: Array<{ title: string; date: Date }> = []
  for (const r of rows) {
    const title = (r.title ?? r.customTitle ?? '').trim()
    if (!title) continue
    const key = r.lessonId ?? title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ title, date: r.date })
  }
  return out
}

/** The disciples someone leads or handles. */
export async function handledDisciples(discipleId: string, isPrimary: boolean) {
  return db
    .select({
      id: disciples.id,
      name: disciples.name,
      gender: disciples.gender,
      memberType: disciples.memberType,
      processLevel: disciples.processLevel,
      churchStatus: disciples.churchStatus,
    })
    .from(disciples)
    .where(
      and(
        eq(disciples.isDeleted, false),
        eq(disciples.isActive, true),
        isPrimary
          ? or(
              eq(disciples.leaderId, discipleId),
              eq(disciples.handledById, discipleId),
            )
          : eq(disciples.handledById, discipleId),
      ),
    )
    .orderBy(asc(disciples.name))
}

export async function cellGroupCount(discipleId: string) {
  const [row] = await db
    .select({ n: count(), lessons: countDistinct(cellReports.lessonId) })
    .from(attendedCellGroups)
    .innerJoin(cellReports, eq(cellReports.id, attendedCellGroups.cellReportId))
    .where(eq(attendedCellGroups.discipleId, discipleId))
  return row ?? { n: 0, lessons: 0 }
}

export async function portalLinkOf(discipleId: string) {
  const [row] = await db
    .select()
    .from(disciplePortalLinks)
    .where(eq(disciplePortalLinks.discipleId, discipleId))
  return row ?? null
}
