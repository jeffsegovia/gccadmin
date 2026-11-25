import { useEffect, useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cellReportsPdf, loadLogo } from '@/lib/cell-reports/pdf'
import type { PdfReport } from '@/lib/cell-reports/pdf'
import { messageOf } from '@/lib/errors'

/** v2's View PDF: the cell reports as PDF pages in a preview, with
 * Download and Open (a phone may not show a PDF inside the page). */
export function PdfPreview({
  open,
  onOpenChange,
  title,
  description,
  filename,
  load,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  filename: string
  /** The reports to put in the PDF, fetched when the preview opens. */
  load: () => Promise<ReadonlyArray<PdfReport>>
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!open) return
    let live = true
    let made: string | null = null
    setUrl(null)
    void (async () => {
      try {
        const [reports, logo] = await Promise.all([load(), loadLogo()])
        if (!live) return
        if (reports.length === 0) {
          toast.info('No reports to put in a PDF.')
          onOpenChange(false)
          return
        }
        made = URL.createObjectURL(cellReportsPdf(reports, logo).output('blob'))
        setCount(reports.length)
        setUrl(made)
      } catch (error) {
        toast.error(messageOf(error))
        onOpenChange(false)
      }
    })()
    return () => {
      live = false
      if (made) URL.revokeObjectURL(made)
    }
    // Rebuilt each time it opens; `load` changes with the filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-4xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {url
              ? `${count} ${count === 1 ? 'page' : 'pages'}${description ? ` · ${description}` : ''}`
              : 'Making the PDF…'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {url ? (
          <iframe
            title={title}
            src={url}
            className="h-[70vh] w-full rounded-lg border bg-white"
          />
        ) : (
          <Skeleton aria-busy="true" className="h-[70vh] w-full" />
        )}
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              <ExternalLink aria-hidden="true" /> Open
            </a>
          )}
          {url && (
            <a
              href={url}
              download={filename}
              className={buttonVariants({ size: 'lg' })}
            >
              <Download aria-hidden="true" /> Download
            </a>
          )}
        </DialogActions>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
