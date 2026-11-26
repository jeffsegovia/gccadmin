import { Link, useNavigate } from '@tanstack/react-router'
import { KindPill, LessonTag } from '@/components/status-pill'
import { RowChevron } from '@/components/ui/list'
import { dateTime } from '@/lib/dates'
import type { CellType } from '@/db/schema'

type Row = {
  id: string
  date: Date | string
  type: CellType
  leaderName: string | null
  assistantName?: string | null
  lessonTitle: string | null
  customLesson?: boolean
  attendees: number
}

/** Wide screens: cell reports as a table, a week at a time (a full-width
 * label row per week keeps the columns lined up across weeks). Phones use
 * `ReportRow` lists. Headers never wrap. */
export function ReportsTable({
  groups,
}: {
  groups: ReadonlyArray<readonly [string, ReadonlyArray<Row>]>
}) {
  const navigate = useNavigate()
  return (
    <div className="overflow-x-auto rounded-xl border bg-card max-md:hidden dark:border-transparent">
      <table className="w-full min-w-[46rem] border-collapse text-sm [&_th]:whitespace-nowrap">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2.5 pl-4 font-medium">
              Date
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Leader
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Lesson
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Kind
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Attendees
            </th>
            <th scope="col" className="w-10" aria-hidden="true" />
          </tr>
        </thead>
        {groups.map(([label, rows]) => (
          <tbody key={label}>
            <tr className="border-t bg-muted/30">
              <th
                colSpan={6}
                scope="colgroup"
                className="px-4 py-1.5 text-left text-xs font-medium text-muted-foreground"
              >
                {label} · {rows.length}
              </th>
            </tr>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() =>
                  void navigate({
                    to: '/reports/$reportId',
                    params: { reportId: r.id },
                  })
                }
                className="cursor-pointer border-t hover:bg-muted/40"
              >
                <td className="px-3 py-2.5 pl-4 whitespace-nowrap text-muted-foreground">
                  {dateTime(r.date)}
                </td>
                <td className="max-w-64 px-3 py-2.5">
                  <Link
                    to="/reports/$reportId"
                    params={{ reportId: r.id }}
                    className="block truncate font-medium"
                  >
                    {r.leaderName}
                    {r.assistantName ? (
                      <span className="font-normal text-muted-foreground">
                        {' '}
                        · with {r.assistantName}
                      </span>
                    ) : null}
                  </Link>
                </td>
                <td className="max-w-64 px-3 py-2.5">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">
                      {r.lessonTitle ?? 'No lesson'}
                    </span>
                    {r.customLesson !== undefined && r.lessonTitle && (
                      <LessonTag custom={r.customLesson} />
                    )}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <KindPill kind={r.type} />
                </td>
                <td className="numeric px-3 py-2.5 text-right">
                  {r.attendees}
                </td>
                <td className="pr-3">
                  <RowChevron />
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}
