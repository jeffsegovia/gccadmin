import { Link } from '@tanstack/react-router'
import { DateTile } from '@/components/date-tile'
import { KindPill } from '@/components/status-pill'
import { RowChevron } from '@/components/ui/list'
import type { CellType } from '@/db/schema'

export const attendeesText = (n: number) =>
  `${n} ${n === 1 ? 'attendee' : 'attendees'}`

/** A cell group report in a list (Home, Cell reports), in two lines as in
 * Osamu: who led it (and with whom), then the lesson and how many came,
 * its kind at the end. A custom lesson says so; a GCC lesson is the
 * norm and says nothing. */
export function ReportRow({
  r,
}: {
  r: {
    id: string
    date: Date | string
    type: CellType
    leaderName: string | null
    assistantName?: string | null
    lessonTitle: string | null
    customLesson?: boolean
    attendees: number
  }
}) {
  const lesson = r.lessonTitle
    ? `${r.lessonTitle}${r.customLesson ? ' (custom)' : ''}`
    : 'No lesson'
  return (
    <Link
      to="/reports/$reportId"
      params={{ reportId: r.id }}
      className="flex min-h-14 min-w-0 items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
    >
      <DateTile date={r.date} instant />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {r.leaderName}
          {r.assistantName ? (
            <span className="font-normal text-muted-foreground">
              {' '}
              · with {r.assistantName}
            </span>
          ) : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {lesson} · {attendeesText(r.attendees)}
        </span>
      </span>
      <KindPill kind={r.type} />
      <RowChevron />
    </Link>
  )
}
