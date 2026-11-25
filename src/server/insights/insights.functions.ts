import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, isNotNull, lt, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { REPORT_RANGES } from '@/lib/cell-reports/schema'
import type { ReportRange } from '@/lib/cell-reports/schema'
import { db } from '@/db'
import {
  cellReports,
  disciples,
  soulWinningNewBelievers,
  soulWinningReports,
} from '@/db/schema'
import { requireAccess, seesEveryone } from '@/server/auth/access.server'
import { cached } from '@/server/cache.server'
import { rangeBounds } from '@/server/cell-reports/cell-reports.server'
import {
  addDays,
  manilaDay,
  manilaDayStart,
  monthStart,
  weekStart,
} from '@/lib/dates'

/* Insights: who the disciples are, how many reports were filed in each
   period, and the trend. Admins and pastors see the whole church (or
   their own network); a leader sees their own. */

export const TALLY_RANGES = [
  'this_week',
  'last_week',
  'this_month',
  'last_month',
] as const
export const KINDS = [
  'open',
  'discipleship',
  'soulWinning',
  'consolidation',
] as const
export type Kind = (typeof KINDS)[number]

// Stored timestamps are UTC instants; buckets follow Manila's calendar.
const manila = (col: SQL | AnyPgColumn) =>
  sql`((${col}) at time zone 'UTC') at time zone 'Asia/Manila'`

