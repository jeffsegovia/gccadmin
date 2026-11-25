import { useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Page } from '@/components/shell/page'
import { LessonDialog, SeriesDialog } from '@/components/lessons/lesson-dialogs'
import { Button, buttonVariants } from '@/components/ui/button'
import { Group } from '@/components/ui/list'
import { plural } from '@/lib/labels'
import { messageOf } from '@/lib/errors'
import {
  deleteLesson,
  deleteSeries,
  getSeries,
} from '@/server/lessons/lessons.functions'

export const Route = createFileRoute('/_app/lessons/$seriesId')({
  loader: ({ params }) => getSeries({ data: { id: params.seriesId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.series.title ?? 'Lessons'} · GCC Admin` }],
  }),
  component: SeriesPage,
})

type Lesson = ReturnType<typeof Route.useLoaderData>['lessons'][number]

function SeriesPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [editingSeries, setEditingSeries] = useState(false)
  const [lesson, setLesson] = useState<Partial<Lesson> | null>(null)
  const s = data.series
  return (
    <Page
      back={{ to: '/lessons', label: 'Cell group lessons' }}
      title={s.title}
      description={s.description || plural(data.lessons.length, 'lesson')}
      action={
        data.canEdit && (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setEditingSeries(true)}
            >
              <Pencil aria-hidden="true" /> Edit
            </Button>
            <Button
              variant="destructive"
              size="icon-lg"
              aria-label="Delete series"
              onClick={async () => {
                if (!confirm(`Delete ${s.title} and its lessons?`)) return
                try {
                  await deleteSeries({ data: { id: s.id } })
                  toast.success('Series deleted')
                  await navigate({ to: '/lessons' })
                } catch (e) {
                  toast.error(messageOf(e))
                }
              }}
            >
              <Trash2 aria-hidden="true" />
            </Button>
            <Button size="lg" onClick={() => setLesson({ title: '' })}>
              <Plus aria-hidden="true" /> Lesson
            </Button>
          </>
        )
      }
    >
      {data.lessons.length === 0 ? (
        <p className="border border-dashed px-4 py-10 text-center text-sm text-muted-foreground rounded-xl">
          No lessons in this series yet.
        </p>
      ) : (
        <Group>
          {data.lessons.map((l, i) => (
            <div
              key={l.id}
              className="flex min-h-15 min-w-0 items-start gap-3 px-3.5 py-3"
            >
              <span className="numeric w-6 shrink-0 pt-0.5 text-sm text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium break-words">{l.title}</span>
                {!!l.scriptureReferences?.length && (
                  <span className="text-xs text-muted-foreground">
                    {l.scriptureReferences.join(' · ')}
                  </span>
                )}
                {l.description && (
                  <p className="text-sm text-muted-foreground">
                    {l.description}
                  </p>
                )}
                <span className="text-xs text-muted-foreground">
                  Taught {plural(l.taught, 'time')}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {l.fileUrl && (
                  <a
                    href={l.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${l.title}`}
                    className={buttonVariants({
                      variant: 'ghost',
                      size: 'icon',
                    })}
                  >
                    <ExternalLink aria-hidden="true" />
                  </a>
                )}
                {data.canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${l.title}`}
                      onClick={() => setLesson(l)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${l.title}`}
                      onClick={async () => {
                        if (!confirm(`Delete ${l.title}?`)) return
                        try {
                          await deleteLesson({ data: { id: l.id } })
                          toast.success('Lesson deleted')
                          await router.invalidate()
                        } catch (e) {
                          toast.error(messageOf(e))
                        }
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </Group>
      )}
      <SeriesDialog
        value={editingSeries ? s : null}
        onClose={() => setEditingSeries(false)}
      />
      <LessonDialog
        seriesId={s.id}
        value={lesson as never}
        onClose={() => setLesson(null)}
      />
    </Page>
  )
}
