import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { Plus, Sprout, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Empty, Page } from '@/components/shell/page'
import { ReportsTabs } from '@/components/reports-tabs'
import { ListSearch } from '@/components/list-search'
import { GenderBar, Pill } from '@/components/status-pill'
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
import { RANGE_LABEL, REPORT_RANGES } from '@/lib/cell-reports/schema'
import type { ReportRange } from '@/lib/cell-reports/schema'
import { listSoulWinningSchema } from '@/lib/soul-winning/schema'
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
  const view = search.view ?? 'sessions'
  const range: ReportRange = search.range ?? 'this_month'
  const set = (next: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })

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
      <div className="grid grid-cols-3 border bg-card [&>*+*]:border-l">
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
          {data.souls.length === 0 ? (
            <Empty
              icon={Sprout}
              title={
                search.q ? 'Nobody by that name.' : 'No new believers yet.'
              }
            />
          ) : (
            <Group>
              {data.souls.map((b) => (
                <div
                  key={b.id}
                  className="flex min-h-14 min-w-0 items-center gap-3 px-3.5 py-2"
                >
                  <GenderBar gender={b.gender} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">
                      {b.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {MEMBER_TYPE[b.memberType]} · won {shortDate(b.createdAt)}{' '}
                      · {b.sessions} {b.sessions === 1 ? 'session' : 'sessions'}
                      {b.handledByName
                        ? ` · ${b.handledByName}`
                        : b.leaderName
                          ? ` · ${b.leaderName}`
                          : ''}
                    </span>
                  </span>
                  {b.discipleProfileId ? (
                    <Link
                      to="/disciples/$discipleId"
                      params={{ discipleId: b.discipleProfileId }}
                    >
                      <Pill tone="covered">Disciple</Pill>
                    </Link>
                  ) : (
                    <Link
                      to="/disciples/new"
                      search={{ fromBeliever: b.id }}
                      className="shrink-0 text-[13px] font-medium text-primary"
                    >
                      Make disciple
                    </Link>
                  )}
                </div>
              ))}
            </Group>
          )}
        </>
      )}
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
