/* Every email GCC Admin sends: subject, inbox preview, HTML and plain
   text, from one layout. Pure, so the previews are exactly what's sent
   (`pnpm email:preview` writes them to a page). */

export type Email = {
  subject: string
  preview: string
  html: string
  text: string
}

type Ctx = { site: string }

const INK = '#141414'
const MUTED = '#6b6b6b'
const LINE = '#e6e2da'
const GOLD = '#8a6a22'
const PAPER = '#f4f2ee'

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name

type Block =
  | { p: string }
  | { verse: string; ref: string }
  | { button: string; href: string }
  | { list: Array<[string, string]>; title?: string }
  | { stats: Array<[string, string | number]> }
  | { small: string }

function blockHtml(b: Block): string {
  if ('p' in b)
    return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK}">${b.p}</p>`
  if ('verse' in b)
    return `<div style="margin:4px 0 20px;padding:12px 16px;border-left:3px solid ${GOLD};background:${PAPER}"><p style="margin:0;font-size:14px;line-height:1.6;color:${INK};font-style:italic">${esc(b.verse)}</p><p style="margin:6px 0 0;font-size:12px;font-weight:600;color:${MUTED}">${esc(b.ref)}</p></div>`
  if ('button' in b)
    return `<p style="margin:8px 0 20px"><a href="${esc(b.href)}" style="display:inline-block;background:${GOLD};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px">${esc(b.button)}</a></p>`
  if ('stats' in b)
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${LINE};border-collapse:collapse"><tr>${b.stats
      .map(
        ([label, n], i) =>
          `<td style="padding:12px 14px;${i ? `border-left:1px solid ${LINE};` : ''}vertical-align:top"><div style="font-size:12px;color:${MUTED}">${esc(label)}</div><div style="font-size:22px;font-weight:700;color:${INK};margin-top:2px">${esc(String(n))}</div></td>`,
      )
      .join('')}</tr></table>`
  if ('list' in b)
    return `${b.title ? `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${MUTED}">${esc(b.title)}</p>` : ''}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-top:1px solid ${LINE};border-collapse:collapse">${b.list
      .map(
        ([left, right]) =>
          `<tr><td style="padding:9px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK}">${esc(left)}</td><td style="padding:9px 0;border-bottom:1px solid ${LINE};font-size:13px;color:${MUTED};text-align:right;white-space:nowrap">${esc(right)}</td></tr>`,
      )
      .join('')}</table>`
  return `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${MUTED}">${b.small}</p>`
}

function blockText(b: Block): string {
  const plain = (s: string) => s.replace(/<[^>]+>/g, '')
  if ('p' in b) return plain(b.p)
  if ('verse' in b) return `"${b.verse}"\n— ${b.ref}`
  if ('button' in b) return `${b.button}: ${b.href}`
  if ('stats' in b) return b.stats.map(([l, n]) => `${l}: ${n}`).join('\n')
  if ('list' in b)
    return [
      ...(b.title ? [b.title] : []),
      ...b.list.map(([l, r]) => `• ${l} — ${r}`),
    ].join('\n')
  return plain(b.small)
}

