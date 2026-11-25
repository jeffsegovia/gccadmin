import { useSyncExternalStore } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react'
import { isDarkNow, subscribeDarkClass } from '@/lib/theme'

// Toasts follow the page's theme (light, dark, or the device), so their
// text keeps its contrast. Colors come from the app's tokens. A success
// carries a solid green check so a save is hard to miss; warnings and
// errors color their icons with the caution and short tokens.
const Toaster = ({ ...props }: ToasterProps) => {
  const dark = useSyncExternalStore(subscribeDarkClass, isDarkNow, () => false)
  return (
    <Sonner
      theme={dark ? 'dark' : 'light'}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-5 fill-covered text-popover" />
        ),
        info: <InfoIcon className="size-5" />,
        warning: <TriangleAlertIcon className="size-5 text-caution" />,
        error: <OctagonXIcon className="size-5 text-short" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast !gap-3 !py-3.5 !shadow-lg',
          title: '!text-sm !font-semibold',
          description: '!text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
