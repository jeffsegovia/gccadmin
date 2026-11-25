import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { FormField } from '@/components/form-field'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { splitList } from '@/lib/cell-reports/schema'
import { messageOf } from '@/lib/errors'
import {
  lessonSchema,
  saveLesson,
  saveSeries,
  seriesSchema,
} from '@/server/lessons/lessons.functions'

type SeriesValues = {
  id?: string
  title: string
  description?: string | null
  tags?: Array<string> | null
}
type LessonValues = {
  id?: string
  title: string
  description?: string | null
  fileUrl?: string | null
  scriptureReferences?: Array<string> | null
}

export function SeriesDialog({
  value,
  onClose,
  onSaved,
}: {
  value: SeriesValues | null
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (!value) return
    setTitle(value.title)
    setDescription(value.description ?? '')
    setTags((value.tags ?? []).join(', '))
    setError(undefined)
  }, [value])
  return (
    <ResponsiveDialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {value?.id ? 'Edit series' : 'New lesson series'}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const parsed = seriesSchema.safeParse({
              title,
              description,
              tags: splitList(tags),
            })
            if (!parsed.success)
              return setError(parsed.error.issues[0]?.message)
            setPending(true)
            try {
              const r = await saveSeries({
                data: { ...parsed.data, id: value?.id },
              })
              toast.success('Series saved')
              onClose()
              await router.invalidate()
              onSaved?.(r.id)
            } catch (err) {
              toast.error(messageOf(err))
            } finally {
              setPending(false)
            }
          }}
        >
          <FormField label="Title" htmlFor="s-title" error={error}>
            <Input
              id="s-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <FormField label="About" htmlFor="s-desc" optional>
            <Textarea
              id="s-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
          <FormField
            label="Tags"
            htmlFor="s-tags"
            optional
            hint="Separate with commas."
          >
            <Input
              id="s-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </FormField>
          <DialogActions>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onClose}
            >
              Cancel
            </Button>
            <SubmitButton size="lg" pending={pending}>
              Save
            </SubmitButton>
          </DialogActions>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}

export function LessonDialog({
  seriesId,
  value,
  onClose,
}: {
  seriesId: string
  value: LessonValues | null
  onClose: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [refs, setRefs] = useState('')
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  useEffect(() => {
    if (!value) return
    setTitle(value.title)
    setDescription(value.description ?? '')
    setFileUrl(value.fileUrl ?? '')
    setRefs((value.scriptureReferences ?? []).join(', '))
    setError(undefined)
  }, [value])
  return (
    <ResponsiveDialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {value?.id ? 'Edit lesson' : 'New lesson'}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const parsed = lessonSchema.safeParse({
              title,
              description,
              fileUrl,
              scriptureReferences: splitList(refs),
            })
            if (!parsed.success)
              return setError(parsed.error.issues[0]?.message)
            setPending(true)
            try {
              await saveLesson({
                data: { ...parsed.data, id: value?.id, seriesId },
              })
              toast.success('Lesson saved')
              onClose()
              await router.invalidate()
            } catch (err) {
              toast.error(messageOf(err))
            } finally {
              setPending(false)
            }
          }}
        >
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <FormField label="Title" htmlFor="l-title">
            <Input
              id="l-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormField>
          <FormField
            label="Scripture"
            htmlFor="l-refs"
            optional
            hint="Separate with commas."
          >
            <Input
              id="l-refs"
              value={refs}
              onChange={(e) => setRefs(e.target.value)}
            />
          </FormField>
          <FormField
            label="Link to the file"
            htmlFor="l-file"
            optional
            hint="A Google Drive or PDF link."
          >
            <Input
              id="l-file"
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
          </FormField>
          <FormField label="Notes" htmlFor="l-desc" optional>
            <Textarea
              id="l-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
          <DialogActions>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onClose}
            >
              Cancel
            </Button>
            <SubmitButton size="lg" pending={pending}>
              Save
            </SubmitButton>
          </DialogActions>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
