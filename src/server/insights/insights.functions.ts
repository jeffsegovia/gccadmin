import { createServerFn } from '@tanstack/react-start'
import { and, count, eq, gte, lt, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import { cellReports, disciples, soulWinningReports } from '@/db/schema'
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

      const [cellTally, swTally, cellTrend, swTrend, people] =
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

      return {
        everyone,
        canChooseScope: seesEveryone(access) && !!me,
        period,
        tallies,
        trend,
        disciples: {
          memberType: byType,
          churchStatus: byChurch,
          cellStatus: byCell,
          total: byType.reduce((a, r) => a + r.n, 0),
        },
      }
    })
  })
