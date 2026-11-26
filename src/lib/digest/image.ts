import { DIGEST_WORDS } from './types'
import type { Digest } from './types'

/* The report as one tall picture, to download or share in a group chat.
   Drawn on a canvas from the same Digest the email is made from, so the
   two never differ. Browser only. */

const W = 1080
const PAD = 56
const INK = '#f3f0e8'
const MUTED = '#a29e93'
const LINE = '#2b2b2b'
const CARD = '#161616'
const GOLD = '#d9b45a'
const BG = '#0a0a0a'
// One gold ramp for the member bars, faint to full as someone settles in:
// not yet attended (NACS), attended (ACS), regular.
const RAMP = ['#4a483f', '#8f7a3f', GOLD] as const
const KIND = {
  open: '#5b8def',
  discipleship: '#3fa58a',
  soulWinning: '#e0703a',
  consolidation: '#d4a02e',
} as const
const FONT = `Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
const MAX_ROWS = 30

type Ctx = CanvasRenderingContext2D

function font(ctx: Ctx, size: number, weight = 400) {
  ctx.font = `${weight} ${size}px ${FONT}`
}

/** The text cut with an ellipsis to fit the width. */
function fit(ctx: Ctx, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width)
    t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = '/logo.png'
  })
}

function draw(ctx: Ctx, d: Digest, logo: HTMLImageElement | null) {
  let y = 0
  const inner = W - PAD * 2
  const text = (
    s: string,
    x: number,
    baseline: number,
    size: number,
    color: string,
    weight = 400,
    align: CanvasTextAlign = 'left',
  ) => {
    font(ctx, size, weight)
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(s, x, baseline)
  }

  // Header band.
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, 112)
  if (logo) ctx.drawImage(logo, PAD, 34, 44, 44)
  text('GRACE CITY CHURCH', PAD + (logo ? 62 : 0), 63, 22, '#d9d4c7', 700)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 112, W, 3)
  y = 190
  text(DIGEST_WORDS[d.kind].title, PAD, y, 58, INK, 700)
  y += 48
  text(d.label, PAD, y, 30, GOLD, 600)
  y += 40

  const section = (title: string) => {
    y += 40
    text(title.toUpperCase(), PAD, y, 21, GOLD, 700)
    y += 18
  }

  // A boxed list: each row a name and a right-hand note, a dot optional.
  const rows = (
    items: ReadonlyArray<{ left: string; right: string; dot?: string }>,
  ) => {
    const shown = items.slice(0, MAX_ROWS)
    const extra = items.length - shown.length
    const all = extra
      ? [...shown, { left: `+${extra} more`, right: '' }]
      : shown
    const h = all.length * 58
    ctx.fillStyle = CARD
    ctx.beginPath()
    ctx.roundRect(PAD, y, inner, h, 16)
    ctx.fill()
    all.forEach((r, i) => {
      const mid = y + i * 58 + 37
      if (i) {
        ctx.fillStyle = LINE
        ctx.fillRect(PAD + 24, y + i * 58, inner - 48, 1)
      }
      font(ctx, 25, 600)
      const rightW = r.right
        ? (font(ctx, 23, 400), ctx.measureText(r.right).width)
        : 0
      let x = PAD + 24
      if (r.dot) {
        ctx.fillStyle = r.dot
        ctx.beginPath()
        ctx.roundRect(x, mid - 16, 14, 14, 4)
        ctx.fill()
        x += 28
      }
      font(ctx, 25, 500)
      const label = fit(ctx, r.left, inner - 48 - (x - PAD - 24) - rightW - 20)
      text(label, x, mid, 25, INK, 500)
      if (r.right) text(r.right, PAD + inner - 24, mid, 23, MUTED, 400, 'right')
    })
    y += h
  }
  const note = (s: string) => {
    font(ctx, 24, 400)
    ctx.fillStyle = MUTED
    ctx.textAlign = 'left'
    ctx.fillText(s, PAD, y + 26)
    y += 40
  }

  // Three numbers up top.
  const avg = d.sundays.length
    ? Math.round(d.sundays.reduce((a, s) => a + s.total, 0) / d.sundays.length)
    : null
  const stats: Array<[string, string]> = [
    ['Leaders reported', `${d.reported} of ${d.leaders}`],
    ['New believers', String(d.newBelievers)],
    [
      d.sundays.length > 1 ? 'Sundays (avg)' : 'Sunday',
      avg === null ? '—' : String(avg),
    ],
  ]
  y += 12
  const bw = (inner - 32) / 3
  stats.forEach(([label, n], i) => {
    const x = PAD + i * (bw + 16)
    ctx.fillStyle = CARD
    ctx.beginPath()
    ctx.roundRect(x, y, bw, 124, 16)
    ctx.fill()
    text(label, x + 22, y + 40, 21, MUTED)
    text(n, x + 22, y + 94, 48, INK, 700)
  })
  y += 124

  // 1. Reports by type.
  section('Reports filed')
  rows([
    { left: 'Open Cell', right: String(d.reports.open), dot: KIND.open },
    {
      left: 'Discipleship',
      right: String(d.reports.discipleship),
      dot: KIND.discipleship,
    },
    {
      left: 'Soul winning',
      right: String(d.reports.soulWinning),
      dot: KIND.soulWinning,
    },
    {
      left: 'Consolidation',
      right: String(d.reports.consolidation),
      dot: KIND.consolidation,
    },
  ])

  // 2. Each leader's cell reports by type.
  if (d.byLeader.length) {
    section('Cell reports by leader')
    rows(
      d.byLeader.map((l) => ({
        left: l.name,
        right: `Open ${l.open} · Discipleship ${l.discipleship}`,
      })),
    )
  }

  // 3. Assistants who led.
  section('Assistants who led cell groups')
  if (d.assistants.length)
    rows(
      d.assistants.map((a) => ({
        left: a.name,
        right: `${a.n} ${a.n === 1 ? 'cell group' : 'cell groups'}`,
      })),
    )
  else note('None this period.')

  // 4. Sunday attendance.
  section('Sunday service')
  if (d.sundays.length)
    rows(
      d.sundays.map((s) => ({
        left: `${s.title} · ${s.date}`,
        right: `${s.total} came · ${s.guests} guests`,
      })),
    )
  else note('No service recorded.')

  // 5. Who didn't report.
  section(
    `Not reported${d.notReported.length ? ` · ${d.notReported.length}` : ''}`,
  )
  if (d.notReported.length)
    rows(d.notReported.map((l) => ({ left: l.name, right: l.last })))
  else note('Every leader reported. Praise God!')

  // 6. GCC so far, per member type, as a bar each.
  section(`GCC so far · ${d.members.total} disciples`)
  const most = Math.max(1, ...d.members.rows.map((r) => r.total))
  const mh = d.members.rows.length * 104
  ctx.fillStyle = CARD
  ctx.beginPath()
  ctx.roundRect(PAD, y, inner, mh, 16)
  ctx.fill()
  d.members.rows.forEach((r, i) => {
    const top = y + i * 104
    text(r.label, PAD + 24, top + 40, 25, INK, 600)
    text(
      `${r.total} in all`,
      PAD + inner - 24,
      top + 40,
      23,
      MUTED,
      400,
      'right',
    )
    const full = inner - 48
    const bar = Math.max(24, (r.total / most) * full)
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(PAD + 24, top + 54, bar, 16, 8)
    ctx.clip()
    let x = PAD + 24
    ;[r.nacs, r.acs, r.regular].forEach((n, k) => {
      const w = (n / Math.max(1, r.total)) * bar
      ctx.fillStyle = RAMP[k]
      ctx.fillRect(x, top + 54, w, 16)
      x += w
    })
    ctx.restore()
    text(
      `NACS ${r.nacs}  ·  ACS ${r.acs}  ·  Regular ${r.regular}`,
      PAD + 24,
      top + 94,
      20,
      MUTED,
    )
  })
  y += mh + 22
  // Legend.
  let lx = PAD
  ;(
    [
      ['Not yet attended (NACS)', RAMP[0]],
      ['Attended (ACS)', RAMP[1]],
      ['Regular', RAMP[2]],
    ] as const
  ).forEach(([label, color]) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(lx, y + 8, 16, 16, 4)
    ctx.fill()
    font(ctx, 20, 400)
    text(label, lx + 26, y + 23, 20, MUTED)
    lx += 26 + ctx.measureText(label).width + 30
  })
  y += 70
  text(
    'gccadmin · Grace City Church, Morong, Rizal',
    W / 2,
    y,
    19,
    MUTED,
    400,
    'center',
  )
  return y + 44
}

/** The report as a PNG. Drawn once to measure it, then at its height. */
export async function renderDigestImage(d: Digest): Promise<Blob> {
  const logo = await loadLogo()
  const scratch = document.createElement('canvas')
  scratch.width = W
  scratch.height = 8000
  const height = Math.ceil(draw(scratch.getContext('2d')!, d, logo))
  const canvas = document.createElement('canvas')
  // Twice the pixels, so it stays sharp when a chat app zooms it.
  canvas.width = W * 2
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, height)
  draw(ctx, d, logo)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error('The image couldn’t be made.')),
      'image/png',
    ),
  )
}

export function digestFileName(d: Digest) {
  return `gcc-${d.kind === 'week' ? 'weekly' : 'monthly'}-report-${d.key}.png`
}
