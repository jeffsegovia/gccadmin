import { createServerFn } from '@tanstack/react-start'
import { clerkClient } from '@clerk/tanstack-react-start/server'
import { and, desc, eq, gte, inArray, max } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { cellReports, disciples, emailLogs, users } from '@/db/schema'
import {
  AccessError,
  devAuth,
  requireAccess,
  requireAdmin,
  seesEveryone,
} from '@/server/auth/access.server'
import { rangeBounds } from '@/server/cell-reports/cell-reports.server'
import { emailEnabled, site, trySendEmail } from '@/server/email/send.server'
import { digestEmail, reportReminderEmail } from '@/lib/email/templates'
import { DIGEST_WORDS } from '@/lib/digest/types'
import type { DigestKind } from '@/lib/digest/types'
import { dateToDay, longDay, manilaDay } from '@/lib/dates'
import {
  buildDigest,
  digestPeriod,
  weekLabel,
} from '@/server/email/digest.server'

/* Emails someone asks for: a reminder to leaders, the weekly or monthly
   report. Each is logged (EmailLog) so it goes out at most once a day per
   leader, or once per period for a report. */

const LOG_KIND: Record<DigestKind, string> = {
  week: 'weekly-summary',
  month: 'monthly-summary',
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

/** Who a reminder can go to, for the confirmation: each leader's email
 * (if their account is linked), when they last reported, and whether they
 * were reminded in the last 20 hours. */
export const getReminderRecipients = createServerFn({ method: 'GET' })
  .validator(z.object({ leaderIds: z.array(z.string()).min(1).max(100) }))
  .handler(async ({ data }) => {
    await requireAdmin()
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
        .leftJoin(users, eq(users.clerkId, disciples.userAccountId))
        .leftJoin(cellReports, eq(cellReports.leaderId, disciples.id))
        .where(inArray(disciples.id, data.leaderIds))
        .groupBy(disciples.id, disciples.name, users.email)
        .orderBy(disciples.name),
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
    const reminded = new Set(recent.map((r) => r.key))
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      last: r.last ? new Date(r.last).toISOString() : null,
      remindedToday: reminded.has(r.id),
    }))
  })

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
    const week = weekLabel(manilaDay(rangeBounds('this_week')![0]))
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

/** When each report (last week's, last month's) was emailed, if it was. */
export const getSummaryStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const access = await requireAccess()
    if (!seesEveryone(access)) return null
    const status = async (kind: DigestKind) => {
      const { key, label } = digestPeriod(kind)
      const [last] = await db
        .select({ sentAt: emailLogs.sentAt, by: disciples.name })
        .from(emailLogs)
        .leftJoin(disciples, eq(disciples.id, emailLogs.sentById))
        .where(and(eq(emailLogs.kind, LOG_KIND[kind]), eq(emailLogs.key, key)))
        .orderBy(desc(emailLogs.sentAt))
        .limit(1)
      return {
        label,
        sentAt: last?.sentAt.toISOString() ?? null,
        by: last?.by ?? null,
      }
    }
    const [week, month] = await Promise.all([status('week'), status('month')])
    return { week, month }
  },
)

const digestKindSchema = z.object({ kind: z.enum(['week', 'month']) })

/** The report's numbers, for the preview and the image people share in a
 * group chat. Admins and pastors only. */
export const getDigest = createServerFn({ method: 'GET' })
  .validator(digestKindSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    if (!seesEveryone(access))
      throw new AccessError('Only admins and pastors can see this report.')
    return buildDigest(data.kind)
  })

/** "Email" on Insights: last week's or last month's report to the admins
 * and pastors, once per period (the admin picks which one). */
export const emailSummary = createServerFn({ method: 'POST' })
  .validator(digestKindSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    if (!seesEveryone(access))
      throw new AccessError('Only admins and pastors can send the report.')
    requireEmail()
    const { key } = digestPeriod(data.kind)
    const kind = LOG_KIND[data.kind]
    const [done] = await db
      .select({ id: emailLogs.id })
      .from(emailLogs)
      .where(and(eq(emailLogs.kind, kind), eq(emailLogs.key, key)))
      .limit(1)
    if (done)
      throw new AccessError(
        `${DIGEST_WORDS[data.kind].short}’s report was already sent.`,
      )
    const digest = await buildDigest(data.kind)
    const email = digestEmail(
      { site: site() },
      digest,
      access.disciple?.name ?? 'GCC Admin',
    )
    const recipients = await staffEmails()
    if (!recipients.length)
      throw new AccessError('No admin or pastor has an email to send to.')
    const results = await Promise.all(
      recipients.map((address) =>
        trySendEmail({
          to: address,
          tag: kind,
          idempotencyKey: `${kind}-${key}-${address}`,
          email,
        }),
      ),
    )
    const sent = recipients.filter((_, i) => results[i])
    if (!sent.length) throw new AccessError('The report couldn’t be sent.')
    await db.insert(emailLogs).values(
      sent.map((address) => ({
        kind,
        key,
        recipient: address,
        sentById: access.disciple?.id ?? null,
      })),
    )
    return { sent: sent.length }
  })
