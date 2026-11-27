import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { UsersRound } from 'lucide-react'
import { z } from 'zod'
import { Empty, Page } from '@/components/shell/page'
import { ListSearch } from '@/components/list-search'
import { AttendanceTabs } from '@/components/reports-tabs'
import { Pill } from '@/components/status-pill'
import { buttonVariants } from '@/components/ui/button'
import { Group, RowChevron } from '@/components/ui/list'
import { getGuests } from '@/server/attendance/attendance.functions'
import { shortDay } from '@/lib/dates'
import { plural } from '@/lib/labels'

export const Route = createFileRoute('/_app/attendance/guests')({
  validateSearch: z.object({ q: z.string().optional() }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => getGuests({ data: { q: deps.q } }),
  head: () => ({ meta: [{ title: 'Guests · GCC Admin' }] }),
  component: GuestsPage,
})

function GuestsPage() {
  const guests = Route.useLoaderData()
  const { q } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const followUp = guests.filter((g) => !g.discipleProfileId)
  const becameDisciples = guests.filter((g) => g.discipleProfileId)
  return (
    <Page
      title="Guests"
      description="Everyone who came to a service before becoming a disciple. Follow up, and make them disciples when they’re ready."
    >
      <AttendanceTabs on="guests" />
      <ListSearch
        value={q}
        placeholder="Search guests"
        onChange={(next) =>
          void navigate({ search: { q: next }, replace: true })
        }
      />
      {guests.length === 0 ? (
        <Empty
          icon={UsersRound}
          title={q ? 'No guest by that name.' : 'No guests yet.'}
        />
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="px-0.5 text-[13px] font-medium text-muted-foreground">
              To follow up · {followUp.length}
            </h2>
            <Group>
              {followUp.map((g) => (
                <div
                  key={g.id}
                  className="flex min-h-14 min-w-0 items-center gap-3 px-3.5 py-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">
                      {g.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {g.firstDate
                        ? `First came ${shortDay(g.firstDate)}`
                        : 'No visits'}
                      {' · '}
                      {plural(g.visits, 'visit')}
                      {g.invitedByName
                        ? ` · invited by ${g.invitedByName}`
                        : ''}
                      {g.contactNo ? ` · ${g.contactNo}` : ''}
                    </span>
                  </div>
                  <Link
                    to="/disciples/new"
                    search={{ fromGuest: g.id }}
                    className={buttonVariants({
                      variant: 'secondary',
                      size: 'lg',
                      className: 'shrink-0',
                    })}
                  >
                    Make disciple
                  </Link>
                </div>
              ))}
            </Group>
          </section>
          {becameDisciples.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="px-0.5 text-[13px] font-medium text-muted-foreground">
                Now disciples · {becameDisciples.length}
              </h2>
              <Group>
                {becameDisciples.map((g) => (
                  <Link
                    key={g.id}
                    to="/disciples/$discipleId"
                    params={{ discipleId: g.discipleProfileId! }}
                    className="flex min-h-13 min-w-0 items-center gap-3 px-3.5 py-2 hover:bg-muted/50"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {g.name}
                    </span>
                    <Pill tone="covered">Disciple</Pill>
                    <RowChevron />
                  </Link>
                ))}
              </Group>
            </section>
          )}
        </>
      )}
    </Page>
  )
}
