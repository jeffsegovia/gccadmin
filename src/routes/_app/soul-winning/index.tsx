import { useCallback, useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  Check,
  HeartHandshake,
  ListChecks,
  Plus,
  Sprout,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from 'cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Empty, Page } from '@/components/shell/page'
import { ReportsTabs } from '@/components/reports-tabs'
import { ListSearch } from '@/components/list-search'
import { Pill } from '@/components/status-pill'
import { buttonVariants, Button } from '@/components/ui/button'
import { Group, RowChevron } from '@/components/ui/list'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { BelieverSheet } from '@/components/soul-winning/believer-sheet'
import { SoulWinningFiltersDialog } from '@/components/soul-winning/filters-dialog'
import { FilterBar } from '@/components/filter-bar'
import type { ActiveFilter } from '@/components/filter-bar'
import { RANGE_LABEL, REPORT_RANGES } from '@/lib/cell-reports/schema'
import type { ReportRange } from '@/lib/cell-reports/schema'
import { SOUL_PAGE, listSoulWinningSchema } from '@/lib/soul-winning/schema'
import { Pager } from '@/components/pager'
import { MEMBER_TYPE } from '@/lib/labels'
import { dateTime, shortDate } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import {
  deleteSoulWinning,
  getSoulWinningPage,
} from '@/server/soul-winning/soul-winning.functions'

export const Route = createFileRoute('/_app/soul-winning/')({
  validateSearch: listSoulWinningSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getSoulWinningPage({ data: deps }),
  head: () => ({ meta: [{ title: 'Soul winning · GCC Admin' }] }),
  component: SoulWinningPage,
})

function SoulWinningPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const [removing, setRemoving] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const close = useCallback(() => setOpen(null), [])
  const view = search.view ?? 'sessions'
  const tab =
    view === 'souls'
      ? 'souls'
      : search.type === 'CONSOLIDATION'
        ? 'CONSOLIDATION'
        : 'SOUL_WINNING'
  const conso = tab === 'CONSOLIDATION'
  const [filtering, setFiltering] = useState(false)
  const nameOf = (
    list: ReadonlyArray<{ id: string; name: string }>,
    id?: string,
  ) => list.find((p) => p.id === id)?.name ?? 'Someone'
  // Each filter that's on, as a chip that removes it.
  const active: Array<ActiveFilter> = [
    ...(search.mine
      ? [{ key: 'mine', label: 'Mine', clear: () => set({ mine: undefined }) }]
      : []),
    ...(search.leader
      ? [
          {
            key: 'leader',
            label: `Network: ${nameOf(data.leaders, search.leader)}`,
            clear: () => set({ leader: undefined }),
          },
        ]
      : []),
    ...(view === 'souls' && search.wonBy
      ? [
          {
            key: 'wonBy',
            label: `Won by ${nameOf(data.winners, search.wonBy)}`,
            clear: () => set({ wonBy: undefined }),
          },
        ]
      : []),
    ...(view === 'souls'
      ? (search.memberType ?? []).map((t) => ({
          key: `type-${t}`,
          label: MEMBER_TYPE[t],
          clear: () =>
            set({
              memberType:
                (search.memberType ?? []).filter((x) => x !== t).length > 0
                  ? (search.memberType ?? []).filter((x) => x !== t)
                  : undefined,
            }),
        }))
      : []),
    ...(view === 'souls' && search.lessons
      ? [
          {
            key: 'lessons',
            label:
              search.lessons === 'soul-winning'
                ? 'Soul Winning lessons'
                : 'Consolidation lessons',
            clear: () => set({ lessons: undefined }),
          },
        ]
      : []),
  ]
  const track = (id: string) =>
    set({ view: 'souls', type: undefined, session: id, q: undefined })
  const range: ReportRange = search.range ?? 'this_month'
  // Any change of filter starts again at the first page.
  const set = (next: Partial<typeof search>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...next, page: undefined }),
      replace: true,
    })

  return (
    <Page
      wide
      title="Soul winning"
      description={`${RANGE_LABEL[range]}${search.mine || !data.everyone ? ' · your network' : ''}`}
      action={
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="lg">
                <Plus aria-hidden="true" /> New
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem render={<Link to="/soul-winning/new" />}>
              <Sprout /> Soul winning session
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <Link
                  to="/soul-winning/new"
                  search={{ type: 'CONSOLIDATION' }}
                />
              }
            >
              <HeartHandshake /> Consolidation session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <ReportsTabs on="soul" />
      {/* The three figures are the three pages (v2's): tap one to see it. */}
      <div
        role="tablist"
        aria-label="Show"
        className="grid grid-cols-3 overflow-hidden rounded-xl border bg-card [&>*+*]:border-l"
      >
        {(
          [
            ['SOUL_WINNING', 'Soul winning', data.stats.sw, ''],
            ['CONSOLIDATION', 'Consolidation', data.stats.conso, ''],
            ['souls', 'New believers', data.stats.souls, 'text-covered'],
          ] as const
        ).map(([value, label, n, tone]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() =>
              set(
                value === 'souls'
                  ? { view: 'souls', type: undefined }
                  : {
                      view: undefined,
                      session: undefined,
                      type: value === 'CONSOLIDATION' ? value : undefined,
                    },
              )
            }
            className={cn(
              'flex min-h-16 min-w-0 flex-col gap-0.5 border-b-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 md:px-4',
              tab === value
                ? 'border-primary bg-muted/60'
                : 'border-transparent',
            )}
          >
            <span className="truncate text-xs text-muted-foreground">
              {label}
            </span>
            <span
              className={cn('numeric text-xl font-semibold md:text-2xl', tone)}
            >
              {n}
            </span>
          </button>
        ))}
      </div>
      <FilterBar
        active={active}
        onOpen={() => setFiltering(true)}
        onClearAll={() =>
          set({
            mine: undefined,
            leader: undefined,
            wonBy: undefined,
            memberType: undefined,
            lessons: undefined,
          })
        }
      >
        {view === 'souls' ? (
          <ListSearch
            value={search.q}
            placeholder="Search new believers"
            onChange={(q) => set({ q })}
          />
        ) : (
          <NativeSelect
            size="lg"
            className="w-full sm:w-56"
            value={range}
            onChange={(e) => set({ range: e.target.value as ReportRange })}
            aria-label="When"
          >
            {REPORT_RANGES.map((r) => (
              <NativeSelectOption key={r} value={r}>
                {RANGE_LABEL[r]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </FilterBar>
      <SoulWinningFiltersDialog
        open={filtering}
        onOpenChange={setFiltering}
        value={{
          mine: search.mine,
          leader: search.leader,
          wonBy: search.wonBy,
          memberType: search.memberType,
          lessons: search.lessons,
        }}
        onApply={(f) =>
          set({
            mine: f.mine,
            leader: f.leader,
            wonBy: f.wonBy,
            memberType: f.memberType,
            lessons: f.lessons,
          })
        }
        believers={view === 'souls'}
        canChooseWhose={data.everyone && !!data.myId}
        leaders={data.everyone ? data.leaders : []}
        winners={data.winners}
      />

      {view === 'sessions' ? (
        data.sessions.length === 0 ? (
          <Empty icon={Sprout} title="No sessions in this range.">
            <Link to="/soul-winning/new" className={buttonVariants()}>
              <Plus aria-hidden="true" /> New session
            </Link>
          </Empty>
        ) : (
          <>
            {/* Phones: who won them, where and when, and how many. */}
            <Group className="md:hidden">
              {data.sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => track(s.id)}
                  className="flex min-h-15 w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left hover:bg-muted/50"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-medium">
                      {s.assistantName ?? s.leaderName ?? '—'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {s.venue.split(',')[0]} · {shortDate(s.date)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-medium text-covered">
                    {s.believers} {conso ? 'consolidated' : 'won'}
                  </span>
                  <RowChevron />
                </button>
              ))}
            </Group>
            {/* Wide screens: v2's table. */}
            <div className="overflow-x-auto rounded-xl border bg-card max-md:hidden dark:border-transparent">
              <table className="w-full min-w-[52rem] border-collapse text-sm [&_th]:whitespace-nowrap">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th
                      scope="col"
                      className="w-10 px-3 py-2.5 text-center font-medium"
                    >
                      #
                    </th>
                    {data.everyone && (
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Network Leader
                      </th>
                    )}
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      {conso ? 'Consolidated By' : 'Won By'}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Lesson
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Date & Venue
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 font-medium whitespace-nowrap"
                    >
                      {conso ? '# Consolidated' : '# Won Souls'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((s, i) => (
                    <tr
                      key={s.id}
                      onClick={() => track(s.id)}
                      className="cursor-pointer border-t hover:bg-muted/40"
                    >
                      <td className="px-3 py-2.5 text-center text-muted-foreground">
                        {(data.page - 1) * SOUL_PAGE + i + 1}
                      </td>
                      {data.everyone && (
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {s.leaderName ?? '—'}
                        </td>
                      )}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="flex flex-col">
                          <span>{s.assistantName ?? s.leaderName ?? '—'}</span>
                          <span className="text-xs text-muted-foreground">
                            {s.assistantName
                              ? 'Assistant Leader'
                              : 'Primary Leader'}
                          </span>
                        </span>
                      </td>
                      <td className="max-w-64 px-3 py-2.5">
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">
                            {s.lessonTitle ?? '—'}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {s.seriesTitle ?? ''}
                          </span>
                        </span>
                      </td>
                      <td className="max-w-64 px-3 py-2.5">
                        <span className="flex min-w-0 flex-col">
                          <span className="whitespace-nowrap">
                            {dateTime(s.date)}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {s.venue}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Pill tone="covered">
                          {s.believers} {conso ? 'consolidated' : 'won'}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : (
        <>
          {search.session && (
            <div className="flex min-w-0 items-center gap-2 border bg-card px-3 py-2 text-sm rounded-xl">
              <ListChecks
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="min-w-0 flex-1 truncate">
                At {data.sessionName ?? 'one session'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setRemoving(search.session ?? null)}
              >
                <Trash2 aria-hidden="true" /> Delete session
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Show every believer"
                onClick={() => set({ session: undefined })}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          )}
          {data.souls.length === 0 ? (
            <Empty
              icon={Sprout}
              title={
                search.q ? 'Nobody by that name.' : 'No new believers yet.'
              }
            />
          ) : (
            <>
              {/* Phones: a row each with a bar of lessons taken. */}
              <Group className="lg:hidden">
                {data.souls.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setOpen(b.id)}
                    className="flex min-h-15 w-full min-w-0 items-center gap-3 px-3.5 py-2 text-left hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate text-[15px] font-medium">
                        {b.name}
                      </span>
                      <LessonBar
                        total={data.lessons.length}
                        taken={b.taken.length}
                      />
                      <span className="truncate text-xs text-muted-foreground">
                        {MEMBER_TYPE[b.memberType]}
                        {b.handledByName
                          ? ` · ${b.handledByName}`
                          : b.leaderName
                            ? ` · ${b.leaderName}`
                            : ''}
                      </span>
                    </span>
                    {b.discipleProfileId ? (
                      <Pill tone="covered">Disciple</Pill>
                    ) : (
                      b.complete && <Pill tone="covered">Ready</Pill>
                    )}
                  </button>
                ))}
              </Group>
              {/* Wide screens: v2's table, a column per lesson. */}
              <div className="overflow-x-auto border bg-card max-lg:hidden dark:border-transparent rounded-xl">
                {/* Wider than the box when there are many lessons: it
                    scrolls sideways instead of squeezing the columns. */}
                <table className="w-full min-w-max border-collapse text-sm [&_th]:whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th
                        scope="col"
                        className="min-w-48 px-3 py-2.5 font-medium whitespace-nowrap"
                      >
                        New believer
                      </th>
                      <th
                        scope="col"
                        className="min-w-36 px-3 py-2.5 font-medium whitespace-nowrap"
                      >
                        Handled By
                      </th>
                      {data.lessons.map((l) => (
                        <th
                          key={l.id}
                          scope="col"
                          title={`${l.seriesTitle}: ${l.title}`}
                          className="w-28 max-w-28 px-2 py-2.5 text-center text-xs font-medium"
                        >
                          <span className="block truncate">{l.title}</span>
                        </th>
                      ))}
                      <th
                        scope="col"
                        className="w-16 px-3 py-2.5 text-right font-medium whitespace-nowrap"
                      >
                        Taken
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.souls.map((b) => {
                      const has = new Set(b.taken)
                      return (
                        <tr
                          key={b.id}
                          onClick={() => setOpen(b.id)}
                          className="cursor-pointer border-t hover:bg-muted/50"
                        >
                          <th
                            scope="row"
                            className="px-3 py-2 text-left font-normal"
                          >
                            <button
                              type="button"
                              className="flex min-w-0 flex-col text-left"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpen(b.id)
                              }}
                            >
                              <span className="font-medium">{b.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {MEMBER_TYPE[b.memberType]}
                                {b.discipleProfileId ? ' · Disciple' : ''}
                              </span>
                            </button>
                          </th>
                          <td className="px-3 py-2 text-[13px] whitespace-nowrap">
                            {b.handledByName ?? b.leaderName ?? '—'}
                          </td>
                          {data.lessons.map((l) => (
                            <td key={l.id} className="px-2 py-2 text-center">
                              {has.has(l.id) ? (
                                <span className="text-covered" title="Taken">
                                  <Check
                                    aria-label="Taken"
                                    className="mx-auto size-4"
                                    strokeWidth={3}
                                  />
                                </span>
                              ) : (
                                <span
                                  aria-label="Not taken"
                                  className="text-muted-foreground/50"
                                >
                                  ·
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="numeric px-3 py-2 text-right whitespace-nowrap">
                            {b.taken.length}/{data.lessons.length}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
      {(view === 'souls' ? data.souls.length : data.sessions.length) > 0 && (
        <Pager page={data.page} total={data.total} pageSize={SOUL_PAGE} />
      )}
      <BelieverSheet id={open} onClose={close} />
      <AlertDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              Believers won at it who have no other session are removed too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteSoulWinning({ data: { id: removing! } })
                  toast.success('Session deleted')
                  // Deleted from its own tracking view: back to the list.
                  if (search.session === removing)
                    set({ view: undefined, session: undefined })
                  else await router.invalidate()
                  setRemoving(null)
                } catch (error) {
                  toast.error(messageOf(error))
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

function LessonBar({ total, taken }: { total: number; taken: number }) {
  if (total === 0) return null
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="flex h-1.5 max-w-40 min-w-0 flex-1 gap-px"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={
              i < taken
                ? 'flex-1 rounded-full bg-covered'
                : 'flex-1 rounded-full bg-foreground/12'
            }
          />
        ))}
      </span>
      <span className="numeric shrink-0 text-xs text-muted-foreground">
        {taken} of {total} lessons
      </span>
    </span>
  )
}
