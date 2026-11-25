import { Check } from 'lucide-react'
import { cn } from 'cn'

/** The tick on a tappable row (the whole row is the checkbox, so this is
 * only its picture). 16px, as the row already gives the tap target. */
export function CheckMark({
  on,
  className,
}: {
  on: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-4 shrink-0 place-items-center border-[1.5px] transition-colors',
        on
          ? 'border-covered bg-covered text-background'
          : 'border-foreground/30',
        className,
      )}
    >
      {on && <Check className="size-3" strokeWidth={3.5} />}
    </span>
  )
}
