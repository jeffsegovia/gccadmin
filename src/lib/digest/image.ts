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
const KIND = {
  open: '#5b8def',
  discipleship: '#3fa58a',
  soulWinning: '#e0703a',
  consolidation: '#d4a02e',
} as const
const FONT = `Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
const MAX_ROWS = 30
const ROW = 44

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
  ctx.fillRect(0, 0, W, 88)
  if (logo) ctx.drawImage(logo, PAD, 24, 40, 40)
  text('GRACE CITY CHURCH', PAD + (logo ? 56 : 0), 51, 20, '#d9d4c7', 700)
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 88, W, 3)
  y = 150
  text(DIGEST_WORDS[d.kind].title, PAD, y, 46, INK, 700)
  text(d.label, W - PAD, y, 28, GOLD, 600, 'right')
  y += 14

  const section = (title: string) => {
    y += 30
    text(title.toUpperCase(), PAD, y, 18, GOLD, 700)
    y += 12
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
    const h = all.length * ROW
    ctx.fillStyle = CARD
    ctx.beginPath()
    ctx.roundRect(PAD, y, inner, h, 16)
    ctx.fill()
    all.forEach((r, i) => {
      const mid = y + i * ROW + 30
      if (i) {
        ctx.fillStyle = LINE
        ctx.fillRect(PAD + 20, y + i * ROW, inner - 40, 1)
      }
      font(ctx, 22, 600)
      const rightW = r.right
        ? (font(ctx, 21, 400), ctx.measureText(r.right).width)
        : 0
      let x = PAD + 20
      if (r.dot) {
        ctx.fillStyle = r.dot
        ctx.beginPath()
        ctx.roundRect(x, mid - 14, 12, 12, 3)
        ctx.fill()
        x += 24
      }
      font(ctx, 22, 500)
      const label = fit(ctx, r.left, inner - 40 - (x - PAD - 20) - rightW - 16)
      text(label, x, mid, 22, INK, 500)
      if (r.right) text(r.right, PAD + inner - 20, mid, 21, MUTED, 400, 'right')
    })
    y += h
  }
  const note = (s: string) => {
    font(ctx, 21, 400)
    ctx.fillStyle = MUTED
    ctx.textAlign = 'left'
    ctx.fillText(s, PAD, y + 24)
    y += 34
  }

  // Numbers in small tiles: the headline three, then the four report
  // types (each with its color).
  const tiles = (
    items: ReadonlyArray<{ label: string; value: string; dot?: string }>,
  ) => {
    const gap = 12
    const bw = (inner - gap * (items.length - 1)) / items.length
    items.forEach((t, i) => {
      const x = PAD + i * (bw + gap)
      ctx.fillStyle = CARD
      ctx.beginPath()
      ctx.roundRect(x, y, bw, 82, 14)
      ctx.fill()
      let lx = x + 18
      if (t.dot) {
        ctx.fillStyle = t.dot
        ctx.beginPath()
        ctx.roundRect(lx, y + 17, 11, 11, 3)
        ctx.fill()
        lx += 19
      }
      font(ctx, 18, 400)
      text(fit(ctx, t.label, bw - (lx - x) - 12), lx, y + 28, 18, MUTED)
      text(t.value, x + 18, y + 67, 38, INK, 700)
    })
    y += 82
  }
  const avg = d.sundays.length
    ? Math.round(d.sundays.reduce((a, s) => a + s.total, 0) / d.sundays.length)
    : null
  y += 16
  tiles([
    { label: 'Leaders reported', value: `${d.reported} of ${d.leaders}` },
    { label: 'New believers', value: String(d.newBelievers) },
    {
      label: d.sundays.length > 1 ? 'Sundays (avg)' : 'Sunday',
      value: avg === null ? '—' : String(avg),
    },
  ])

  // 1. Reports by type.
  section('Reports filed')
  tiles([
    { label: 'Open Cell', value: String(d.reports.open), dot: KIND.open },
    {
      label: 'Discipleship',
      value: String(d.reports.discipleship),
      dot: KIND.discipleship,
    },
    {
      label: 'Soul winning',
      value: String(d.reports.soulWinning),
      dot: KIND.soulWinning,
    },
    {
      label: 'Consolidation',
      value: String(d.reports.consolidation),
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

  // 6. GCC so far: just numbers, one row per member type.
  section(`GCC so far · ${d.members.total} disciples`)
  const cols = [
    ['Total', 600],
    ['NACS', 730],
    ['ACS', 840],
    ['Regular', 948],
  ] as const
  const mrows = [
    ...d.members.rows.map((r) => ({
      label: r.label,
      n: [r.total, r.nacs, r.acs, r.regular],
      bold: false,
    })),
    {
      label: 'All',
      n: [
        d.members.total,
        ...[0, 1, 2].map((k) =>
          d.members.rows.reduce((a, r) => a + [r.nacs, r.acs, r.regular][k], 0),
        ),
      ],
      bold: true,
    },
  ]
  const mh = (mrows.length + 1) * 40
  ctx.fillStyle = CARD
  ctx.beginPath()
  ctx.roundRect(PAD, y, inner, mh, 14)
  ctx.fill()
  cols.forEach(([label, x]) =>
    text(label, PAD + x, y + 28, 18, MUTED, 600, 'right'),
  )
  mrows.forEach((r, i) => {
    const top = y + (i + 1) * 40
    ctx.fillStyle = LINE
    ctx.fillRect(PAD + 20, top, inner - 40, 1)
    text(r.label, PAD + 20, top + 28, 21, INK, r.bold ? 700 : 500)
    cols.forEach(([, x], k) =>
      text(
        String(r.n[k]),
        PAD + x,
        top + 28,
        21,
        r.bold ? INK : MUTED,
        r.bold ? 700 : 400,
        'right',
      ),
    )
  })
  y += mh + 40
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
