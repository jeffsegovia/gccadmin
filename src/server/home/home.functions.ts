import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, lt, max, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import {
  attendanceDisciples,
  attendanceNewComers,
  attendances,
  cellReports,
  disciples,
  newBelievers,
  soulWinningNewBelievers,
  soulWinningReports,
} from '@/db/schema'
import { requireAccess, seesEveryone } from '@/server/auth/access.server'
import {
  listReports,
  rangeBounds,
} from '@/server/cell-reports/cell-reports.server'
import { addDays, dayToDate, manilaDay } from '@/lib/dates'
import { weekBirthdays } from '@/server/home/birthdays.server'

const leader = alias(disciples, 'leader')

/** Home: this week at a glance, for the whole church (admins, pastors) or
 * the leader's own network. */
export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  const access = await requireAccess()
  const everyone = seesEveryone(access)
  const me = access.disciple?.id ?? null
  const week = rangeBounds('this_week')!
  const month = rangeBounds('this_month')!
  const today = manilaDay()

  const networkOnly = (col: typeof disciples.leaderId) =>
    everyone
      ? undefined
      : me
        ? or(eq(col, me), eq(disciples.handledById, me))
        : sql`false`

  const [
    [discipleTotal],
    statusRows,
    [primaryTotal],
    reportedLeaders,
    [souls],
    services,
    upcoming,
    lastReports,
    thisWeek,
  ] = await Promise.all([
    db
      .select({ n: count() })
      .from(disciples)
      .where(
        and(
          eq(disciples.isDeleted, false),
          eq(disciples.isActive, true),
          networkOnly(disciples.leaderId),
        ),
      ),
    db
      .select({ status: disciples.churchStatus, n: count() })
      .from(disciples)
      .where(
        and(
          eq(disciples.isDeleted, false),
          eq(disciples.isActive, true),
          networkOnly(disciples.leaderId),
        ),
      )
      .groupBy(disciples.churchStatus),
    db
      .select({ n: count() })
      .from(disciples)
      .where(
        and(
          eq(disciples.isPrimary, true),
          eq(disciples.isActive, true),
          eq(disciples.isDeleted, false),
        ),
      ),
    db
      .selectDistinct({ id: cellReports.leaderId })
      .from(cellReports)
      .where(
        and(gte(cellReports.date, week[0]), lt(cellReports.date, week[1])),
      ),
    db
      .select({ n: count() })
      .from(soulWinningNewBelievers)
      .innerJoin(
        soulWinningReports,
        eq(soulWinningReports.id, soulWinningNewBelievers.reportId),
      )
      .innerJoin(
        newBelievers,
        eq(newBelievers.id, soulWinningNewBelievers.newBelieverId),
      )
      .where(
        and(
          eq(soulWinningReports.type, 'SOUL_WINNING'),
          gte(soulWinningReports.date, month[0]),
          lt(soulWinningReports.date, month[1]),
          everyone
            ? undefined
            : me
              ? eq(soulWinningReports.networkLeaderId, me)
              : sql`false`,
        ),
      ),
    // The last 12 Sunday services, with who came.
    db
      .select({
        id: attendances.id,
        date: attendances.date,
        members:
          sql<number>`(select count(*) from ${attendanceDisciples} where ${attendanceDisciples.attendanceId} = ${attendances.id})`.mapWith(
            Number,
          ),
        guests:
          sql<number>`(select count(*) from ${attendanceNewComers} where ${attendanceNewComers.attendanceId} = ${attendances.id})`.mapWith(
            Number,
          ),
      })
      .from(attendances)
      .where(
        and(
          eq(attendances.type, 'SUNDAY_SERVICE'),
          lt(attendances.date, dayToDate(addDays(today, 1))),
        ),
      )
      .orderBy(desc(attendances.date))
      .limit(12),
    // The next service, or one still open from the last few days.
    db
      .select({
        id: attendances.id,
        title: attendances.title,
        date: attendances.date,
        isLocked: attendances.isLocked,
      })
      .from(attendances)
      .where(
        and(
          gte(attendances.date, dayToDate(addDays(today, -3))),
          sql`coalesce(${attendances.isLocked}, false) = false`,
        ),
      )
      .orderBy(attendances.date)
      .limit(1),
    // Each primary leader's last report.
    db
      .select({ id: leader.id, name: leader.name, last: max(cellReports.date) })
      .from(leader)
      .leftJoin(cellReports, eq(cellReports.leaderId, leader.id))
      .where(
        and(
          eq(leader.isPrimary, true),
          eq(leader.isActive, true),
          eq(leader.isDeleted, false),
        ),
      )
      .groupBy(leader.id, leader.name),
    listReports({ range: 'this_week', mine: !everyone }, me),
  ])

  const birthdays = await weekBirthdays(today, { everyone, me })

  const reported = new Set(reportedLeaders.map((r) => r.id))
  const notReported = lastReports
    .filter((l) => !reported.has(l.id) && (everyone || l.id === me))
    .map((l) => ({
      id: l.id,
      name: l.name,
      last: l.last ? new Date(l.last).toISOString() : null,
      days: l.last
        ? Math.floor((Date.now() - new Date(l.last).getTime()) / 86_400_000)
        : null,
    }))
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))

  return {
    everyone,
    discipleTotal: discipleTotal.n,
    churchStatus: Object.fromEntries(statusRows.map((r) => [r.status, r.n])),
    leadersReported: reported.size,
    leaderTotal: primaryTotal.n,
    newSouls: souls.n,
    sundays: services
      .map((s) => ({ date: s.date.toISOString(), total: s.members + s.guests }))
      .reverse(),
    upcoming: upcoming[0]
      ? {
          id: upcoming[0].id,
          title: upcoming[0].title,
          date: upcoming[0].date.toISOString(),
        }
      : null,
    notReported,
    thisWeek: thisWeek.rows.slice(0, 6),
    myReportedThisWeek: me ? reported.has(me) : false,
    birthdays,
    today,
  }
})
