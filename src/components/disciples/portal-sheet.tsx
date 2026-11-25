import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Copy, Power, RefreshCw, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { PendingButton } from '@/components/pending-button'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { messageOf } from '@/lib/errors'
import {
  ensurePortalLink,
  resetPortalLink,
  turnOffPortal,
} from '@/server/disciples/disciples.functions'
import { QrCode } from '@/components/qr-code'

/** The leader's side of the disciple portal: a private link, no sign-in.
 * Copy, share or show a QR; make a new one (the old stops working) or
 * turn it off. Made the first time this opens. */
export function PortalSheet({
  open,
  onOpenChange,
  disciple,
  lastOpenedAt,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  disciple: { id: string; name: string }
  lastOpenedAt: Date | string | null
}) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const first = disciple.name.split(' ')[0] ?? disciple.name

  useEffect(() => {
    if (!open) return
    let live = true
    setError(null)
    ensurePortalLink({ data: { id: disciple.id } })
      .then((r) => {
        if (!live) return
        setToken(r.token)
        void router.invalidate()
      })
      .catch((e) => live && setError(messageOf(e)))
    return () => {
      live = false
    }
  }, [open, disciple.id, router])

  const url =
    token && typeof window !== 'undefined'
      ? `${window.location.origin}/me/${token}`
      : ''

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{first}’s portal</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {first} opens their own page with this link, no sign-in. Anyone with
            the link can see it, so send it only to them.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : !token ? (
          <div className="grid place-items-center py-10">
            <Spinner />
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 items-center gap-4 border bg-background p-4">
              <QrCode value={url} className="size-28 shrink-0 bg-white p-2" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="font-mono text-[13px] break-all">
                  {url.replace(/^https?:\/\//, '')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {lastOpenedAt
                    ? `Last opened ${new Date(lastOpenedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'Not opened yet'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="secondary"
                size="xl"
                className="px-3"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url)
                    toast.success('Link copied')
                  } catch {
                    toast.error(
                      'Couldn’t copy. Press and hold the link instead.',
                    )
                  }
                }}
              >
                <Copy aria-hidden="true" /> Copy link
              </Button>
              <Button
                size="xl"
                className="px-3"
                onClick={async () => {
                  const text = `Hi ${first}! Here’s your page at Grace City Church. Keep this link to yourself.`
                  if (navigator.share) {
                    await navigator
                      .share({ title: 'Your GCC page', text, url })
                      .catch(() => {})
                  } else {
                    await navigator.clipboard
                      .writeText(`${text}\n${url}`)
                      .catch(() => {})
                    toast.success('Message copied')
                  }
                }}
              >
                <Share2 aria-hidden="true" /> Share
              </Button>
            </div>
            <div className="flex flex-col border-t">
              <PendingButton
                variant="ghost"
                size="xl"
                className="h-auto justify-start py-3 text-left"
                icon={RefreshCw}
                onClick={async () => {
                  try {
                    const r = await resetPortalLink({
                      data: { id: disciple.id },
                    })
                    setToken(r.token)
                    toast.success('New link made. The old one no longer works.')
                    await router.invalidate()
                  } catch (e) {
                    toast.error(messageOf(e))
                  }
                }}
              >
                <span className="flex flex-col">
                  <span>Make a new link</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    The old one stops working at once
                  </span>
                </span>
              </PendingButton>
              <PendingButton
                variant="ghost"
                size="xl"
                className="h-auto justify-start py-3 text-left text-destructive hover:text-destructive"
                icon={Power}
                onClick={async () => {
                  try {
                    await turnOffPortal({ data: { id: disciple.id } })
                    toast.success('Portal turned off')
                    onOpenChange(false)
                    await router.invalidate()
                  } catch (e) {
                    toast.error(messageOf(e))
                  }
                }}
              >
                <span className="flex flex-col">
                  <span>Turn off portal</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Opening this sheet again turns it back on
                  </span>
                </span>
              </PendingButton>
            </div>
            <p className="text-xs text-muted-foreground">
              Only for disciples who aren’t primary leaders. Primary leaders
              sign in instead.
            </p>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
