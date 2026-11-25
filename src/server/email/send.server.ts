import { Resend } from 'resend'
import type { Email } from '@/lib/email/templates'

export const site = () => process.env.SITE_URL ?? 'https://gccadmin.vercel.app'

/** Automatic emails (cron and the portal's report notice) go out only once
 * EMAIL_REMINDERS=on, so nothing is sent before the copies are signed off. */
export const automaticEmailsOn = () => process.env.EMAIL_REMINDERS === 'on'

export type Outgoing = { to: string; email: Email; replyTo?: string }

/** Sends through Resend, 100 at a time (its batch limit). Returns how many
 * went out; nothing is sent when email isn't set up. */
export async function sendEmails(list: ReadonlyArray<Outgoing>) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!key || !from || list.length === 0) return 0
  const resend = new Resend(key)
  for (let i = 0; i < list.length; i += 100) {
    const { error } = await resend.batch.send(
      list.slice(i, i + 100).map((m) => ({
        from,
        to: m.to,
        subject: m.email.subject,
        html: m.email.html,
        text: m.email.text,
        replyTo: m.replyTo ?? process.env.ADMIN_EMAIL ?? undefined,
      })),
    )
    if (error) throw new Error(error.message)
  }
  return list.length
}
