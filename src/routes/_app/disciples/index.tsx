import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowDown,
  ChevronRight,
  Download,
  Ellipsis,
  Link2,
  PhoneCall,
  Plus,
  Upload,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { Empty, Page } from '@/components/shell/page'
import { ListSearch } from '@/components/list-search'
import {
  CellStatusPill,
  ChurchStatusPill,
  ProcessLevelPill,
} from '@/components/status-pill'
import {
  FiltersDialog,
  countFilters,
} from '@/components/disciples/filters-dialog'
import { ImportDialog } from '@/components/disciples/import-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Group } from '@/components/ui/list'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { listDisciplesSchema } from '@/lib/disciples/schema'
import { writeDisciplesFile } from '@/lib/disciples/spreadsheet'
import {
  CELL_STATUS,
  CHURCH_STATUS,
  MEMBER_TYPE,
  PROCESS_LEVEL,
} from '@/lib/labels'
import { FilterBar } from '@/components/filter-bar'
import type { ActiveFilter } from '@/components/filter-bar'
import { UnderlineTabs } from '@/components/ui/underline-tabs'
import { manilaDay, shortDate } from '@/lib/dates'
import { Pager } from '@/components/pager'
import { messageOf } from '@/lib/errors'
import {
  exportDisciples,
  getDisciplesPage,
} from '@/server/disciples/disciples.functions'
import type { DiscipleRow } from '@/server/disciples/disciples.queries'

export const Route = createFileRoute('/_app/disciples/')({
  validateSearch: listDisciplesSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getDisciplesPage({ data: deps }),
  head: () => ({ meta: [{ title: 'Disciples · GCC Admin' }] }),
  component: DisciplesPage,
})

function portalText(d: DiscipleRow) {
  if (d.isPrimary) return { text: 'Signs in', tone: 'text-muted-foreground' }
  if (d.portalEnabled === null)
    return { text: 'Not made', tone: 'text-muted-foreground' }
  if (!d.portalEnabled)
    return { text: 'Turned off', tone: 'text-muted-foreground' }
  return { text: d.portalOpenedAt ? 'On · opened' : 'On', tone: 'text-covered' }
}

function sub(d: DiscipleRow) {
  return [MEMBER_TYPE[d.memberType], d.handledByName ?? d.leaderName]
    .filter(Boolean)
    .join(' · ')
}

function lastSeen(d: DiscipleRow) {
  return d.lastSunday
    ? `Last Sunday: ${shortDate(d.lastSunday)}`
    : 'Not at a Sunday yet'
}

function Role({ d }: { d: DiscipleRow }) {
  if (d.isPrimary)
    return <span className="text-xs text-primary">Primary leader</span>
  if (d.isMyPrimary)
    return <span className="text-xs text-primary">Assistant leader</span>
  return null
}

