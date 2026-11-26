/* Every email GCC Admin sends: subject, inbox preview, HTML and plain
   text, from one layout. Pure, so the previews are exactly what's sent
   (`pnpm email:preview` writes them to a page). Each goes out when
   something happens or when someone taps a button; nothing is scheduled. */

import type { Digest } from '@/lib/digest/types'

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
  | {
      table: { title: string; head: Array<string>; rows: Array<Array<string>> }
    }
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
  if ('table' in b) {
    const cell = (v: string, i: number, tag: 'th' | 'td') =>
      `<${tag} style="padding:6px 0;border-bottom:1px solid ${LINE};font-size:13px;${i ? 'text-align:right;' : 'text-align:left;'}${tag === 'th' ? `font-weight:600;color:${MUTED}` : `color:${INK}`}">${esc(v)}</${tag}>`
    return `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${MUTED}">${esc(b.table.title)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-top:1px solid ${LINE};border-collapse:collapse"><tr>${b.table.head.map((h, i) => cell(h, i, 'th')).join('')}</tr>${b.table.rows.map((r) => `<tr>${r.map((v, i) => cell(v, i, 'td')).join('')}</tr>`).join('')}</table>`
  }
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
  if ('table' in b)
    return [
      b.table.title,
      b.table.head.join(' | '),
      ...b.table.rows.map((r) => r.join(' | ')),
    ].join('\n')
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

/** 1. Remind (Home's "Not reported", Leaders): a leader with no cell
 * report this week. One a day per leader. A leader quiet for 14 days or
 * more gets the catch-up wording instead. */
export function reportReminderEmail(
  ctx: Ctx,
  p: { name: string; week: string; days: number | null; last: string | null },
) {
  const hi = { p: `Hi ${esc(first(p.name))},` }
  if (p.days === null || p.days >= 14) {
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
        hi,
        {
          p: `${since} If your group has been meeting, please catch up on the reports so your disciples’ cell attendance and lessons stay up to date.`,
        },
        FAITHFUL,
        { button: 'Catch up on reports', href: `${ctx.site}/reports/new` },
        {
          p: 'If something has come up, just reply to this email and let us know how we can help or pray for you.',
        },
      ],
    )
  }
  return layout(
    ctx,
    'Reminder: your cell report for this week',
    `No cell report from you yet for ${p.week}.`,
    [
      hi,
      {
        p: `We haven’t seen a cell report from you for this week (<strong>${esc(p.week)}</strong>) yet. If your group met, it only takes a couple of minutes, and you can do it from your phone.`,
      },
      FAITHFUL,
      { button: 'File this week’s report', href: `${ctx.site}/reports/new` },
      {
        small:
          'Already filed it, or your group didn’t meet this week? Thank you; you can ignore this email.',
      },
    ],
  )
}

/** 2. "Email" a report on Insights (admins and pastors): last week or
 * last month at a glance, to the admins and pastors. Once per period. It
 * answers six things: reports by type, by leader, who led as an assistant,
 * Sunday attendance, who didn't report, and GCC's members so far. */
export function digestEmail(ctx: Ctx, d: Digest, sentBy: string) {
  const period = d.kind === 'week' ? 'last week' : 'last month'
  const r = d.reports
  const blocks: Array<Block> = [
    {
      p: `Here’s ${period} (<strong>${esc(d.label)}</strong>) at Grace City Church, sent by ${esc(sentBy)}.`,
    },
    {
      stats: [
        ['Leaders reported', `${d.reported} of ${d.leaders}`],
        ['New believers', d.newBelievers],
        ...(d.sundays.length
          ? ([
              [
                d.sundays.length === 1 ? 'Sunday' : 'Sundays (avg)',
                Math.round(
                  d.sundays.reduce((a, s) => a + s.total, 0) / d.sundays.length,
                ),
              ],
            ] as Array<[string, number]>)
          : []),
      ],
    },
    { small: '<strong>1. Reports filed</strong>' },
    {
      stats: [
        ['Open', r.open],
        ['Discipleship', r.discipleship],
        ['Soul winning', r.soulWinning],
        ['Consolidation', r.consolidation],
      ],
    },
  ]
  if (d.byLeader.length)
    blocks.push({
      title: '2. Cell reports by leader',
      list: d.byLeader.map((l) => [
        l.name,
        `Open ${l.open} · Discipleship ${l.discipleship}`,
      ]),
    })
  if (d.assistants.length)
    blocks.push({
      title: '3. Assistants who led cell groups',
      list: d.assistants.map((a) => [
        a.name,
        `${a.n} ${a.n === 1 ? 'cell group' : 'cell groups'}`,
      ]),
    })
  else
    blocks.push({
      p: `3. No assistant led a cell group ${period}.`,
    })
  blocks.push(
    d.sundays.length
      ? {
          title: '4. Sunday service attendance',
          list: d.sundays.map((s) => [
            `${s.title} · ${s.date}`,
            `${s.total} came, ${s.guests} guests`,
          ]),
        }
      : { p: `4. No Sunday service was recorded ${period}.` },
  )
  blocks.push(
    d.notReported.length
      ? {
          title: `5. Not reported · ${d.notReported.length}`,
          list: d.notReported.map((l) => [l.name, l.last]),
        }
      : { p: '5. Every leader reported. Praise God!' },
  )
  const sum = (k: 'nacs' | 'acs' | 'regular') =>
    d.members.rows.reduce((a, m) => a + m[k], 0)
  blocks.push({
    table: {
      title: `6. GCC so far · ${d.members.total} disciples`,
      head: ['', 'Total', 'NACS', 'ACS', 'Regular'],
      rows: [
        ...d.members.rows.map((m) => [
          m.label,
          String(m.total),
          String(m.nacs),
          String(m.acs),
          String(m.regular),
        ]),
        [
          'All',
          String(d.members.total),
          String(sum('nacs')),
          String(sum('acs')),
          String(sum('regular')),
        ],
      ],
    },
  })
  blocks.push({ button: 'Open Insights', href: `${ctx.site}/insights` })
  return layout(
    ctx,
    `${d.kind === 'week' ? 'Last week' : d.label} at GCC: ${d.reported} of ${d.leaders} leaders reported`,
    `${d.newBelievers} new believers, ${d.notReported.length} leaders not reported.`,
    blocks,
  )
}

/** 3. When a disciple files a cell report from their page: to their
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

/** 4. When an admin links a sign-in to a primary leader (Leaders → Link
 * account): to that leader. */
export function welcomeLeaderEmail(ctx: Ctx, p: { name: string }) {
  return layout(
    ctx,
    'You’re set up in GCC Admin',
    'Your account is linked to your leader record.',
    [
      { p: `Hi ${esc(first(p.name))},` },
      {
        p: 'Your account is now linked to your leader record in GCC Admin. From your phone you can file cell reports, keep your disciples’ details up to date, record soul winning and take Sunday attendance.',
      },
      {
        p: 'You can also give each of your disciples their own page: open a disciple and tap <strong>Portal link</strong> to share it.',
      },
      { button: 'Open GCC Admin', href: `${ctx.site}/home` },
      {
        small:
          'On your phone, add it to your home screen (Share, then Add to Home Screen) to open it like an app.',
      },
    ],
  )
}
