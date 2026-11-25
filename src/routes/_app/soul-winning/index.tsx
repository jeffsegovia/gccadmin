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
import { Group } from '@/components/ui/list'
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
import { MEMBER_TYPE, SOUL_WINNING_TYPE } from '@/lib/labels'
import { shortDate } from '@/lib/dates'
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
        <Segmented
          label="Show"
          className="w-full sm:w-64"
          value={view}
          onChange={(v) => set({ view: v === 'sessions' ? undefined : v })}
          options={[
            { value: 'sessions', label: 'Sessions' },
            { value: 'souls', label: 'New believers' },
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
        {view === 'sessions' && (
          <NativeSelect
            className="max-sm:min-w-0 max-sm:flex-1 max-sm:basis-[calc(50%-0.25rem)]"
            size="lg"
            value={search.type ?? ''}
            onChange={(e) =>
              set({
                type: (e.target.value || undefined) as typeof search.type,
              })
            }
            aria-label="Kind"
          >
            <NativeSelectOption value="">Both kinds</NativeSelectOption>
            <NativeSelectOption value="SOUL_WINNING">
              Soul winning
            </NativeSelectOption>
            <NativeSelectOption value="CONSOLIDATION">
              Consolidation
            </NativeSelectOption>
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
          <Group>
            {data.sessions.map((s) => (
              <div
                key={s.id}
                className="flex min-h-15 min-w-0 items-center gap-3 px-3.5 py-2"
              >
                <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground uppercase">
                  {shortDate(s.date)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">
                    {s.venue}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {s.type === 'SOUL_WINNING'
                      ? `${s.believers} won`
                      : `${s.believers} followed up`}
                    {s.lessonTitle ? ` · ${s.lessonTitle}` : ''}
                    {s.leaderName ? ` · ${s.leaderName}` : ''}
                  </span>
                </span>
                <Pill tone={s.type === 'SOUL_WINNING' ? 'covered' : 'men'}>
                  {SOUL_WINNING_TYPE[s.type]}
                </Pill>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Track the believers at ${s.venue}`}
                  title="Track their lessons"
                  onClick={() =>
                    set({ view: 'souls', session: s.id, q: undefined })
                  }
                >
                  <ListChecks aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete session"
                  onClick={() => setRemoving(s.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
          </Group>
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
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th
                        scope="col"
                        className="min-w-48 px-3 py-2.5 font-medium"
                      >
                        New believer
                      </th>
                      <th
                        scope="col"
                        className="min-w-36 px-3 py-2.5 font-medium"
                      >
                        Handled by
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
                        className="px-3 py-2.5 text-right font-medium"
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
                          <td className="px-3 py-2 text-[13px]">
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
                          <td className="numeric px-3 py-2 text-right">
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
                  setRemoving(null)
                  await router.invalidate()
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
