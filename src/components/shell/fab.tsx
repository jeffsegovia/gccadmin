import type { ComponentProps } from 'react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { cn } from 'cn'

/** Phones: a 56px gold button above the bottom bar for the page's one main
 * add (as in Worsheep). Wide screens show the page's own button. */
const fabClass =
  'fixed right-4 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom)+1rem)] z-20 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_oklch(0_0_0/0.35)] transition-transform active:scale-95 md:hidden [&_svg]:size-6'

export function Fab({
  label,
  className,
  ...props
}: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cn(fabClass, className)}
    >
      <Plus aria-hidden="true" strokeWidth={2.25} />
    </button>
  )
}

export function FabLink({ label, ...link }: LinkProps & { label: string }) {
  return (
    <Link {...link} aria-label={label} title={label} className={fabClass}>
      <Plus aria-hidden="true" strokeWidth={2.25} />
    </Link>
  )
}
