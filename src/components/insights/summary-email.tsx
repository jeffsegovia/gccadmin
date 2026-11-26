import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Download, Mail, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Spinner } from '@/components/ui/spinner'
import { digestFileName, renderDigestImage } from '@/lib/digest/image'
import { DIGEST_WORDS } from '@/lib/digest/types'
import type { Digest, DigestKind } from '@/lib/digest/types'
import { shortDate } from '@/lib/dates'
import { messageOf } from '@/lib/errors'
import { emailSummary, getDigest } from '@/server/email/emails.functions'

type Sent = { label: string; sentAt: string | null; by: string | null }
type Status = { week: Sent; month: Sent }

/** Opt-in, for admins and pastors: pick last week's or last month's
 * report, see it as the picture it can become, send that picture to a
 * group chat, or email it to every admin and pastor (once per period). */
export function SummaryEmail({ status }: { status: Status }) {
  const [open, setOpen] = useState(false)
  const sent = [status.week, status.month].filter((s) => s.sentAt)
  return (
    <>
      {sent.map((s) => (
        <p
          key={s.label}
          className="flex min-w-0 items-start gap-2 text-[13px] text-muted-foreground"
        >
          <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 break-words">
            The report for {s.label} was emailed {shortDate(s.sentAt!)}
            {s.by ? ` by ${s.by}` : ''}.
          </span>
        </p>
      ))}
      <Button
        variant="secondary"
        size="lg"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        <Mail aria-hidden="true" /> Send a report
      </Button>
      {open && <ReportDialog status={status} onClose={() => setOpen(false)} />}
    </>
  )
}

function ReportDialog({
  status,
  onClose,
}: {
  status: Status
  onClose: () => void
}) {
  const router = useRouter()
  const [kind, setKind] = useState<DigestKind>('week')
  const [digest, setDigest] = useState<Digest | null>(null)
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const done = status[kind]

  // The report's numbers, then the picture drawn from them.
  useEffect(() => {
    let live = true
    let url: string | null = null
    setDigest(null)
    setImage(null)
    setError(null)
    getDigest({ data: { kind } })
      .then(async (d) => {
        const blob = await renderDigestImage(d)
        if (!live) return
        url = URL.createObjectURL(blob)
        setDigest(d)
        setImage({ blob, url })
      })
      .catch((err) => live && setError(messageOf(err)))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [kind])

  const file = () =>
    new File([image!.blob], digestFileName(digest!), { type: 'image/png' })
  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    !!image &&
    !!digest &&
    navigator.canShare({ files: [file()] })

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Send a report</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Email it to every admin and pastor, or save it as a picture for the
            group chat.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          className="flex min-w-0 flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setPending(true)
            try {
              const r = await emailSummary({ data: { kind } })
              toast.success(
                `Report sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}`,
              )
              await router.invalidate()
            } catch (e) {
              toast.error(messageOf(e))
            } finally {
              setPending(false)
            }
          }}
        >
          <Segmented<DigestKind>
            label="Report"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'week', label: DIGEST_WORDS.week.short },
              { value: 'month', label: DIGEST_WORDS.month.short },
            ]}
          />
          <p className="text-[13px] text-muted-foreground">
            {done.label}
            {done.sentAt
              ? ` · emailed ${shortDate(done.sentAt)}${done.by ? ` by ${done.by}` : ''}`
              : ' · not emailed yet'}
          </p>
          <div className="grid min-h-48 min-w-0 place-items-center overflow-hidden rounded-xl border bg-black">
            {error ? (
              <p role="alert" className="p-4 text-sm text-destructive">
                {error}
              </p>
            ) : image ? (
              <img
                src={image.url}
                alt={`${DIGEST_WORDS[kind].title}, ${digest?.label}`}
                className="max-h-[50dvh] w-full object-contain object-top"
              />
            ) : (
              <Spinner aria-label="Making the picture" />
            )}
          </div>
          <div className="flex gap-2 *:flex-1">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={!image}
              onClick={() => {
                const a = document.createElement('a')
                a.href = image!.url
                a.download = digestFileName(digest!)
                a.click()
              }}
            >
              <Download aria-hidden="true" /> Download image
            </Button>
            {canShare && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() =>
                  void navigator.share({ files: [file()] }).catch(() => {})
                }
              >
                <Share2 aria-hidden="true" /> Share
              </Button>
            )}
          </div>
          <DialogActions>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
            <SubmitButton
              size="lg"
              pending={pending}
              pendingLabel="Sending…"
              disabled={!!done.sentAt || !digest}
              data-short="Email"
            >
              {done.sentAt ? 'Already emailed' : 'Email report'}
            </SubmitButton>
          </DialogActions>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
