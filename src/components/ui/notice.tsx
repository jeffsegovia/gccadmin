import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'

const TONES = {
  caution: 'bg-caution/12 [&_[data-icon]]:text-caution',
  short: 'bg-short/12 [&_[data-icon]]:text-short',
  covered: 'bg-covered/12 [&_[data-icon]]:text-covered',
  neutral: 'bg-card [&_[data-icon]]:text-muted-foreground',
} as const

/** An inline message on a tint, never a bordered box: an icon, a bold
 * line, an optional detail and an optional action at the end. */
export function Notice({
  tone = 'neutral',
  icon: Icon,
  title,
  children,
  action,
  role,
  className,
}: {
  tone?: keyof typeof TONES
  icon: LucideIcon
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  role?: 'status' | 'alert'
  className?: string
}) {
  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px]',
        TONES[tone],
        className,
      )}
    >
      <Icon data-icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  )
}
