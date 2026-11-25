import { Resend } from 'resend'
import type { Email } from '@/lib/email/templates'

/* Email goes out only when something happens (a mutation) or when someone
   asks for it (a button), as in Reviu and Osamu: nothing is scheduled. */

export const site = () =>
  (process.env.SITE_URL ?? 'https://gccadmin.vercel.app').replace(/\/$/, '')

/** `KEY=` in a .env file is the same as leaving it out. */
const env = (key: string) => process.env[key] || undefined

export const emailEnabled = () =>
  Boolean(env('RESEND_API_KEY') && env('RESEND_FROM_EMAIL'))

export type Outgoing = {
  to: string
  email: Email
  /** Resend tag: which email this is, for its dashboard. */
  tag: string
  /** Resend drops a second send with the same key within 24 hours, so a
   * retried request never sends twice. */
  idempotencyKey?: string
  replyTo?: string
}

/** Sends one email and says whether it went out. Never throws: an email
 * that fails or isn't set up must not fail what triggered it. In `pnpm
 * dev` without a key, the email prints to the terminal instead. */
export async function trySendEmail(m: Outgoing): Promise<boolean> {
  const key = env('RESEND_API_KEY')
  const from = env('RESEND_FROM_EMAIL')
  if (!m.to) return false
  if (!key || !from) {
    if (import.meta.env.DEV) {
      console.info(`\n[email to ${m.to}] ${m.email.subject}\n${m.email.text}\n`)
      return true
    }
    return false
  }
  // Staging: every email goes to one inbox instead.
  const redirect = env('EMAIL_REDIRECT_TO')
  try {
    const { error } = await new Resend(key).emails.send(
      {
        from,
        to: [redirect ?? m.to],
        subject: redirect
          ? `[to: ${m.to}] ${m.email.subject}`
          : m.email.subject,
        html: m.email.html,
        text: m.email.text,
        replyTo: m.replyTo ?? env('ADMIN_EMAIL'),
        tags: [{ name: 'event', value: m.tag }],
      },
      m.idempotencyKey ? { idempotencyKey: m.idempotencyKey } : undefined,
    )
    if (error) {
      console.error(`Email ${m.tag} to ${m.to} failed:`, error.message)
      return false
    }
    return true
  } catch (error) {
    console.error(`Email ${m.tag} to ${m.to} failed:`, error)
    return false
  }
}

/** `trySendEmail` for when nobody is waiting on the answer. */
export async function sendEmail(m: Outgoing): Promise<void> {
  await trySendEmail(m)
}
