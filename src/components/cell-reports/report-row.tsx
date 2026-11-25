import { Link } from '@tanstack/react-router'
import { KindPill, LessonTag } from '@/components/status-pill'
import { RowChevron } from '@/components/ui/list'
import { shortDate } from '@/lib/dates'
import type { CellType } from '@/db/schema'

export const attendeesText = (n: number) =>
  `${n} ${n === 1 ? 'attendee' : 'attendees'}`

/** A cell group report in a list (Home, Cell reports): when, who led it,
 * the lesson, its kind, GCC or custom lesson, and how many came. */
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
  return (
    <Link
      to="/reports/$reportId"
      params={{ reportId: r.id }}
      className="flex min-h-15 min-w-0 items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50"
    >
      <span className="w-12 shrink-0 font-mono text-xs leading-tight text-muted-foreground uppercase">
        {shortDate(r.date)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
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
          {r.lessonTitle ?? 'No lesson'}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <KindPill kind={r.type} />
          {r.customLesson !== undefined && r.lessonTitle && (
            <LessonTag custom={r.customLesson} />
          )}
          <span className="text-xs text-muted-foreground">
            {attendeesText(r.attendees)}
          </span>
        </span>
      </span>
      <RowChevron />
    </Link>
  )
}
