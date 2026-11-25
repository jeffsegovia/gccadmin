import { jsPDF } from 'jspdf'
import { CELL_STATUS, CHURCH_STATUS, CELL_TYPE } from '@/lib/labels'
import type { CellStatus, CellType, ChurchStatus } from '@/db/schema'

export type PdfReport = {
  id: string
  type: CellType
  date: string
  createdAt: string
  venue: string
  leaderName: string | null
  assistantName: string | null
  lessonTitle: string | null
  scripture: ReadonlyArray<string>
  attendees: ReadonlyArray<{
    name: string
    status: CellStatus
    churchStatus: ChurchStatus
  }>
}

const TZ = 'Asia/Manila'
const day = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date(iso))
const dayTime = (iso: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso))

/** The logo as a data URL, for the PDF's header (it's served by the app). */
export async function loadLogo(): Promise<string | null> {
  try {
    const blob = await (await fetch('/logo.png')).blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** v2's cell report PDF: one A5 page per report, the church's black
 * header with the logo, the report's details, then the attendees as they
 * were that day (# · Name · Cell Status · Church Status). A long list
 * carries on to the next page. */
export function cellReportsPdf(
  reports: ReadonlyArray<PdfReport>,
  logo: string | null,
): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a5' })
  doc.setProperties({ title: 'GCC Cell Reports', subject: 'GCC Cell Report' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const X = 28
  const line = (y: number) => {
    doc.setDrawColor(221)
    doc.setLineWidth(0.6)
    doc.line(X, y, W - X, y)
  }
  const field = (
    label: string,
    value: string,
    x: number,
    y: number,
    full = false,
  ) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(`${label}:`, x, y)
    const lw = doc.getTextWidth(`${label}: `)
    doc.setFont('helvetica', 'normal')
    const max = (full || x >= W / 2 ? W - X : W / 2 - 8) - x - lw
    const lines = doc.splitTextToSize(value || '—', max) as Array<string>
    doc.text(lines, x + lw, y)
    return lines.length
  }
  const header = () => {
    doc.setFillColor(0, 0, 0)
    doc.rect(0, 0, W, 52, 'F')
    if (logo) doc.addImage(logo, 'PNG', 12, 10, 32, 32)
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Abundant Grace City Church International Ministries', W / 2, 24, {
      align: 'center',
    })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Morong, Rizal, Philippines', W / 2, 37, { align: 'center' })
    doc.setTextColor(0)
  }
  const cols = [
    { label: '#', x: X, w: 18, align: 'left' as const },
    { label: 'Name', x: X + 22, w: 170, align: 'left' as const },
    { label: 'Cell Status', x: X + 200, w: 80, align: 'center' as const },
    { label: 'Church Status', x: X + 284, w: 80, align: 'center' as const },
  ]
  const tableHead = (y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    for (const c of cols)
      doc.text(c.label, c.align === 'center' ? c.x + c.w / 2 : c.x, y, {
        align: c.align,
      })
    line(y + 5)
    return y + 16
  }

  reports.forEach((r, i) => {
    if (i > 0) doc.addPage()
    header()
    let y = 76
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Cell Report', W / 2, y, { align: 'center' })
    y += 12
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.text(`Date Reported: ${day(r.createdAt)}`, W / 2, y, {
      align: 'center',
    })
    y += 12
    line(y)
    y += 16
    field('Type', CELL_TYPE[r.type], X, y)
    y += 14
    field('Network Leader', r.leaderName ?? '—', X, y)
    field('Handled By', r.assistantName ?? r.leaderName ?? '—', W / 2 + 4, y)
    y += 14
    const venueLines = field('Venue', r.venue, X, y)
    field('Date', dayTime(r.date), W / 2 + 4, y)
    y += 10 * venueLines + 14
    y += field('Lesson', r.lessonTitle ?? '—', X, y, true) * 10 + 4
    y +=
      field(
        'Scripture References',
        r.scripture.slice(0, 4).join(', '),
        X,
        y,
        true,
      ) *
        10 +
      14
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(`Attendees (${r.attendees.length})`, X, y)
    y = tableHead(y + 14)
    doc.setFont('helvetica', 'normal')
    r.attendees.forEach((a, n) => {
      if (y > H - 30) {
        doc.addPage()
        header()
        y = tableHead(76)
        doc.setFont('helvetica', 'normal')
      }
      doc.text(`${n + 1}.`, cols[0].x, y)
      doc.text(
        (doc.splitTextToSize(a.name, cols[1].w) as Array<string>)[0],
        cols[1].x,
        y,
      )
      doc.text(CELL_STATUS[a.status], cols[2].x + cols[2].w / 2, y, {
        align: 'center',
      })
      doc.text(CHURCH_STATUS[a.churchStatus], cols[3].x + cols[3].w / 2, y, {
        align: 'center',
      })
      line(y + 5)
      y += 16
    })
  })
  return doc
}
