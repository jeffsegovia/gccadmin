import { createServerFn } from '@tanstack/react-start'
import { clerkClient } from '@clerk/tanstack-react-start/server'
import { and, count, desc, eq, gte, inArray, lt, max, sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import {
  attendanceDisciples,
  attendanceNewComers,
  attendances,
  cellReports,
  disciples,
  emailLogs,
  soulWinningNewBelievers,
  soulWinningReports,
  users,
} from '@/db/schema'
import {
  AccessError,
  devAuth,
  requireAccess,
  requireAdmin,
  seesEveryone,
} from '@/server/auth/access.server'
import { rangeBounds } from '@/server/cell-reports/cell-reports.server'
import { emailEnabled, site, trySendEmail } from '@/server/email/send.server'
import { reportReminderEmail, weeklySummaryEmail } from '@/lib/email/templates'
import { addDays, dateToDay, longDay, shortDay } from '@/lib/dates'

/* Emails someone asks for: a reminder to leaders, the weekly summary.
   Each is logged (EmailLog) so it goes out at most once a day per leader,
   or once a week for the summary. */

/** "Nov 24–30" for a Monday (YYYY-MM-DD), the week's Sunday included. */
export function weekLabel(monday: string) {
  const a = shortDay(monday)
  const b = shortDay(addDays(monday, 6))
  return a.slice(0, 3) === b.slice(0, 3) ? `${a}–${b.slice(4)}` : `${a} – ${b}`
}

const daysSince = (d: Date | string | null) =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000) : null

const dayLabel = (d: Date | string) =>
  longDay(dateToDay(d)).replace(/, \d{4}$/, '')

function requireEmail() {
  if (!emailEnabled() && !import.meta.env.DEV)
    throw new AccessError(
      'Email isn’t set up yet (RESEND_API_KEY and RESEND_FROM_EMAIL).',
    )
}

/** Remind leaders to file this week's cell report (Home's "Not reported"
 * and Leaders). A leader already reminded in the last 20 hours is
 * skipped; one quiet for 14 days or more gets the catch-up wording. */
export const sendReportReminders = createServerFn({ method: 'POST' })
  .validator(z.object({ leaderIds: z.array(z.string()).min(1).max(100) }))
  .handler(async ({ data }) => {
    const access = await requireAdmin()
    requireEmail()
    const since = new Date(Date.now() - 20 * 3_600_000)
    const [rows, recent] = await Promise.all([
      db
        .select({
          id: disciples.id,
          name: disciples.name,
          email: users.email,
          last: max(cellReports.date),
        })
        .from(disciples)
        .innerJoin(users, eq(users.clerkId, disciples.userAccountId))
        .leftJoin(cellReports, eq(cellReports.leaderId, disciples.id))
        .where(inArray(disciples.id, data.leaderIds))
        .groupBy(disciples.id, disciples.name, users.email),
      db
        .select({ key: emailLogs.key })
        .from(emailLogs)
        .where(
          and(
            eq(emailLogs.kind, 'report-reminder'),
            inArray(emailLogs.key, data.leaderIds),
            gte(emailLogs.sentAt, since),
          ),
        ),
    ])
    const already = new Set(recent.map((r) => r.key))
    const due = rows.filter((r) => !already.has(r.id))
    const week = weekLabel(dateToDay(rangeBounds('this_week')![0]))
    const today = dateToDay(new Date())
    const sent: Array<string> = []
    await Promise.all(
      due.map(async (r) => {
        const days = daysSince(r.last)
        const ok = await trySendEmail({
          to: r.email,
          tag: 'report-reminder',
          idempotencyKey: `report-reminder-${r.id}-${today}`,
          email: reportReminderEmail(
            { site: site() },
            {
              name: r.name,
              week,
              days,
              last: r.last ? dayLabel(r.last) : null,
            },
          ),
        })
        if (ok) sent.push(r.id)
      }),
    )
    if (sent.length)
      await db.insert(emailLogs).values(
        due
          .filter((r) => sent.includes(r.id))
          .map((r) => ({
            kind: 'report-reminder',
            key: r.id,
            recipient: r.email,
            sentById: access.disciple?.id ?? null,
          })),
      )
    return {
      sent: sent.length,
      already: rows.length - due.length,
      noAccount: data.leaderIds.length - rows.length,
      failed: due.length - sent.length,
    }
  })

