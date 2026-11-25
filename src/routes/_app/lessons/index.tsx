import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { BookOpen, ChevronRight, Plus } from 'lucide-react'
import { z } from 'zod'
import { Empty, Page } from '@/components/shell/page'
import { ListSearch } from '@/components/list-search'
import { SeriesDialog } from '@/components/lessons/lesson-dialogs'
import { Button } from '@/components/ui/button'
import { Group } from '@/components/ui/list'
import { plural } from '@/lib/labels'
import { getSeriesList } from '@/server/lessons/lessons.functions'

export const Route = createFileRoute('/_app/lessons/')({
  validateSearch: z.object({ q: z.string().optional() }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getSeriesList({ data: deps }),
  head: () => ({ meta: [{ title: 'Cell group lessons · GCC Admin' }] }),
  component: LessonsPage,
})

function LessonsPage() {
  const data = Route.useLoaderData()
  const { q } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [adding, setAdding] = useState(false)
  return (
    <Page
      title="Cell group lessons"
      description={plural(data.series.length, 'series', 'series')}
      action={
        data.canEdit && (
          <Button size="lg" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" /> New series
          </Button>
        )
      }
    >
      <ListSearch
        value={q}
        placeholder="Search series"
        onChange={(next) =>
          void navigate({ search: { q: next }, replace: true })
        }
      />
      {data.series.length === 0 ? (
        <Empty
          icon={BookOpen}
          title={q ? 'No series by that name.' : 'No lessons yet.'}
        />
      ) : (
        <Group>
          {data.series.map((s) => (
            <Link
              key={s.id}
              to="/lessons/$seriesId"
              params={{ seriesId: s.id }}
              className="flex min-h-15 min-w-0 items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50"
            >
              <span className="grid size-9 shrink-0 place-items-center bg-muted text-primary">
                <BookOpen aria-hidden="true" className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium">
                  {s.title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {plural(s.lessons, 'lesson')}
                  {s.tags?.length ? ` · ${s.tags.join(', ')}` : ''}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            </Link>
          ))}
        </Group>
      )}
      <SeriesDialog
        value={adding ? { title: '' } : null}
        onClose={() => setAdding(false)}
        onSaved={(id) =>
          void navigate({ to: '/lessons/$seriesId', params: { seriesId: id } })
        }
      />
    </Page>
  )
}
