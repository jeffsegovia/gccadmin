import { Globe } from 'lucide-react'
import { cn } from 'cn'

/* The marks of the sites GCC is on, drawn here (v2 showed each site's
   favicon), so they show offline and without a third-party service. */
const MARKS: Record<string, (className?: string) => React.ReactNode> = {
  'www.facebook.com': (className) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.4 24v-8.4h2.8l.5-3.3h-3.3v-2.1c0-.9.5-1.8 1.9-1.8h1.5V5.6s-1.4-.2-2.6-.2c-2.7 0-4.4 1.6-4.4 4.5v2.4H7v3.3h2.8V24z"
      />
    </svg>
  ),
  'www.youtube.com': (className) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="0" y="4" width="24" height="16" rx="4.5" fill="#FF0000" />
      <path fill="#fff" d="M9.6 8.4v7.2l6.2-3.6z" />
    </svg>
  ),
  'open.spotify.com': (className) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <g fill="none" stroke="#000" strokeLinecap="round">
        <path strokeWidth="2" d="M6.2 9.2c3.9-1.2 8.3-.9 11.7 1" />
        <path strokeWidth="1.7" d="M6.8 12.6c3.2-.9 6.7-.6 9.6.9" />
        <path strokeWidth="1.4" d="M7.4 15.8c2.5-.7 5.2-.5 7.5.7" />
      </g>
    </svg>
  ),
}

/** The mark of the site `href` points to, or a globe for any other. */
export function SiteIcon({
  href,
  className,
}: {
  href: string
  className?: string
}) {
  const mark = MARKS[new URL(href).hostname]
  return mark ? (
    mark(cn('size-5 shrink-0', className))
  ) : (
    <Globe
      aria-hidden="true"
      className={cn('size-5 shrink-0 text-muted-foreground', className)}
    />
  )
}
