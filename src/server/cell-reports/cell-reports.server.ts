import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  or,
  sql,
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import type { Tx } from '@/db'
import {
  attendedCellGroups,
  cellReportAttendeeSnapshots,
  cellReports,
  disciples,
  lessonSeries,
  lessons,
} from '@/db/schema'
import {
  addDays,
  fromLocalInput,
  manilaDay,
  manilaDayStart,
  monthStart,
  weekStart,
} from '@/lib/dates'
import { cellStatusAfter } from '@/lib/cell-reports/status'
import type {
  ReportRange,
  ReportsSearch,
  cellReportSchema,
} from '@/lib/cell-reports/schema'
import type { z } from 'zod'

const leader = alias(disciples, 'leader')
const assistant = alias(disciples, 'assistant')

export const REPORTS_PAGE = 30

/** [from, to) instants for a range, in Manila weeks and months. */
export function rangeBounds(range: ReportRange): [Date, Date] | null {
  const today = manilaDay()
  const week = weekStart(today)
  const month = monthStart(today)
  const nextMonth = (day: string) => {
    const d = new Date(`${day}T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + 1)
    return d.toISOString().slice(0, 10)
  }
  const prevMonth = (day: string) => {
    const d = new Date(`${day}T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - 1)
    return d.toISOString().slice(0, 10)
  }
  switch (range) {
    case 'this_week':
      return [manilaDayStart(week), manilaDayStart(addDays(week, 7))]
    case 'last_week':
      return [manilaDayStart(addDays(week, -7)), manilaDayStart(week)]
    case 'this_month':
      return [manilaDayStart(month), manilaDayStart(nextMonth(month))]
    case 'last_month':
      return [manilaDayStart(prevMonth(month)), manilaDayStart(month)]
    default:
      return null
  }
}

export function reportsWhere(s: ReportsSearch, myId: string | null) {
  const parts: Array<SQL | undefined> = []
  const bounds = rangeBounds(s.range ?? 'this_week')
  if (bounds)
    parts.push(
      gte(cellReports.date, bounds[0]),
      lt(cellReports.date, bounds[1]),
    )
  if (s.mine)
    parts.push(
      myId
        ? or(eq(cellReports.leaderId, myId), eq(cellReports.assistantId, myId))
        : sql`false`,
    )
  if (s.leader) parts.push(eq(cellReports.leaderId, s.leader))
  if (s.type) parts.push(eq(cellReports.type, s.type))
  return and(...parts)
}

const attendeeCount = db
  .select({
    reportId: attendedCellGroups.cellReportId,
    n: sql<number>`count(*)`.mapWith(Number).as('n'),
  })
  .from(attendedCellGroups)
  .groupBy(attendedCellGroups.cellReportId)
  .as('attendee_count')

export async function listReports(
  s: ReportsSearch,
  myId: string | null,
  all = false,
) {
  const where = reportsWhere(s, myId)
  const page = s.page ?? 1
  const q = db
    .select({
      id: cellReports.id,
      date: cellReports.date,
      type: cellReports.type,
      venue: cellReports.venue,
      lessonTitle: sql<
        string | null
      >`coalesce(${lessons.title}, ${cellReports.lessonTitle})`,
      leaderId: cellReports.leaderId,
      leaderName: leader.name,
      assistantName: assistant.name,
      attendees: sql<number>`coalesce(${attendeeCount.n}, 0)`.mapWith(Number),
    })
    .from(cellReports)
    .leftJoin(lessons, eq(lessons.id, cellReports.lessonId))
    .leftJoin(leader, eq(leader.id, cellReports.leaderId))
    .leftJoin(assistant, eq(assistant.id, cellReports.assistantId))
    .leftJoin(attendeeCount, eq(attendeeCount.reportId, cellReports.id))
    .where(where)
    .orderBy(desc(cellReports.date))
  const rows = all
    ? await q
    : await q.limit(REPORTS_PAGE).offset((page - 1) * REPORTS_PAGE)
  const [totals] = await db
    .select({
      reports: count(),
      attendances: sql<number>`coalesce(sum(${attendeeCount.n}), 0)`.mapWith(
        Number,
      ),
    })
    .from(cellReports)
    .leftJoin(attendeeCount, eq(attendeeCount.reportId, cellReports.id))
    .where(where)
  return {
    rows,
    total: totals.reports,
    attendances: totals.attendances,
    page,
    pageSize: REPORTS_PAGE,
  }
}