function DisciplesPage() {
  const data = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [filtering, setFiltering] = useState(false)
  const [importing, setImporting] = useState(false)
  const setSearch = (next: Partial<typeof search>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...next, page: undefined }),
      replace: true,
    })
  const filters = countFilters(search)
  const nameIn = (
    list: ReadonlyArray<{ id: string; name: string }>,
    id: string,
  ) => list.find((p) => p.id === id)?.name ?? 'Someone'
  // Each filter that's on, as a chip that removes it.
  const multi = <TKey extends string>(
    key: 'memberType' | 'churchStatus' | 'cellStatus' | 'processLevel',
    values: ReadonlyArray<TKey> | undefined,
    words: Record<TKey, string>,
  ): Array<ActiveFilter> =>
    (values ?? []).map((v) => ({
      key: `${key}-${v}`,
      label: words[v],
      clear: () => {
        const rest = (values ?? []).filter((x) => x !== v)
        setSearch({ [key]: rest.length ? rest : undefined })
      },
    }))
  const activeFilters: Array<ActiveFilter> = [
    ...(search.status && search.status !== 'active'
      ? [
          {
            key: 'status',
            label: search.status === 'inactive' ? 'Inactive' : 'Assistants',
            clear: () => setSearch({ status: undefined }),
          },
        ]
      : []),
    ...(search.away
      ? [
          {
            key: 'away',
            label: 'Missed the last 4 Sundays',
            clear: () => setSearch({ away: undefined, sort: undefined }),
          },
        ]
      : []),
    ...(search.leader
      ? [
          {
            key: 'leader',
            label: `Network: ${nameIn(data.leaders, search.leader)}`,
            clear: () => setSearch({ leader: undefined }),
          },
        ]
      : []),
    ...(search.handledBy
      ? [
          {
            key: 'handledBy',
            label: `Handled by ${nameIn(data.handlers, search.handledBy)}`,
            clear: () => setSearch({ handledBy: undefined }),
          },
        ]
      : []),
    ...multi('memberType', search.memberType, MEMBER_TYPE),
    ...multi('churchStatus', search.churchStatus, CHURCH_STATUS),
    ...multi('cellStatus', search.cellStatus, CELL_STATUS),
    ...multi('processLevel', search.processLevel, PROCESS_LEVEL),
  ]

  async function exportAll() {
    try {
      const rows = await exportDisciples({
        data: { ...search, page: undefined },
      })
      writeDisciplesFile(rows, `gcc-disciples-${manilaDay()}.xlsx`)
    } catch (error) {
      toast.error(messageOf(error))
    }
  }

  return (
    <Page
      wide
      title="Disciples"
      description={`${data.total.toLocaleString('en-US')} ${search.status === 'inactive' ? 'inactive' : 'active'}${data.everyone && data.scope === 'mine' ? ' in your network' : ''}`}
      action={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="secondary"
                  size="lg"
                  aria-label="Import or export"
                >
                  <Ellipsis aria-hidden="true" />
                  <span className="max-md:hidden">Import / export</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => void exportAll()}>
                <Download /> Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImporting(true)}>
                <Upload /> Import from Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            to="/disciples/new"
            className={buttonVariants({
              size: 'lg',
              className: 'max-md:hidden',
            })}
          >
            <Plus aria-hidden="true" /> Add disciple
          </Link>
        </>
      }
    >
      {data.everyone && data.myId && (
        <UnderlineTabs
          label="Whose"
          value={data.scope}
          onChange={(scope) => setSearch({ scope })}
          options={[
            { value: 'mine', label: 'Mine' },
            { value: 'all', label: 'Everyone' },
          ]}
        />
      )}
      <FilterBar
        active={activeFilters}
        onOpen={() => setFiltering(true)}
        onClearAll={() =>
          setSearch({
            status: undefined,
            leader: undefined,
            handledBy: undefined,
            away: undefined,
            memberType: undefined,
            churchStatus: undefined,
            cellStatus: undefined,
            processLevel: undefined,
          })
        }
      >
        <ListSearch
          value={search.q}
          placeholder="Search disciples"
          onChange={(q) => setSearch({ q })}
        />
      </FilterBar>

      <div className="-mt-2 flex">
        <button
          type="button"
          aria-pressed={!!search.away}
          onClick={() =>
            setSearch(
              search.away
                ? { away: undefined, sort: undefined }
                : { away: true, sort: 'lastSeen' },
            )
          }
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
            search.away
              ? 'border-primary bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <PhoneCall aria-hidden="true" className="size-3.5" />
          Missed the last 4 Sundays
        </button>
      </div>

      {data.rows.length === 0 ? (
        <Empty
          icon={Users}
          title={
            search.q || filters ? 'No disciples match.' : 'No disciples yet.'
          }
        >
          {search.q || filters ? (
            <Button
              variant="secondary"
              onClick={() =>
                setSearch({
                  q: undefined,
                  status: undefined,
                  leader: undefined,
                  handledBy: undefined,
                  away: undefined,
                  memberType: undefined,
                  churchStatus: undefined,
                  cellStatus: undefined,
                  processLevel: undefined,
                })
              }
            >
              Clear search and filters
            </Button>
          ) : (
            <Link to="/disciples/new" className={buttonVariants()}>
              <Plus aria-hidden="true" /> Add disciple
            </Link>
          )}
        </Empty>
      ) : (
        <>
          {/* Phones: rows. */}
          <Group className="md:hidden">
            {data.rows.map((d) => (
              <Link
                key={d.id}
                to="/disciples/$discipleId"
                params={{ discipleId: d.id }}
                className="flex min-h-15 min-w-0 items-center gap-3 px-3.5 py-2"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">
                    {d.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {sub(d)}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    <ChurchStatusPill status={d.churchStatus} named />
                    <CellStatusPill status={d.cellStatus} named />
                  </span>
                  <span className="mt-1 truncate text-xs text-muted-foreground">
                    {lastSeen(d)}
                  </span>
                  <Role d={d} />
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </Link>
            ))}
          </Group>
          {/* Wide screens: a table that scrolls inside its box. */}
          <div className="overflow-x-auto border bg-card max-md:hidden rounded-xl">
            <table className="w-full min-w-[56rem] border-collapse text-sm [&_th]:whitespace-nowrap">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  {(
                    [
                      ['Name', 'name'],
                      ['Leader'],
                      ['Process Level', 'process'],
                      ['Church Status'],
                      ['Cell Status'],
                      ['Last Sunday', 'lastSeen'],
                      ['Portal'],
                    ] as const
                  ).map(([h, sortKey]) => (
                    <th
                      key={h}
                      scope="col"
                      aria-sort={
                        sortKey && (search.sort ?? 'name') === sortKey
                          ? 'ascending'
                          : undefined
                      }
                      className="px-3 py-2.5 font-medium first:pl-4"
                    >
                      {sortKey ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSearch({
                              sort: sortKey === 'name' ? undefined : sortKey,
                            })
                          }
                          className={cn(
                            'inline-flex items-center gap-1 hover:text-foreground',
                            (search.sort ?? 'name') === sortKey &&
                              'text-foreground',
                          )}
                        >
                          {h}
                          {(search.sort ?? 'name') === sortKey && (
                            <ArrowDown aria-hidden="true" className="size-3" />
                          )}
                        </button>
                      ) : (
                        h
                      )}
                    </th>
                  ))}
                  <th scope="col" className="w-8" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((d) => {
                  const portal = portalText(d)
                  return (
                    <tr
                      key={d.id}
                      onClick={() =>
                        void navigate({
                          to: '/disciples/$discipleId',
                          params: { discipleId: d.id },
                        })
                      }
                      className="cursor-pointer border-t hover:bg-muted/40"
                    >
                      <td className="max-w-64 py-2 pr-3 pl-4">
                        <Link
                          to="/disciples/$discipleId"
                          params={{ discipleId: d.id }}
                          className="flex min-w-0 items-center gap-2.5"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">
                              {d.name}
                            </span>
                            <span className="flex gap-1.5">
                              <Role d={d} />
                              <span className="text-xs text-muted-foreground">
                                {MEMBER_TYPE[d.memberType]}
                              </span>
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-48 truncate px-3 py-2 text-foreground/85">
                        {d.handledByName ?? d.leaderName ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <ProcessLevelPill level={d.processLevel} />
                      </td>
                      <td className="px-3 py-2">
                        <ChurchStatusPill status={d.churchStatus} />
                      </td>
                      <td className="px-3 py-2">
                        <CellStatusPill status={d.cellStatus} />
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
                        {d.lastSunday ? shortDate(d.lastSunday) : '—'}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 text-xs whitespace-nowrap',
                          portal.tone,
                        )}
                      >
                        {portal.text === 'On · opened' ? (
                          <span className="inline-flex items-center gap-1">
                            <Link2 aria-hidden="true" className="size-3.5" /> On
                          </span>
                        ) : (
                          portal.text
                        )}
                      </td>
                      <td className="w-8 pr-3">
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 text-muted-foreground"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pager page={data.page} total={data.total} pageSize={data.pageSize} />
        </>
      )}
      <FiltersDialog
        open={filtering}
        onOpenChange={setFiltering}
        value={search}
        leaders={data.leaders}
        handlers={data.handlers}
        onApply={(f) => setSearch({ ...f })}
      />
      <ImportDialog
        open={importing}
        onOpenChange={setImporting}
        leaders={viewer.isAdmin ? data.leaders : []}
      />
    </Page>
  )
}
