import { clerkClient } from '@clerk/tanstack-react-start/server'
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  max,
  or,
  sql,
} from 'drizzle-orm'
import { db } from '@/db'
import {
  attendanceDisciples,
  attendanceNewComers,
  attendances,
  cellReports,
  disciples,
  soulWinningNewBelievers,
  soulWinningReports,
  users,
} from '@/db/schema'
import { rangeBounds } from '@/server/cell-reports/cell-reports.server'
import {
  attendanceOpenEmail,
  birthdaysEmail,
  overdueEmail,
  weeklyNudgeEmail,
  weeklySummaryEmail,
} from '@/lib/email/templates'
import { addDays, dateToDay, longDay, manilaDay, shortDay } from '@/lib/dates'
import { birthdayWeek, turningAge } from '@/lib/birthdays'
import { sendEmails, site } from '@/server/email/send.server'
import type { Outgoing } from '@/server/email/send.server'

/* The scheduled emails (vercel.json crons → /api/cron/$job). Each job
   works out who should hear from us today and sends one email each. */

const ctx = () => ({ site: site() })

/** "Nov 24–30" for a Monday (YYYY-MM-DD), the week's Sunday included. */
export function weekLabel(monday: string) {
  const sunday = addDays(monday, 6)
  const a = shortDay(monday)
  const b = shortDay(sunday)
  return a.slice(0, 3) === b.slice(0, 3) ? `${a}–${b.slice(4)}` : `${a} – ${b}`
}

/** Active primary leaders who can sign in, with their email and last
 * cell report. */
async function leadersWithEmail() {
  return db
    .select({
      id: disciples.id,
      name: disciples.name,
      email: users.email,
      last: max(cellReports.date),
    })
    .from(disciples)
    .innerJoin(users, eq(users.clerkId, disciples.userAccountId))
    .leftJoin(cellReports, eq(cellReports.leaderId, disciples.id))
    .where(
      and(
        eq(disciples.isPrimary, true),
        eq(disciples.isActive, true),
        eq(disciples.isDeleted, false),
      ),
    )
    .groupBy(disciples.id, disciples.name, users.email)
}

async function reportedBetween(from: Date, to: Date) {
  const rows = await db
    .selectDistinct({ id: cellReports.leaderId })
    .from(cellReports)
    .where(and(gte(cellReports.date, from), lt(cellReports.date, to)))
  return new Set(rows.map((r) => r.id))
}

/** Admins and pastors (Clerk public metadata), else ADMIN_EMAIL. */
async function staffEmails(kind: 'admins' | 'staff') {
  const found: Array<string> = []
  try {
    const list = await clerkClient().users.getUserList({ limit: 500 })
    for (const u of list.data) {
      const meta = u.publicMetadata as { role?: string; pastor?: boolean }
      const wanted =
        meta.role === 'admin' || (kind === 'staff' && meta.pastor === true)
      const email = u.primaryEmailAddress?.emailAddress
      if (wanted && email) found.push(email)
    }
  } catch {
    // Clerk unreachable: fall back to the admin address below.
  }
  if (!found.length && process.env.ADMIN_EMAIL)
    found.push(process.env.ADMIN_EMAIL)
  return [...new Set(found)]
}

const daysSince = (d: Date | string | null) =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) : null

/** Saturday: leaders with no cell report this week yet. */
export async function weeklyNudge() {
  const [from, to] = rangeBounds('this_week')!
  const [leaders, reported] = await Promise.all([
    leadersWithEmail(),
    reportedBetween(from, to),
  ])
  const week = weekLabel(dateToDay(from))
  return sendEmails(
    leaders
      .filter((l) => !reported.has(l.id))
      .map((l) => ({
        to: l.email,
        email: weeklyNudgeEmail(ctx(), { name: l.name, week }),
      })),
  )
}

/** Monday: leaders whose last report is 14 days old or more. */
export async function overdueReports() {
  const leaders = await leadersWithEmail()
  return sendEmails(
    leaders
      .filter((l) => {
        const d = daysSince(l.last)
        return d === null || d >= 14
      })
      .map((l) => ({
        to: l.email,
        email: overdueEmail(ctx(), {
          name: l.name,
          days: daysSince(l.last),
          last: l.last
            ? longDay(dateToDay(l.last)).replace(/, \d{4}$/, '')
            : null,
        }),
      })),
  )
}