function prevMonth(day: string) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export const getInsights = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      period: z.enum(['weeks', 'months']).optional(),
      mine: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const everyone = seesEveryone(access) && !data.mine
    const me = access.disciple?.id
    const none = sql`false`

    const discipleScope = everyone
      ? undefined
      : me
        ? or(eq(disciples.leaderId, me), eq(disciples.handledById, me))
        : none
    const cellScope = everyone
      ? undefined
      : me
        ? or(eq(cellReports.leaderId, me), eq(cellReports.assistantId, me))
        : none
    const swScope = everyone
      ? undefined
      : me
        ? or(
            eq(soulWinningReports.networkLeaderId, me),
            eq(soulWinningReports.assistantLeaderId, me),
          )
        : none

    // Two minutes is fresh enough for trends, and saves the database the
    // same summary for everyone who opens Insights.
    const key = `insights:${everyone ? 'all' : (me ?? 'none')}:${data.period ?? 'weeks'}:${manilaDay()}`
    return cached(key, 120_000, async () => {
      const base = and(
        eq(disciples.isDeleted, false),
        eq(disciples.isActive, true),
        discipleScope,
      )

      // Tallies: one pass per table over the span the four ranges cover,
      // each range counted with a FILTER (2 queries instead of 8).
      const bounds = TALLY_RANGES.map((r) => [r, rangeBounds(r)!] as const)
      const spanFrom = new Date(
        Math.min(...bounds.map(([, b]) => b[0].getTime())),
      )
      const spanTo = new Date(
        Math.max(...bounds.map(([, b]) => b[1].getTime())),
      )
      const inRange = (col: AnyPgColumn, [from, to]: readonly [Date, Date]) =>
        sql<number>`count(*) filter (where ${col} >= ${from.toISOString()} and ${col} < ${to.toISOString()})`.mapWith(
          Number,
        )
      const cellTallyCols = Object.fromEntries(
        bounds.map(([r, b]) => [r, inRange(cellReports.date, b)]),
      ) as Record<(typeof TALLY_RANGES)[number], SQL<number>>
      const swTallyCols = Object.fromEntries(
        bounds.map(([r, b]) => [r, inRange(soulWinningReports.date, b)]),
      ) as Record<(typeof TALLY_RANGES)[number], SQL<number>>

      // Trend: the last 12 weeks or 6 months, oldest first.
      const period = data.period ?? 'weeks'
      const today = manilaDay()
      const starts: Array<string> = []
      if (period === 'weeks') {
        const w = weekStart(today)
        for (let i = 11; i >= 0; i--) starts.push(addDays(w, -7 * i))
      } else {
        let m = monthStart(today)
        for (let i = 0; i < 6; i++) {
          starts.unshift(m)
          m = prevMonth(m)
        }
      }
      const since = manilaDayStart(starts[0])
      const unit = period === 'weeks' ? 'week' : 'month'
      const bucketCell = sql<string>`to_char(date_trunc('${sql.raw(unit)}', ${manila(cellReports.date)}), 'YYYY-MM-DD')`
      const bucketSw = sql<string>`to_char(date_trunc('${sql.raw(unit)}', ${manila(soulWinningReports.date)}), 'YYYY-MM-DD')`

      // v2's dashboard: soul winning year to date, and this week's cell
      // groups led by an assistant (a disciple leading their own group).
      const yearFrom = manilaDayStart(`${today.slice(0, 4)}-01-01`)
      const week = rangeBounds('this_week')!
      const assistant = alias(disciples, 'assistant')
      const [cellTally, swTally, cellTrend, swTrend, people, [ytd], [cg], led] =
        await Promise.all([
          db
            .select({ type: cellReports.type, ...cellTallyCols })
            .from(cellReports)
            .where(
              and(
                gte(cellReports.date, spanFrom),
                lt(cellReports.date, spanTo),
                cellScope,
              ),
            )
            .groupBy(cellReports.type),
          db
            .select({ type: soulWinningReports.type, ...swTallyCols })
            .from(soulWinningReports)
            .where(
              and(
                gte(soulWinningReports.date, spanFrom),
                lt(soulWinningReports.date, spanTo),
                swScope,
              ),
            )
            .groupBy(soulWinningReports.type),
          db
            .select({ bucket: bucketCell, type: cellReports.type, n: count() })
            .from(cellReports)
            .where(and(gte(cellReports.date, since), cellScope))
            .groupBy(bucketCell, cellReports.type),
          db
            .select({
              bucket: bucketSw,
              type: soulWinningReports.type,
              n: count(),
            })
            .from(soulWinningReports)
            .where(and(gte(soulWinningReports.date, since), swScope))
            .groupBy(bucketSw, soulWinningReports.type),
          // One grouped pass gives all three breakdowns (at most 72 rows).
          db
            .select({
              memberType: disciples.memberType,
              churchStatus: disciples.churchStatus,
              cellStatus: disciples.cellStatus,
              n: count(),
            })
            .from(disciples)
            .where(base)
            .groupBy(
              disciples.memberType,
              disciples.churchStatus,
              disciples.cellStatus,
            ),
          db
            .select({
              soulWinning:
                sql<number>`count(distinct ${soulWinningReports.id}) filter (where ${soulWinningReports.type} = 'SOUL_WINNING')`.mapWith(
                  Number,
                ),
              consolidation:
                sql<number>`count(distinct ${soulWinningReports.id}) filter (where ${soulWinningReports.type} = 'CONSOLIDATION')`.mapWith(
                  Number,
                ),
              believers:
                sql<number>`count(distinct ${soulWinningNewBelievers.newBelieverId}) filter (where ${soulWinningReports.type} = 'SOUL_WINNING')`.mapWith(
                  Number,
                ),
            })
            .from(soulWinningReports)
            .leftJoin(
              soulWinningNewBelievers,
              eq(soulWinningNewBelievers.reportId, soulWinningReports.id),
            )
            .where(and(gte(soulWinningReports.date, yearFrom), swScope)),
          db
            .select({
              total: count(),
              withAssistant:
                sql<number>`count(${cellReports.assistantId})`.mapWith(Number),
            })
            .from(cellReports)
            .where(
              and(
                gte(cellReports.date, week[0]),
                lt(cellReports.date, week[1]),
                cellScope,
              ),
            ),
          db
            .select({ id: assistant.id, name: assistant.name, n: count() })
            .from(cellReports)
            .innerJoin(assistant, eq(assistant.id, cellReports.assistantId))
            .where(
              and(
                gte(cellReports.date, week[0]),
                lt(cellReports.date, week[1]),
                isNotNull(cellReports.assistantId),
                eq(assistant.isMyPrimary, true),
                cellScope,
              ),
            )
            .groupBy(assistant.id, assistant.name)
            .orderBy(desc(count()), assistant.name),
        ])

      const tallies = Object.fromEntries(
        TALLY_RANGES.map((r) => {
          const c = (t: string) => cellTally.find((x) => x.type === t)?.[r] ?? 0
          const w = (t: string) => swTally.find((x) => x.type === t)?.[r] ?? 0
          return [
            r,
            {
              open: c('OPEN'),
              discipleship: c('DISCIPLESHIP'),
              // A cell group held as soul winning counts with soul-winning sessions.
              soulWinning: w('SOUL_WINNING') + c('SOULWINNING'),
              consolidation: w('CONSOLIDATION'),
            } satisfies Record<Kind, number>,
          ]
        }),
      ) as Record<(typeof TALLY_RANGES)[number], Record<Kind, number>>

      const trend = starts.map((start) => {
        const point: Record<Kind, number> & { start: string } = {
          start,
          open: 0,
          discipleship: 0,
          soulWinning: 0,
          consolidation: 0,
        }
        for (const r of cellTrend) {
          if (r.bucket !== start) continue
          if (r.type === 'OPEN') point.open += r.n
          else if (r.type === 'DISCIPLESHIP') point.discipleship += r.n
          else point.soulWinning += r.n
        }
        for (const r of swTrend) {
          if (r.bucket !== start) continue
          if (r.type === 'SOUL_WINNING') point.soulWinning += r.n
          else point.consolidation += r.n
        }
        return point
      })

      const sumBy = <TKey extends 'memberType' | 'churchStatus' | 'cellStatus'>(
        k: TKey,
      ) => {
        const m = new Map<string, number>()
        for (const p of people) m.set(p[k], (m.get(p[k]) ?? 0) + p.n)
        return [...m].map(([value, n]) => ({ key: value, n }))
      }
      const byType = sumBy('memberType')
      const byChurch = sumBy('churchStatus')
      const byCell = sumBy('cellStatus')
      // v2's Church Attendance By Member Type: each group's NACS (not
      // yet attended), ACS (attended) and Regular.
      const attendanceByType = (
        ['KIDS', 'YOUTH', 'YOUNGPRO', 'MEN', 'WOMEN'] as const
      ).map((type) => {
        const of = (status: string) =>
          people
            .filter((p) => p.memberType === type && p.churchStatus === status)
            .reduce((a, p) => a + p.n, 0)
        return {
          type,
          nacs: of('NACS'),
          acs: of('ACS'),
          regular: of('REGULAR'),
        }
      })

      return {
        everyone,
        canChooseScope: seesEveryone(access) && !!me,
        period,
        tallies,
        trend,
        yearToDate: { year: today.slice(0, 4), ...ytd },
        cellGroupsThisWeek: { ...cg, assistants: led },
        disciples: {
          memberType: byType,
          churchStatus: byChurch,
          cellStatus: byCell,
          total: byType.reduce((a, r) => a + r.n, 0),
          attendanceByType,
        },
      }
    })
  })