/** Admins and pastors (Clerk public metadata), else ADMIN_EMAIL. */
async function staffEmails() {
  const found: Array<string> = []
  if (!devAuth)
    try {
      const list = await clerkClient().users.getUserList({ limit: 500 })
      for (const u of list.data) {
        const meta = u.publicMetadata as { role?: string; pastor?: boolean }
        const email = u.primaryEmailAddress?.emailAddress
        if ((meta.role === 'admin' || meta.pastor === true) && email)
          found.push(email)
      }
    } catch (error) {
      console.error('Listing admins for the summary failed', error)
    }
  if (!found.length && process.env.ADMIN_EMAIL)
    found.push(process.env.ADMIN_EMAIL)
  return [...new Set(found)]
}

/** When last week's summary was emailed, if it was. */
export const getSummaryStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const access = await requireAccess()
    if (!seesEveryone(access)) return null
    const week = dateToDay(rangeBounds('last_week')![0])
    const [last] = await db
      .select({ sentAt: emailLogs.sentAt, by: disciples.name })
      .from(emailLogs)
      .leftJoin(disciples, eq(disciples.id, emailLogs.sentById))
      .where(and(eq(emailLogs.kind, 'weekly-summary'), eq(emailLogs.key, week)))
      .orderBy(desc(emailLogs.sentAt))
      .limit(1)
    return {
      week: weekLabel(week),
      sentAt: last?.sentAt.toISOString() ?? null,
      by: last?.by ?? null,
    }
  },
)

/** "Email this summary" on Insights: last week at a glance to the admins
 * and pastors, once a week. */
export const emailWeeklySummary = createServerFn({ method: 'POST' }).handler(
  async () => {
    const access = await requireAccess()
    if (!seesEveryone(access))
      throw new AccessError('Only admins and pastors can send the summary.')
    requireEmail()
    const [from, to] = rangeBounds('last_week')!
    const weekKey = dateToDay(from)
    const [done] = await db
      .select({ id: emailLogs.id })
      .from(emailLogs)
      .where(
        and(eq(emailLogs.kind, 'weekly-summary'), eq(emailLogs.key, weekKey)),
      )
      .limit(1)
    if (done) throw new AccessError('Last week’s summary was already sent.')

    const inWeek = (col: AnyPgColumn) => and(gte(col, from), lt(col, to))
    const [leaders, reported, cell, sw, [souls], [sunday]] = await Promise.all([
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
        .selectDistinct({ id: cellReports.leaderId })
        .from(cellReports)
        .where(inWeek(cellReports.date)),
      db
        .select({ type: cellReports.type, n: count() })
        .from(cellReports)
        .where(inWeek(cellReports.date))
        .groupBy(cellReports.type),
      db
        .select({ type: soulWinningReports.type, n: count() })
        .from(soulWinningReports)
        .where(inWeek(soulWinningReports.date))
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
            inWeek(soulWinningReports.date),
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
          and(eq(attendances.type, 'SUNDAY_SERVICE'), inWeek(attendances.date)),
        )
        .orderBy(desc(attendances.date))
        .limit(1),
    ])
    const filed = new Set(reported.map((r) => r.id))
    const c = (t: string) => cell.find((r) => r.type === t)?.n ?? 0
    const w = (t: string) => sw.find((r) => r.type === t)?.n ?? 0
    const notReported = leaders
      .filter((l) => !filed.has(l.id))
      .map((l) => ({ name: l.name, days: daysSince(l.last) }))
      .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))
      .map((l) => ({
        name: l.name,
        last:
          l.days === null ? 'No reports yet' : `Last report ${l.days} days ago`,
      }))
    const email = weeklySummaryEmail(
      { site: site() },
      {
        week: weekLabel(weekKey),
        sentBy: access.disciple?.name ?? 'GCC Admin',
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
      },
    )
    const recipients = await staffEmails()
    if (!recipients.length)
      throw new AccessError('No admin or pastor has an email to send to.')
    const results = await Promise.all(
      recipients.map((address) =>
        trySendEmail({
          to: address,
          tag: 'weekly-summary',
          idempotencyKey: `weekly-summary-${weekKey}-${address}`,
          email,
        }),
      ),
    )
    const sent = recipients.filter((_, i) => results[i])
    if (!sent.length) throw new AccessError('The summary couldn’t be sent.')
    await db.insert(emailLogs).values(
      sent.map((address) => ({
        kind: 'weekly-summary',
        key: weekKey,
        recipient: address,
        sentById: access.disciple?.id ?? null,
      })),
    )
    return { sent: sent.length }
  },
)