function layout(
  ctx: Ctx,
  subject: string,
  preview: string,
  blocks: Array<Block>,
): Email {
  const body = blocks.map(blockHtml).join('')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head><body style="margin:0;padding:0;background:${PAPER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE}">
<tr><td style="background:#0a0a0a;padding:14px 24px"><img src="${esc(ctx.site)}/logo.png" width="28" height="28" alt="" style="vertical-align:middle;border:0"><span style="vertical-align:middle;margin-left:10px;font-family:ui-monospace,Menlo,monospace;font-size:11px;font-weight:700;letter-spacing:2px;color:#d9d4c7">GRACE CITY CHURCH</span></td></tr>
<tr><td style="padding:28px 24px 12px">${body}<p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:${INK}">With grace,<br>GCC Admin</p></td></tr>
<tr><td style="padding:16px 24px 22px;border-top:1px solid ${LINE};font-size:12px;line-height:1.6;color:${MUTED}">Grace City Church · Morong, Rizal<br><a href="${esc(ctx.site)}/home" style="color:${MUTED}">GCC Admin</a> · <a href="${esc(ctx.site)}/resources" style="color:${MUTED}">GCC Resources</a></td></tr>
</table></td></tr></table></body></html>`
  const text = `${blocks.map(blockText).join('\n\n')}\n\nWith grace,\nGCC Admin\n\n—\nGrace City Church · Morong, Rizal\n${ctx.site}/home`
  return { subject, preview, html, text }
}

const FAITHFUL = {
  verse: 'Whoever is faithful in very little is also faithful in much.',
  ref: 'Luke 16:10',
}

/** 1. Sent by an admin from Leaders (Remind), as in v2. */
export function reportReminderEmail(ctx: Ctx, p: { name: string }) {
  return layout(
    ctx,
    'Reminder: your cell reports for this week',
    'A quick reminder to file this week’s cell reports.',
    [
      { p: `Hi ${esc(first(p.name))},` },
      {
        p: 'A quick reminder to file your cell reports for this week in GCC Admin. Being faithful in the small tasks honors the Lord.',
      },
      FAITHFUL,
      { button: 'File a cell report', href: `${ctx.site}/reports/new` },
      { small: 'Already filed them? Thank you! You can ignore this email.' },
    ],
  )
}

/** 2. Saturday 5 PM: leaders with no cell report this week yet. */
export function weeklyNudgeEmail(ctx: Ctx, p: { name: string; week: string }) {
  return layout(
    ctx,
    'Your cell report for this week',
    `No cell report from you yet for ${p.week}.`,
    [
      { p: `Hi ${esc(first(p.name))},` },
      {
        p: `We haven’t seen a cell report from you for this week (<strong>${esc(p.week)}</strong>) yet. If your group met, it only takes a couple of minutes, and you can do it from your phone.`,
      },
      { button: 'File this week’s report', href: `${ctx.site}/reports/new` },
      {
        small:
          'If your group didn’t meet this week, there’s nothing to file. This reminder goes out on Saturdays only to leaders who haven’t reported yet.',
      },
    ],
  )
}

/** 3. Monday 8 AM: leaders whose last cell report is 14 or more days old. */
export function overdueEmail(
  ctx: Ctx,
  p: { name: string; days: number | null; last: string | null },
) {
  const since =
    p.last && p.days !== null
      ? `Your last cell report was on <strong>${esc(p.last)}</strong>, ${p.days} days ago.`
      : 'We don’t have a cell report from you yet.'
  return layout(
    ctx,
    p.days !== null
      ? `It’s been ${Math.floor(p.days / 7)} weeks since your last cell report`
      : 'We haven’t had a cell report from you yet',
    'Catching up keeps your disciples’ attendance right.',
    [
      { p: `Hi ${esc(first(p.name))},` },
      {
        p: `${since} If your group has been meeting, please catch up on the reports so your disciples’ cell attendance and lessons stay up to date.`,
      },
      { button: 'Catch up on reports', href: `${ctx.site}/reports/new` },
      {
        p: 'If something has come up, just reply to this email and let us know how we can help or pray for you.',
      },
    ],
  )
}

/** 4. Monday 7 AM, to admins and pastors: last week at a glance. */
export function weeklySummaryEmail(
  ctx: Ctx,
  p: {
    week: string
    reported: number
    leaders: number
    notReported: Array<{ name: string; last: string }>
    reports: {
      open: number
      discipleship: number
      soulWinning: number
      consolidation: number
    }
    newBelievers: number
    sunday: { title: string; total: number; guests: number } | null
    birthdays: number
  },
) {
  const blocks: Array<Block> = [
    {
      p: `Here’s last week (<strong>${esc(p.week)}</strong>) at Grace City Church.`,
    },
    {
      stats: [
        ['Leaders reported', `${p.reported} of ${p.leaders}`],
        ['New believers', p.newBelievers],
        ...(p.sunday
          ? ([['Sunday', p.sunday.total]] as Array<[string, number]>)
          : []),
      ],
    },
    {
      title: 'Reports filed',
      list: [
        ['Open cell', String(p.reports.open)],
        ['Discipleship', String(p.reports.discipleship)],
        ['Soul winning', String(p.reports.soulWinning)],
        ['Consolidation', String(p.reports.consolidation)],
      ],
    },
  ]
  if (p.sunday)
    blocks.push({
      p: `${esc(p.sunday.title)}: ${p.sunday.total} came, ${p.sunday.guests} of them guests.`,
    })
  if (p.notReported.length)
    blocks.push({
      title: `Not reported · ${p.notReported.length}`,
      list: p.notReported.map((l) => [l.name, l.last]),
    })
  else blocks.push({ p: 'Every leader reported. Praise God!' })
  if (p.birthdays)
    blocks.push({
      small: `${p.birthdays} ${p.birthdays === 1 ? 'birthday' : 'birthdays'} this week; see Home.`,
    })
  blocks.push({ button: 'Open Insights', href: `${ctx.site}/insights` })
  return layout(
    ctx,
    `Last week at GCC: ${p.reported} of ${p.leaders} leaders reported`,
    `${p.newBelievers} new believers, ${p.notReported.length} leaders not reported.`,
    blocks,
  )
}

/** 5. Monday 7 AM, to each leader whose network has birthdays this week. */
export function birthdaysEmail(
  ctx: Ctx,
  p: {
    name: string
    people: Array<{ name: string; day: string; turns: number | null }>
  },
) {
  return layout(
    ctx,
    p.people.length === 1
      ? `${first(p.people[0].name)}’s birthday is this week`
      : `${p.people.length} birthdays in your network this week`,
    p.people.map((b) => `${first(b.name)} (${b.day})`).join(', '),
    [
      { p: `Hi ${esc(first(p.name))},` },
      {
        p: 'These disciples in your network celebrate their birthday this week. A message, a call or a prayer goes a long way.',
      },
      {
        list: p.people.map((b) => [
          b.name,
          b.turns ? `${b.day} · turns ${b.turns}` : b.day,
        ]),
      },
      { button: 'Open GCC Admin', href: `${ctx.site}/home` },
    ],
  )
}

/** 6. Monday 9 AM, to admins: last Sunday's attendance still open. */
export function attendanceOpenEmail(
  ctx: Ctx,
  p: { id: string; title: string; date: string; marked: number },
) {
  return layout(
    ctx,
    `Lock the attendance for ${p.title}`,
    `${p.marked} marked on ${p.date}; it’s still open.`,
    [
      {
        p: `The attendance for <strong>${esc(p.title)}</strong> (${esc(p.date)}) is still open, with ${p.marked} people marked.`,
      },
      {
        p: 'Once the list is final, lock it so it isn’t changed by mistake. You can unlock it anytime.',
      },
      { button: 'Review and lock', href: `${ctx.site}/attendance/${p.id}` },
    ],
  )
}

/** 7. When a disciple files a cell report from their page, to their
 * network leader. */
export function portalReportEmail(
  ctx: Ctx,
  p: {
    leader: string
    disciple: string
    type: string
    date: string
    venue: string
    lesson: string | null
    attendees: Array<string>
    reportId: string
  },
) {
  return layout(
    ctx,
    `${first(p.disciple)} filed a cell report`,
    `${p.type} at ${p.venue}, ${p.date}: ${p.attendees.length} came.`,
    [
      { p: `Hi ${esc(first(p.leader))},` },
      {
        p: `<strong>${esc(p.disciple)}</strong> filed a cell report from their page. It’s in your network’s reports.`,
      },
      {
        list: [
          ['Type', p.type],
          ['When', p.date],
          ['Venue', p.venue],
          ...(p.lesson
            ? ([['Lesson', p.lesson]] as Array<[string, string]>)
            : []),
          ['Who came', String(p.attendees.length)],
        ],
      },
      ...(p.attendees.length
        ? [{ small: esc(p.attendees.join(', ')) } satisfies Block]
        : []),
      { button: 'Open the report', href: `${ctx.site}/reports/${p.reportId}` },
    ],
  )
}
