/* Writes every email with sample data, for review: `pnpm email:preview`
   (an HTML page at email-preview.html) or `--json out.json`. */
import { writeFileSync } from 'node:fs'
import {
  attendanceOpenEmail,
  birthdaysEmail,
  overdueEmail,
  portalReportEmail,
  reportReminderEmail,
  weeklyNudgeEmail,
  weeklySummaryEmail,
} from '../src/lib/email/templates'

const ctx = { site: process.env.SITE_URL ?? 'https://gccadmin.vercel.app' }

export const SAMPLES = [
  {
    key: 'reminder',
    name: 'Cell report reminder',
    when: 'When an admin taps Remind on Leaders (as in v2)',
    to: 'The leaders picked',
    email: reportReminderEmail(ctx, { name: 'Mark Dela Cruz' }),
  },
  {
    key: 'nudge',
    name: 'Weekly nudge',
    when: 'Saturdays, 5 PM',
    to: 'Primary leaders with no cell report this week yet',
    email: weeklyNudgeEmail(ctx, { name: 'Mark Dela Cruz', week: 'Nov 24–30' }),
  },
  {
    key: 'overdue',
    name: 'Overdue reports',
    when: 'Mondays, 8 AM',
    to: 'Primary leaders whose last report is 14 or more days old (replies go to the admin email)',
    email: overdueEmail(ctx, {
      name: 'Paolo Santos',
      days: 16,
      last: 'Sun, Nov 9',
    }),
  },
  {
    key: 'summary',
    name: 'Weekly summary',
    when: 'Mondays, 7 AM',
    to: 'Admins and pastors',
    email: weeklySummaryEmail(ctx, {
      week: 'Nov 17–23',
      reported: 12,
      leaders: 15,
      notReported: [
        { name: 'Paolo Santos', last: 'Last report 16 days ago' },
        { name: 'Grace Lim', last: 'Last report 9 days ago' },
        { name: 'Ben Ramos', last: 'No reports yet' },
      ],
      reports: { open: 4, discipleship: 18, soulWinning: 3, consolidation: 2 },
      newBelievers: 5,
      sunday: { title: 'Sunday service', total: 148, guests: 9 },
      birthdays: 4,
    }),
  },
  {
    key: 'birthdays',
    name: 'Birthdays this week',
    when: 'Mondays, 7 AM',
    to: 'Each leader whose network has birthdays Monday to Sunday',
    email: birthdaysEmail(ctx, {
      name: 'Mark Dela Cruz',
      people: [
        { name: 'Joshua Reyes', day: 'Tue, Nov 25', turns: 24 },
        { name: 'Anna Cruz', day: 'Fri, Nov 28', turns: 31 },
        { name: 'Liza Bautista', day: 'Sun, Nov 30', turns: null },
      ],
    }),
  },
  {
    key: 'attendance',
    name: 'Attendance still open',
    when: 'Mondays, 9 AM, only if last Sunday’s service isn’t locked',
    to: 'Admins',
    email: attendanceOpenEmail(ctx, {
      id: 'sample',
      title: 'Sunday service',
      date: 'Sun, Nov 23',
      marked: 148,
    }),
  },
  {
    key: 'portal',
    name: 'Report filed from a disciple’s page',
    when: 'Right after a disciple files a cell report from their page',
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
