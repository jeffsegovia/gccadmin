import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  Link2,
  ListFilter,
  Plus,
  Upload,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from 'cn'
import { Empty, Page } from '@/components/shell/page'
import { ListSearch } from '@/components/list-search'
import { ChurchStatusPill, PersonAvatar, Pill } from '@/components/status-pill'
import {
  FiltersDialog,
  countFilters,
} from '@/components/disciples/filters-dialog'
import { ImportDialog } from '@/components/disciples/import-dialog'
import { Segmented } from '@/components/ui/segmented'
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
import { CELL_STATUS, MEMBER_TYPE, PROCESS_LEVEL } from '@/lib/labels'
import { manilaDay } from '@/lib/dates'
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
  return [
    MEMBER_TYPE[d.memberType],
    PROCESS_LEVEL[d.processLevel],
    d.handledByName ?? d.leaderName,
  ]
    .filter(Boolean)
    .join(' · ')
}

function Role({ d }: { d: DiscipleRow }) {
  if (d.isPrimary)
    return <span className="text-[11px] text-primary">Primary leader</span>
  if (d.isMyPrimary)
    return <span className="text-[11px] text-primary">Assistant leader</span>
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
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const from = data.total ? (data.page - 1) * data.pageSize + 1 : 0
  const to = Math.min(data.total, data.page * data.pageSize)

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
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
        {data.everyone && data.myId && (
          <Segmented
            label="Whose"
            className="md:w-64"
            value={data.scope}
            onChange={(scope) => setSearch({ scope })}
            options={[
              { value: 'mine', label: 'Mine' },
              { value: 'all', label: 'Everyone' },
            ]}
          />
        )}
        <div className="flex min-w-0 flex-1 gap-2">
          <ListSearch
            value={search.q}
            placeholder="Search disciples"
            onChange={(q) => setSearch({ q })}
          />
          <Button
            variant={filters ? 'outline' : 'secondary'}
            size="lg"
            className={cn(
              'h-11 shrink-0 md:h-10',
              filters && 'border-primary/50 text-primary',
            )}
            onClick={() => setFiltering(true)}
          >
            <ListFilter aria-hidden="true" /> Filters
            {filters ? ` · ${filters}` : ''}
          </Button>
        </div>
      </div>

      {data.rows.length === 0 ? (
        <Empty
          icon={Users}
          title={
            search.q || filters ? 'No disciples match.' : 'No disciples yet.'
          }
        >
          <Link to="/disciples/new" className={buttonVariants()}>
            <Plus aria-hidden="true" /> Add disciple
          </Link>
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
                <PersonAvatar name={d.name} gender={d.gender} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium">
                    {d.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {sub(d)}
                  </span>
                  <Role d={d} />
                </span>
                <ChurchStatusPill status={d.churchStatus} />
              </Link>
            ))}
          </Group>
          {/* Wide screens: a table that scrolls inside its box. */}
          <div className="overflow-x-auto border bg-card max-md:hidden">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  {[
                    'Name',
                    'Leader',
                    'Group',
                    'Growth step',
                    'Church',
                    'Cell',
                    'Portal',
                  ].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-3 py-2.5 font-medium first:pl-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((d) => {
                  const portal = portalText(d)
                  return (
                    <tr key={d.id} className="border-t hover:bg-muted/40">
                      <td className="max-w-64 py-2 pr-3 pl-4">
                        <Link
                          to="/disciples/$discipleId"
                          params={{ discipleId: d.id }}
                          className="flex min-w-0 items-center gap-2.5"
                        >
                          <PersonAvatar
                            name={d.name}
                            gender={d.gender}
                            className="size-8 text-xs"
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">
                              {d.name}
                            </span>
                            <Role d={d} />
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-48 truncate px-3 py-2 text-foreground/85">
                        {d.handledByName ?? d.leaderName ?? '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-foreground/85">
                        {MEMBER_TYPE[d.memberType]}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-foreground/85">
                        {PROCESS_LEVEL[d.processLevel]}
                      </td>
                      <td className="px-3 py-2">
                        <ChurchStatusPill status={d.churchStatus} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-foreground/85">
                        {CELL_STATUS[d.cellStatus]}
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
            <span>
              {from}–{to} of {data.total.toLocaleString('en-US')}
            </span>
            <div className="flex gap-1.5">
              <Link
                to="."
                search={(prev) => ({
                  ...prev,
                  page: data.page - 1 > 1 ? data.page - 1 : undefined,
                })}
                disabled={data.page <= 1}
                aria-label="Previous page"
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'icon-lg',
                  className:
                    data.page <= 1 ? 'pointer-events-none opacity-40' : '',
                })}
              >
                <ChevronLeft aria-hidden="true" />
              </Link>
              <Link
                to="."
                search={(prev) => ({ ...prev, page: data.page + 1 })}
                disabled={data.page >= pages}
                aria-label="Next page"
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'icon-lg',
                  className:
                    data.page >= pages ? 'pointer-events-none opacity-40' : '',
                })}
              >
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </>
      )}
      {!data.everyone && data.rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <Pill tone="neutral">Tip</Pill> Open a disciple to share their portal
          link.
        </p>
      )}
      <FiltersDialog
        open={filtering}
        onOpenChange={setFiltering}
        value={search}
        leaders={data.leaders}
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