export type ReportRow = Awaited<ReturnType<typeof listReports>>['rows'][number]

export async function findReport(id: string) {
  const [row] = await db
    .select({
      report: cellReports,
      lessonName: lessons.title,
      seriesTitle: lessonSeries.title,
      leaderName: leader.name,
      assistantName: assistant.name,
    })
    .from(cellReports)
    .leftJoin(lessons, eq(lessons.id, cellReports.lessonId))
    .leftJoin(lessonSeries, eq(lessonSeries.id, lessons.lessonSeriesId))
    .leftJoin(leader, eq(leader.id, cellReports.leaderId))
    .leftJoin(assistant, eq(assistant.id, cellReports.assistantId))
    .where(eq(cellReports.id, id))
  if (!row) return null
  const attendees = await db
    .select({
      id: disciples.id,
      name: sql<string>`coalesce(${cellReportAttendeeSnapshots.name}, ${disciples.name})`,
      gender: disciples.gender,
      statusThen: cellReportAttendeeSnapshots.status,
    })
    .from(attendedCellGroups)
    .innerJoin(disciples, eq(disciples.id, attendedCellGroups.discipleId))
    .leftJoin(
      cellReportAttendeeSnapshots,
      and(
        eq(
          cellReportAttendeeSnapshots.cellReportId,
          attendedCellGroups.cellReportId,
        ),
        eq(
          cellReportAttendeeSnapshots.discipleId,
          attendedCellGroups.discipleId,
        ),
      ),
    )
    .where(eq(attendedCellGroups.cellReportId, id))
    .orderBy(asc(disciples.name))
  return { ...row, attendees }
}

/** Who can be ticked as present: the network's active disciples (the
 * leader themself included), or, for an assistant in the portal, the
 * people they handle and themself. */
export async function attendeeChoices(opts: {
  leaderId?: string
  handlerId?: string
}) {
  if (!opts.leaderId && !opts.handlerId) return []
  const where = opts.handlerId
    ? or(
        eq(disciples.handledById, opts.handlerId),
        eq(disciples.id, opts.handlerId),
      )
    : or(
        eq(disciples.leaderId, opts.leaderId!),
        eq(disciples.id, opts.leaderId!),
      )
  return db
    .select({
      id: disciples.id,
      name: disciples.name,
      gender: disciples.gender,
      cellStatus: disciples.cellStatus,
      isMyPrimary: disciples.isMyPrimary,
    })
    .from(disciples)
    .where(
      and(eq(disciples.isDeleted, false), eq(disciples.isActive, true), where),
    )
    .orderBy(asc(disciples.name))
}

export async function lessonChoices() {
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      seriesId: lessonSeries.id,
      seriesTitle: lessonSeries.title,
    })
    .from(lessons)
    .innerJoin(lessonSeries, eq(lessonSeries.id, lessons.lessonSeriesId))
    .orderBy(
      asc(lessonSeries.title),
      asc(lessons.createdAt),
      asc(lessons.title),
    )
}

/** The lesson after the one this leader (or assistant) taught last, in
 * the same series: what they most likely teach next. */
