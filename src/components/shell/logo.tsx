import { cn } from 'cn'

/** The church's gold shield. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={28}
      height={28}
      className={cn('size-7 shrink-0', className)}
    />
  )
}
