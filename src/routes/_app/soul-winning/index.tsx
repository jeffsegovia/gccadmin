import { useCallback, useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { Check, ListChecks, Plus, Sprout, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Empty, Page } from '@/components/shell/page'
import { ReportsTabs } from '@/components/reports-tabs'
import { ListSearch } from '@/components/list-search'
import { Pill } from '@/components/status-pill'
import { buttonVariants, Button } from '@/components/ui/button'
import { Group, RowChevron } from '@/components/ui/list'
import { Segmented } from '@/components/ui/segmented'
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
        <>
          <Link
            to="/soul-winning/new"
            search={{ type: 'CONSOLIDATION' }}
            className={buttonVariants({
              variant: 'secondary',
              size: 'lg',
              className: 'max-md:hidden',
            })}
          >
            Consolidation
          </Link>
          <Link
            to="/soul-winning/new"
            className={buttonVariants({
              size: 'lg',
              className: 'max-md:hidden',
            })}
          >
            <Plus aria-hidden="true" /> New session
          </Link>
        </>
      }
    >
      <ReportsTabs on="soul" />
      <div className="grid grid-cols-3 border bg-card [&>*+*]:border-l rounded-xl overflow-hidden">
        {[
          ['SW sessions', data.stats.sw, ''],
          ['Consolidation', data.stats.conso, ''],
          ['New souls', data.stats.souls, 'text-covered'],
        ].map(([label, value, tone]) => (
          <div
            key={label as string}
            className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5 md:px-4"
          >
            <span className="truncate text-xs text-muted-foreground">
              {label}
            </span>
            <span
              className={`numeric text-xl font-semibold md:text-2xl ${tone}`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {/* v2's three pages, as tabs. */}
        <Segmented
          label="Show"
          className="w-full lg:w-[28rem]"
          value={tab}
          onChange={(v) =>
            set(
              v === 'souls'
                ? { view: 'souls', type: undefined }
                : {
                    view: undefined,
                    session: undefined,
                    type: v === 'CONSOLIDATION' ? 'CONSOLIDATION' : undefined,
                  },
            )
          }
          options={[
            { value: 'SOUL_WINNING', label: 'Soul Winning' },
            { value: 'CONSOLIDATION', label: 'Consolidation' },
            { value: 'souls', label: 'New Believers' },
          ]}
        />
        {view === 'sessions' && (
          <NativeSelect
            className="max-sm:min-w-0 max-sm:flex-1 max-sm:basis-[calc(50%-0.25rem)]"
            size="lg"
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
        {data.everyone && data.leaders.length > 0 && (
          <NativeSelect
            className="max-sm:min-w-0 max-sm:flex-1 max-sm:basis-[calc(50%-0.25rem)]"
            size="lg"
            value={search.leader ?? ''}
            onChange={(e) =>
              set({ leader: e.target.value || undefined, wonBy: undefined })
            }
            aria-label="Network leader"
          >
            <NativeSelectOption value="">Every leader</NativeSelectOption>
            {data.leaders.map((l) => (
              <NativeSelectOption key={l.id} value={l.id}>
                {l.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
        {view === 'souls' && (
          <>
            {data.winners.length > 0 && (
              <NativeSelect
                className="max-sm:min-w-0 max-sm:flex-1 max-sm:basis-[calc(50%-0.25rem)]"
                size="lg"
                value={search.wonBy ?? ''}
                onChange={(e) => set({ wonBy: e.target.value || undefined })}
                aria-label="Won by"
              >
                <NativeSelectOption value="">Won by anyone</NativeSelectOption>
                {data.winners.map((w) => (
                  <NativeSelectOption key={w.id} value={w.id}>
                    {w.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
            <NativeSelect
              className="max-sm:min-w-0 max-sm:flex-1 max-sm:basis-[calc(50%-0.25rem)]"
              size="lg"
              value={search.memberType?.[0] ?? ''}
              onChange={(e) =>
                set({
                  memberType: e.target.value
                    ? [e.target.value as keyof typeof MEMBER_TYPE]
                    : undefined,
                })
              }
              aria-label="Member Type"
            >
              <NativeSelectOption value="">
                Every member type
              </NativeSelectOption>
              {(
                Object.keys(MEMBER_TYPE) as Array<keyof typeof MEMBER_TYPE>
              ).map((k) => (
                <NativeSelectOption key={k} value={k}>
                  {MEMBER_TYPE[k]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Segmented
              label="Lessons"
              className="w-full sm:w-80"
              value={search.lessons ?? 'all'}
              onChange={(v) => set({ lessons: v === 'all' ? undefined : v })}
              options={[
                { value: 'all', label: 'All lessons' },
                { value: 'soul-winning', label: 'Soul winning' },
                { value: 'consolidation', label: 'Consolidation' },
              ]}
            />
          </>
        )}
        {data.everyone && data.myId && (
          <Segmented
            label="Whose"
            className="w-48"
            value={search.mine ? 'mine' : 'all'}
            onChange={(v) => set({ mine: v === 'mine' ? true : undefined })}
            options={[
              { value: 'all', label: 'Everyone' },
              { value: 'mine', label: 'Mine' },
            ]}
          />
        )}
      </div>

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
              <table className="w-full min-w-[52rem] border-collapse text-sm">
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
                    <th scope="col" className="w-10" />
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
                      <td className="pr-3">
                        <RowChevron />
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
          <ListSearch
            value={search.q}
            placeholder="Search new believers"
            onChange={(q) => set({ q })}
          />
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
                <table className="w-full min-w-max border-collapse text-sm">
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
                          className="w-24 max-w-28 px-2 py-2.5 text-center text-[11px] leading-tight font-medium"
                        >
                          <span className="line-clamp-2">{l.title}</span>
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
              i < taken ? 'flex-1 bg-covered' : 'flex-1 bg-foreground/12'
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
