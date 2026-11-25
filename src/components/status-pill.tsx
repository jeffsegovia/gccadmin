import type { ReactNode } from 'react'
import { cn } from 'cn'
import type { ChurchStatus, Gender } from '@/db/schema'
import { CHURCH_STATUS } from '@/lib/labels'

export type Tone =
  'covered' | 'caution' | 'short' | 'primary' | 'men' | 'neutral'

const TONES: Record<Tone, string> = {
  covered: 'bg-covered/15 text-covered',
  caution: 'bg-caution/15 text-caution',
  short: 'bg-short/15 text-short',
  primary: 'bg-primary/15 text-primary',
  men: 'bg-men/15 text-men',
  neutral: 'bg-muted text-muted-foreground',
}

/** A small word in a tint: Regular, 1st visit, Closed. Always a word,
 * never color alone. */
export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-full shrink-0 items-center gap-1 px-2 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}

export function ChurchStatusPill({ status }: { status: ChurchStatus }) {
  const tone: Tone =
    status === 'REGULAR' ? 'covered' : status === 'ACS' ? 'primary' : 'neutral'
  return <Pill tone={tone}>{CHURCH_STATUS[status]}</Pill>
}

/** A thin colored bar beside a name: men blue, women pink (with the word
 * in the row's second line or the screen reader text). */
export function GenderBar({ gender }: { gender: Gender }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'h-7 w-1 shrink-0',
        gender === 'MALE' ? 'bg-men' : 'bg-women',
      )}
    />
  )
}

export function PersonAvatar({
  name,
  gender,
  className,
}: {
  name: string
  gender: Gender
  className?: string
}) {
  const letters = name
    .replace(/^(ptr|ptra|pastor|bro|sis)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold',
        gender === 'MALE' ? 'bg-men/15 text-men' : 'bg-women/15 text-women',
        className,
      )}
    >
      {letters}
    </span>
  )
}