/** The period before a range, the same length: last week before this
 * week, the month before a month, last year's same span before YTD. */
function previousBounds(range: ReportRange): [Date, Date] | null {
  const now = rangeBounds(range)
  if (!now) return null
  const [from, to] = now
  const shiftMonths = (d: Date, n: number) => {
    const c = new Date(d)
    c.setUTCMonth(c.getUTCMonth() + n)
    return c
  }
  const shiftYears = (d: Date, n: number) => {
    const c = new Date(d)
    c.setUTCFullYear(c.getUTCFullYear() + n)
    return c
  }
  switch (range) {
    case 'this_week':
    case 'last_week':
      return [new Date(from.getTime() - 7 * 86_400_000), from]
    case 'this_month':
    case 'last_month':
      return [shiftMonths(from, -1), from]
    case 'year_to_date':
      return [shiftYears(from, -1), shiftYears(to, -1)]
    case 'last_year':
      return [shiftYears(from, -1), from]
    default:
      return null
  }
}

/** v2's Cell Groups card, for one date range: reports filed by kind (and
 * the period before), cell groups with an assistant or by the primary,
 * and each primary leader's cell groups by kind, men and women apart. */
export const getReportsFiled = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      range: z.enum(REPORT_RANGES).optional(),
      mine: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const everyone = seesEveryone(access) && !data.mine
    const me = access.disciple?.id
    const range = data.range ?? 'this_week'
    const key = `filed:${everyone ? 'all' : (me ?? 'none')}:${range}:${manilaDay()}`
    return cached(key, 120_000, async () => {
      const bounds = rangeBounds(range)
      const before = previousBounds(range)
      const cellScope = everyone
        ? undefined
        : me
          ? or(eq(cellReports.leaderId, me), eq(cellReports.assistantId, me))
          : sql`false`
      const swScope = everyone
        ? undefined
        : me
          ? or(
              eq(soulWinningReports.networkLeaderId, me),
              eq(soulWinningReports.assistantLeaderId, me),
            )
          : sql`false`
      const cellIn = (b: [Date, Date] | null) =>
        b
          ? and(gte(cellReports.date, b[0]), lt(cellReports.date, b[1]))
          : undefined
      const swIn = (b: [Date, Date] | null) =>
        b
          ? and(
              gte(soulWinningReports.date, b[0]),
              lt(soulWinningReports.date, b[1]),
            )
          : undefined
      const leader = alias(disciples, 'filed_leader')
      const helper = alias(disciples, 'filed_assistant')
      const [cell, sw, prevCell, prevSw, assisted, byLeader, byAssistant] =
        await Promise.all([
          db
            .select({ type: cellReports.type, n: count() })
            .from(cellReports)
            .where(and(cellIn(bounds), cellScope))
            .groupBy(cellReports.type),
          db
            .select({ type: soulWinningReports.type, n: count() })
            .from(soulWinningReports)
            .where(and(swIn(bounds), swScope))
            .groupBy(soulWinningReports.type),
          before
            ? db
                .select({ n: count() })
                .from(cellReports)
                .where(and(cellIn(before), cellScope))
            : Promise.resolve([{ n: 0 }]),
          before
            ? db
                .select({ n: count() })
                .from(soulWinningReports)
                .where(and(swIn(before), swScope))
            : Promise.resolve([{ n: 0 }]),
          db
            .select({
              withAssistant:
                sql<number>`count(${cellReports.assistantId})`.mapWith(Number),
              total: count(),
            })
            .from(cellReports)
            .where(and(cellIn(bounds), cellScope)),
          db
            .select({
              id: leader.id,
              name: leader.name,
              gender: leader.gender,
              type: cellReports.type,
              n: count(cellReports.id),
            })
            .from(leader)
            .leftJoin(
              cellReports,
              and(eq(cellReports.leaderId, leader.id), cellIn(bounds)),
            )
            .where(
              and(
                eq(leader.isPrimary, true),
                eq(leader.isActive, true),
                eq(leader.isDeleted, false),
                everyone ? undefined : me ? eq(leader.id, me) : sql`false`,
              ),
            )
            .groupBy(leader.id, leader.name, leader.gender, cellReports.type),
          // v2's Show breakdown: each leader's cell groups led by their
          // assistants.
          db
            .select({
              leaderId: cellReports.leaderId,
              id: helper.id,
              name: helper.name,
              n: count(),
            })
            .from(cellReports)
            .innerJoin(helper, eq(helper.id, cellReports.assistantId))
            .where(and(cellIn(bounds), cellScope))
            .groupBy(cellReports.leaderId, helper.id, helper.name),
        ])
      const c = (t: string) => cell.find((r) => r.type === t)?.n ?? 0
      const w = (t: string) => sw.find((r) => r.type === t)?.n ?? 0
      const kinds = {
        open: c('OPEN'),
        discipleship: c('DISCIPLESHIP'),
        soulWinning: w('SOUL_WINNING') + c('SOULWINNING'),
        consolidation: w('CONSOLIDATION'),
      } satisfies Record<Kind, number>
      const leaders = new Map<
        string,
        {
          id: string
          name: string
          gender: 'MALE' | 'FEMALE'
          total: number
          open: number
          discipleship: number
          soulWinning: number
          assistants: Array<{ id: string; name: string; n: number }>
        }
      >()
      for (const r of byLeader) {
        const l = leaders.get(r.id) ?? {
          id: r.id,
          name: r.name,
          gender: r.gender,
          total: 0,
          open: 0,
          discipleship: 0,
          soulWinning: 0,
          assistants: byAssistant
            .filter((a) => a.leaderId === r.id)
            .map(({ id, name, n }) => ({ id, name, n }))
            .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)),
        }
        if (r.type === 'OPEN') l.open += r.n
        else if (r.type === 'DISCIPLESHIP') l.discipleship += r.n
        else if (r.type === 'SOULWINNING') l.soulWinning += r.n
        l.total += r.type ? r.n : 0
        leaders.set(r.id, l)
      }
      const list = [...leaders.values()].sort(
        (a, b) => b.total - a.total || a.name.localeCompare(b.name),
      )
      return {
        range,
        // The range's first and last day, for the card's dates.
        days: bounds
          ? ([manilaDay(bounds[0]), addDays(manilaDay(bounds[1]), -1)] as const)
          : null,
        kinds,
        total: Object.values(kinds).reduce((a, n) => a + n, 0),
        previous: before ? prevCell[0].n + prevSw[0].n : null,
        // v2's Cell Groups card counts cell reports only.
        cellGroups: {
          open: kinds.open,
          discipleship: kinds.discipleship,
          soulWinning: c('SOULWINNING'),
          total: assisted[0].total,
          previous: before ? prevCell[0].n : null,
        },
        withAssistant: assisted[0].withAssistant,
        byPrimary: assisted[0].total - assisted[0].withAssistant,
        men: list.filter((l) => l.gender === 'MALE'),
        women: list.filter((l) => l.gender === 'FEMALE'),
      }
    })
  })