export async function suggestedLesson(
  who: { leaderId?: string; assistantId?: string },
  all: Awaited<ReturnType<typeof lessonChoices>>,
) {
  const [last] = await db
    .select({ lessonId: cellReports.lessonId })
    .from(cellReports)
    .where(
      and(
        who.assistantId
          ? eq(cellReports.assistantId, who.assistantId)
          : eq(cellReports.leaderId, who.leaderId ?? ''),
        sql`${cellReports.lessonId} is not null`,
      ),
    )
    .orderBy(desc(cellReports.date))
    .limit(1)
  if (!last?.lessonId) return null
  const i = all.findIndex((l) => l.id === last.lessonId)
  const next = all[i + 1]
  return next && next.seriesId === all[i]?.seriesId ? next.id : null
}

type Parsed = z.output<typeof cellReportSchema>

/** Ticks attendees in and moves their cell status on, with a snapshot of
 * who they were that day (v2's history of first-timers). Only people new
 * to this report move on; an edit doesn't move anyone twice. */
async function addAttendees(tx: Tx, reportId: string, ids: Array<string>) {
  if (!ids.length) return
  const people = await tx
    .select({
      id: disciples.id,
      name: disciples.name,
      cellStatus: disciples.cellStatus,
      churchStatus: disciples.churchStatus,
      createdAt: disciples.createdAt,
    })
    .from(disciples)
    .where(inArray(disciples.id, ids))
  const today = manilaDay()
  for (const p of people) {
    const status = cellStatusAfter(
      p.cellStatus,
      manilaDay(p.createdAt) === today,
    )
    if (status !== p.cellStatus)
      await tx
        .update(disciples)
        .set({ cellStatus: status })
        .where(eq(disciples.id, p.id))
    await tx.insert(cellReportAttendeeSnapshots).values({
      discipleId: p.id,
      name: p.name,
      status,
      churchStatus: p.churchStatus,
      cellReportId: reportId,
    })
  }
  await tx
    .insert(attendedCellGroups)
    .values(people.map((p) => ({ cellReportId: reportId, discipleId: p.id })))
    .onConflictDoNothing()
}

function columns(input: Parsed, leaderId: string) {
  const custom = !input.lessonId
  return {
    type: input.type,
    venue: input.venue,
    date: fromLocalInput(input.date),
    lessonId: input.lessonId || null,
    lessonTitle: custom ? input.lessonTitle?.trim() || null : null,
    hasCustomLesson: custom,
    scriptureReferences: input.scriptureReferences,
    assistantId: input.assistantId || null,
    leaderId,
    worship: input.worship,
    work: input.work,
  }
}

export async function insertReport(input: Parsed, leaderId: string) {
  return db.transaction(async (tx) => {
    const [made] = await tx
      .insert(cellReports)
      .values(columns(input, leaderId))
      .returning({ id: cellReports.id })
    await addAttendees(tx, made.id, [...new Set(input.attendees)])
    return made
  })
}

/** In place, keeping its id (v2 deleted and re-made it). */
export async function replaceReport(
  id: string,
  input: Parsed,
  leaderId: string,
) {
  await db.transaction(async (tx) => {
    await tx
      .update(cellReports)
      .set(columns(input, leaderId))
      .where(eq(cellReports.id, id))
    const before = new Set(
      (
        await tx
          .select({ id: attendedCellGroups.discipleId })
          .from(attendedCellGroups)
          .where(eq(attendedCellGroups.cellReportId, id))
      ).map((r) => r.id),
    )
    const after = new Set(input.attendees)
    const removed = [...before].filter((x) => !after.has(x))
    const added = [...after].filter((x) => !before.has(x))
    if (removed.length) {
      await tx
        .delete(attendedCellGroups)
        .where(
          and(
            eq(attendedCellGroups.cellReportId, id),
            inArray(attendedCellGroups.discipleId, removed),
          ),
        )
      await tx
        .delete(cellReportAttendeeSnapshots)
        .where(
          and(
            eq(cellReportAttendeeSnapshots.cellReportId, id),
            inArray(cellReportAttendeeSnapshots.discipleId, removed),
          ),
        )
    }
    await addAttendees(tx, id, added)
  })
}
