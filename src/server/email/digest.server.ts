import { and, count, desc, eq, gte, lt, max, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import {
  attendanceDisciples,
  attendanceNewComers,
  attendances,
  cellReports,
  disciples,
  soulWinningNewBelievers,
  soulWinningReports,
} from '@/db/schema'
import { rangeBounds } from '@/server/cell-reports/cell-reports.server'
import {
  addDays,
  dateToDay,
  manilaDay,
  monthLabel,
  shortDay,
} from '@/lib/dates'
import { MEMBER_TYPE } from '@/lib/labels'
import type { Digest, DigestKind } from '@/lib/digest/types'

/** "Nov 24–30" for a Monday (YYYY-MM-DD), the week's Sunday included. */
export function weekLabel(monday: string) {
  const a = shortDay(monday)
  const b = shortDay(addDays(monday, 6))
  return a.slice(0, 3) === b.slice(0, 3) ? `${a}–${b.slice(4)}` : `${a} – ${b}`
}

const daysSince = (d: Date | string | null) =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) : null

/** The period a report covers: last week or last month, as Manila saw
 * it. (Its start is a Manila midnight, so its day comes from `manilaDay`,
 * not from the UTC date.) */
export function digestPeriod(kind: DigestKind) {
  const [from, to] = rangeBounds(kind === 'week' ? 'last_week' : 'last_month')!
  const key = manilaDay(from)
  return {
    from,
    to,
    key,
    label: kind === 'week' ? weekLabel(key) : monthLabel(key),
  }
}

/** The six things a report answers, for the whole church. */
export async function buildDigest(kind: DigestKind): Promise<Digest> {
  const { from, to, key, label } = digestPeriod(kind)
  const inPeriod = (col: AnyPgColumn) => and(gte(col, from), lt(col, to))
  // As in Insights, soul winning comes from the Soul winning module only:
  // v2's old "Soul Winning" cell report type isn't counted.
  const cellScope = and(
    ne(cellReports.type, 'SOULWINNING'),
    inPeriod(cellReports.date),
  )
  const helper = alias(disciples, 'digest_assistant')
  const [leaders, byType, byLeader, handlers, sw, [souls], sundays, people] =
    await Promise.all([
      db
        .select({
          id: disciples.id,
          name: disciples.name,
          last: max(cellReports.date),
        })
        .from(disciples)
        .leftJoin(cellReports, eq(cellReports.leaderId, disciples.id))
        .where(
          and(
            eq(disciples.isPrimary, true),
            eq(disciples.isActive, true),
            eq(disciples.isDeleted, false),
          ),
        )
        .groupBy(disciples.id, disciples.name),
      db
        .select({ type: cellReports.type, n: count() })
        .from(cellReports)
        .where(cellScope)
        .groupBy(cellReports.type),
      db
        .select({
          id: cellReports.leaderId,
          type: cellReports.type,
          n: count(),
        })
        .from(cellReports)
        .where(cellScope)
        .groupBy(cellReports.leaderId, cellReports.type),
      db
        .select({ id: helper.id, name: helper.name, n: count() })
        .from(cellReports)
        .innerJoin(helper, eq(helper.id, cellReports.assistantId))
        .where(cellScope)
        .groupBy(helper.id, helper.name)
        .orderBy(desc(count()), helper.name),
      db
        .select({ type: soulWinningReports.type, n: count() })
        .from(soulWinningReports)
        .where(inPeriod(soulWinningReports.date))
        .groupBy(soulWinningReports.type),
      db
        .select({
          n: sql<number>`count(distinct ${soulWinningNewBelievers.newBelieverId})`.mapWith(
            Number,
          ),
        })
        .from(soulWinningNewBelievers)
        .innerJoin(
          soulWinningReports,
          eq(soulWinningReports.id, soulWinningNewBelievers.reportId),
        )
        .where(
          and(
            eq(soulWinningReports.type, 'SOUL_WINNING'),
            inPeriod(soulWinningReports.date),
          ),
        ),
      db
        .select({
          date: attendances.date,
          title: attendances.title,
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
            inPeriod(attendances.date),
          ),
        )
        .orderBy(attendances.date),
      db
        .select({
          memberType: disciples.memberType,
          churchStatus: disciples.churchStatus,
          n: count(),
        })
        .from(disciples)
        .where(
          and(eq(disciples.isDeleted, false), eq(disciples.isActive, true)),
        )
        .groupBy(disciples.memberType, disciples.churchStatus),
    ])

  const c = (t: string) => byType.find((r) => r.type === t)?.n ?? 0
  const w = (t: string) => sw.find((r) => r.type === t)?.n ?? 0
  const name = new Map(leaders.map((l) => [l.id, l.name]))
  const per = new Map<string, { open: number; discipleship: number }>()
  for (const r of byLeader) {
    const row = per.get(r.id) ?? { open: 0, discipleship: 0 }
    if (r.type === 'OPEN') row.open += r.n
    else if (r.type === 'DISCIPLESHIP') row.discipleship += r.n
    per.set(r.id, row)
  }
  const reportedIds = new Set(
    [...per].filter(([, v]) => v.open + v.discipleship > 0).map(([id]) => id),
  )
  const notReported = leaders
    .filter((l) => !reportedIds.has(l.id))
    .map((l) => ({ name: l.name, days: daysSince(l.last) }))
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))
    .map((l) => ({
      name: l.name,
      last:
        l.days === null ? 'No reports yet' : `Last report ${l.days} days ago`,
    }))

  const rows = (['KIDS', 'YOUTH', 'YOUNGPRO', 'MEN', 'WOMEN'] as const).map(
    (type) => {
      const of = (status: string) =>
        people
          .filter((p) => p.memberType === type && p.churchStatus === status)
          .reduce((a, p) => a + p.n, 0)
      const nacs = of('NACS')
      const acs = of('ACS')
      const regular = of('REGULAR')
      return {
        label: MEMBER_TYPE[type],
        total: nacs + acs + regular,
        nacs,
        acs,
        regular,
      }
    },
  )

  return {
    kind,
    label,
    key,
    reports: {
      open: c('OPEN'),
      discipleship: c('DISCIPLESHIP'),
      soulWinning: w('SOUL_WINNING'),
      consolidation: w('CONSOLIDATION'),
    },
    newBelievers: souls.n,
    byLeader: [...per]
      .filter(([id, v]) => name.has(id) && v.open + v.discipleship > 0)
      .map(([id, v]) => ({ name: name.get(id)!, ...v }))
      .sort(
        (a, b) =>
          b.open + b.discipleship - (a.open + a.discipleship) ||
          a.name.localeCompare(b.name),
      ),
    assistants: handlers.map((h) => ({ name: h.name, n: h.n })),
    sundays: sundays.map((s) => ({
      date: shortDay(dateToDay(s.date)),
      title: s.title,
      total: s.members + s.guests,
      guests: s.guests,
    })),
    leaders: leaders.length,
    reported: leaders.length - notReported.length,
    notReported,
    members: {
      total: rows.reduce((a, r) => a + r.total, 0),
      rows: rows.filter((r) => r.total > 0),
    },
  }
}