/** Monday: last week at a glance, to admins and pastors. */
export async function weeklySummary() {
  const [from, to] = rangeBounds('last_week')!
  const today = manilaDay()
  const keys = birthdayWeek(today).flatMap((d) => d.keys)
  const [leaders, reported, kinds, [souls], [sunday], [bdays]] =
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
      reportedBetween(from, to),
      Promise.all([
        db
          .select({ type: cellReports.type, n: count() })
          .from(cellReports)
          .where(and(gte(cellReports.date, from), lt(cellReports.date, to)))
          .groupBy(cellReports.type),
        db
          .select({ type: soulWinningReports.type, n: count() })
          .from(soulWinningReports)
          .where(
            and(
              gte(soulWinningReports.date, from),
              lt(soulWinningReports.date, to),
            ),
          )
          .groupBy(soulWinningReports.type),
      ]),
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
            gte(soulWinningReports.date, from),
            lt(soulWinningReports.date, to),
          ),
        ),
      db
        .select({
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
            gte(attendances.date, from),
            lt(attendances.date, to),
          ),
        )
        .orderBy(desc(attendances.date))
        .limit(1),
      db
        .select({ n: count() })
        .from(disciples)
        .where(
          and(
            eq(disciples.isDeleted, false),
            eq(disciples.isActive, true),
            inArray(
              sql<string>`to_char(${disciples.birthdate}, 'MM-DD')`,
              keys,
            ),
          ),
        ),
    ])
  const [cell, sw] = kinds
  const c = (t: string) => cell.find((r) => r.type === t)?.n ?? 0
  const w = (t: string) => sw.find((r) => r.type === t)?.n ?? 0
  const notReported = leaders
    .filter((l) => !reported.has(l.id))
    .map((l) => ({ ...l, days: daysSince(l.last) }))
    .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))
    .map((l) => ({
      name: l.name,
      last:
        l.days === null ? 'No reports yet' : `Last report ${l.days} days ago`,
    }))
  const email = weeklySummaryEmail(ctx(), {
    week: weekLabel(dateToDay(from)),
    reported: leaders.length - notReported.length,
    leaders: leaders.length,
    notReported,
    reports: {
      open: c('OPEN'),
      discipleship: c('DISCIPLESHIP'),
      soulWinning: w('SOUL_WINNING') + c('SOULWINNING'),
      consolidation: w('CONSOLIDATION'),
    },
    newBelievers: souls.n,
    sunday: sunday
      ? {
          title: sunday.title,
          total: sunday.members + sunday.guests,
          guests: sunday.guests,
        }
      : null,
    birthdays: bdays.n,
  })
  const staff = await staffEmails('staff')
  return sendEmails(staff.map((address) => ({ to: address, email })))
}

/** Monday: each leader's birthdays this week (their network: led or
 * handled by them). */
export async function weeklyBirthdays() {
  const week = birthdayWeek(manilaDay())
  const keys = week.flatMap((d) => d.keys)
  const [leaders, born] = await Promise.all([
    leadersWithEmail(),
    db
      .select({
        name: disciples.name,
        birthdate: disciples.birthdate,
        leaderId: disciples.leaderId,
        handledById: disciples.handledById,
        key: sql<string>`to_char(${disciples.birthdate}, 'MM-DD')`,
      })
      .from(disciples)
      .where(
        and(
          eq(disciples.isDeleted, false),
          eq(disciples.isActive, true),
          inArray(sql<string>`to_char(${disciples.birthdate}, 'MM-DD')`, keys),
        ),
      ),
  ])
  const out: Array<Outgoing> = []
  for (const l of leaders) {
    const mine = born
      .filter((b) => b.leaderId === l.id || b.handledById === l.id)
      .map((b) => {
        const date = week.find((d) => d.keys.includes(b.key))!.date
        return {
          name: b.name,
          date,
          day: longDay(date).replace(/, \d{4}$/, ''),
          turns: b.birthdate ? turningAge(b.birthdate, date) : null,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
    if (mine.length)
      out.push({
        to: l.email,
        email: birthdaysEmail(ctx(), { name: l.name, people: mine }),
      })
  }
  return sendEmails(out)
}

/** Monday: last Sunday's service, if it's still open, to admins. */
export async function attendanceStillOpen() {
  const today = manilaDay()
  const [s] = await db
    .select({
      id: attendances.id,
      title: attendances.title,
      date: attendances.date,
      marked:
        sql<number>`(select count(*) from ${attendanceDisciples} where ${attendanceDisciples.attendanceId} = ${attendances.id}) + (select count(*) from ${attendanceNewComers} where ${attendanceNewComers.attendanceId} = ${attendances.id})`.mapWith(
          Number,
        ),
    })
    .from(attendances)
    .where(
      and(
        eq(attendances.type, 'SUNDAY_SERVICE'),
        gte(attendances.date, new Date(`${addDays(today, -7)}T00:00:00Z`)),
        lt(attendances.date, new Date(`${today}T00:00:00Z`)),
        or(
          eq(attendances.isLocked, false),
          sql`${attendances.isLocked} is null`,
        ),
      ),
    )
    .orderBy(desc(attendances.date))
    .limit(1)
  if (!s || s.marked === 0) return 0
  const email = attendanceOpenEmail(ctx(), {
    id: s.id,
    title: s.title,
    date: longDay(s.date).replace(/, \d{4}$/, ''),
    marked: s.marked,
  })
  const to = await staffEmails('admins')
  return sendEmails(to.map((address) => ({ to: address, email })))
}

export const JOBS = {
  'weekly-nudge': weeklyNudge,
  overdue: overdueReports,
  'weekly-summary': async () =>
    (await weeklySummary()) + (await weeklyBirthdays()),
  attendance: attendanceStillOpen,
} as const
export type JobName = keyof typeof JOBS
