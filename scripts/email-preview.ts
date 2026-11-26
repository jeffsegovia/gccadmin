/* Writes every email with sample data, for review: `pnpm email:preview`
   (an HTML page at email-preview.html) or `--json out.json`. */
import { writeFileSync } from 'node:fs'
import {
  portalReportEmail,
  reportReminderEmail,
  digestEmail,
  welcomeLeaderEmail,
} from '../src/lib/email/templates'
import type { Digest } from '../src/lib/digest/types'

const ctx = { site: process.env.SITE_URL ?? 'https://gccadmin.vercel.app' }

function SAMPLE_DIGEST(kind: 'week' | 'month'): Digest {
  const x = kind === 'week' ? 1 : 4
  return {
    kind,
    label: kind === 'week' ? 'Nov 17–23' : 'October 2026',
    key: '2026-10-01',
    reports: {
      open: 4 * x,
      discipleship: 18 * x,
      soulWinning: 3 * x,
      consolidation: 2 * x,
    },
    newBelievers: 5 * x,
    byLeader: [
      { name: 'Mark Dela Cruz', open: 1 * x, discipleship: 2 * x },
      { name: 'Anna Reyes', open: 0, discipleship: 2 * x },
      { name: 'Joel Cruz', open: 1 * x, discipleship: 1 * x },
    ],
    assistants: [
      { name: 'Ruth Garcia', n: 2 * x },
      { name: 'Caleb Tan', n: 1 * x },
    ],
    sundays:
      kind === 'week'
        ? [{ date: 'Nov 23', title: 'Sunday service', total: 148, guests: 9 }]
        : [
            { date: 'Oct 5', title: 'Sunday service', total: 141, guests: 6 },
            { date: 'Oct 12', title: 'Sunday service', total: 152, guests: 11 },
            { date: 'Oct 19', title: 'Sunday service', total: 148, guests: 9 },
            { date: 'Oct 26', title: 'Sunday service', total: 155, guests: 8 },
          ],
    leaders: 15,
    reported: 12,
    notReported: [
      { name: 'Paolo Santos', last: 'Last report 16 days ago' },
      { name: 'Grace Lim', last: 'Last report 9 days ago' },
      { name: 'Ben Ramos', last: 'No reports yet' },
    ],
    members: {
      total: 284,
      rows: [
        { label: 'Kids', total: 30, nacs: 11, acs: 6, regular: 13 },
        { label: 'Youth', total: 116, nacs: 55, acs: 22, regular: 39 },
        { label: 'Young pro', total: 37, nacs: 4, acs: 7, regular: 26 },
        { label: 'Men', total: 46, nacs: 11, acs: 12, regular: 23 },
        { label: 'Women', total: 55, nacs: 11, acs: 12, regular: 32 },
      ],
    },
  }
}

export const SAMPLES = [
  {
    key: 'reminder',
    name: 'Cell report reminder',
    when: 'Opt-in: an admin taps Email reminder (Home’s Not reported, or Leaders). At most once a day per leader.',
    to: 'Each leader picked who hasn’t reported this week',
    email: reportReminderEmail(ctx, {
      name: 'Mark Dela Cruz',
      week: 'Nov 24–30',
      days: 5,
      last: 'Thu, Nov 20',
    }),
  },
  {
    key: 'catch-up',
    name: 'Cell report reminder, catching up',
    when: 'Same button: used instead for a leader whose last report is 14 or more days old',
    to: 'That leader (replies go to the admin email)',
    email: reportReminderEmail(ctx, {
      name: 'Paolo Santos',
      week: 'Nov 24–30',
      days: 16,
      last: 'Sun, Nov 9',
    }),
  },
  {
    key: 'summary',
    name: 'Weekly report',
    when: 'Opt-in: an admin or pastor taps Email on Insights and picks Last week. Once per week.',
    to: 'Admins and pastors',
    email: digestEmail(ctx, SAMPLE_DIGEST('week'), 'Pastor John De Guzman'),
  },
  {
    key: 'summary-month',
    name: 'Monthly report',
    when: 'Opt-in: the same button, picking Last month. Once per month.',
    to: 'Admins and pastors',
    email: digestEmail(ctx, SAMPLE_DIGEST('month'), 'Pastor John De Guzman'),
  },
  {
    key: 'portal',
    name: 'Report filed from a disciple’s page',
    when: 'On save: a disciple files a cell report from their page',
    to: 'Their network leader',
    email: portalReportEmail(ctx, {
      leader: 'Mark Dela Cruz',
      disciple: 'Joshua Reyes',
      type: 'Discipleship',
      date: 'Tue, Nov 25 · 7:00 PM',
      venue: 'Reyes residence',
      lesson: 'The Power of Prayer',
      attendees: ['Joshua Reyes', 'Carlo Mendoza', 'Rey Villanueva'],
      reportId: 'sample',
    }),
  },
  {
    key: 'welcome',
    name: 'Leader account linked',
    when: 'On save: an admin links a sign-in to a primary leader (Leaders)',
    to: 'That leader',
    email: welcomeLeaderEmail(ctx, { name: 'Mark Dela Cruz' }),
  },
]

const args = process.argv.slice(2)
if (args[0] === '--json') {
  writeFileSync(args[1] ?? 'email-preview.json', JSON.stringify(SAMPLES))
} else {
  const out = args[0] ?? 'email-preview.html'
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  writeFileSync(
    out,
    `<!doctype html><meta charset="utf-8"><title>GCC Admin emails</title><body style="font-family:system-ui;background:#ddd;margin:0;padding:24px">${SAMPLES.map(
      (s) =>
        `<h2>${s.name}</h2><p>${s.when} · ${s.to}<br><b>Subject:</b> ${s.email.subject}</p><iframe srcdoc="${esc(s.email.html)}" style="width:620px;max-width:100%;height:760px;border:0;background:#fff"></iframe>`,
    ).join('')}</body>`,
  )
  console.log(`Wrote ${out}`)
}
