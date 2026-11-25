import { jsPDF } from 'jspdf'
import { CELL_TYPE } from '@/lib/labels'
import { dateTime } from '@/lib/dates'
import type { CellType } from '@/db/schema'

/** The reports in view as a printable PDF table (v2's "View PDF"). */
export function reportsPdf(
  title: string,
  rows: ReadonlyArray<{
    date: Date | string
    leaderName: string | null
    assistantName: string | null
    lessonTitle: string | null
    type: CellType
    venue: string
    attendees: number
  }>,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  const cols = [
    { label: 'Date', w: 130 },
    { label: 'Leader', w: 150 },
    { label: 'Lesson', w: 190 },
    { label: 'Type', w: 80 },
    { label: 'Venue', w: 150 },
    { label: 'Came', w: 40 },
  ]
  let y = 48
  doc.setFontSize(15).text(title, 36, y)
  y += 26
  const header = () => {
    doc.setFontSize(9).setFont('helvetica', 'bold')
    let x = 36
    for (const c of cols) {
      doc.text(c.label, x, y)
      x += c.w
    }
    doc.setFont('helvetica', 'normal')
    y += 16
  }
  header()
  const fit = (text: string, w: number) => {
    const lines = doc.splitTextToSize(text, w - 8) as Array<string>
    return lines.length > 1 ? `${lines[0].slice(0, -1)}…` : (lines[0] ?? '')
  }
  for (const r of rows) {
    if (y > height - 40) {
      doc.addPage()
      y = 48
      header()
    }
    const cells = [
      dateTime(r.date),
      r.assistantName
        ? `${r.leaderName ?? ''} (${r.assistantName})`
        : (r.leaderName ?? ''),
      r.lessonTitle ?? '',
      CELL_TYPE[r.type],
      r.venue,
      String(r.attendees),
    ]
    let x = 36
    cells.forEach((text, i) => {
      doc.text(fit(text, cols[i].w), x, y)
      x += cols[i].w
    })
    doc.setDrawColor(220).line(36, y + 6, width - 36, y + 6)
    y += 18
  }
  doc.save(`${title.replace(/[^\w-]+/g, '-').toLowerCase()}.pdf`)
}
