import type { ReactNode } from 'react'
import { cn } from 'cn'
import type {
  CellStatus,
  CellType,
  SoulWinningReportType,
  ChurchStatus,
  Gender,
  MemberType,
  ProcessLevel,
} from '@/db/schema'
import {
  CELL_STATUS,
  CHURCH_STATUS,
  MEMBER_TYPE,
  PROCESS_LEVEL,
} from '@/lib/labels'

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
        // Tiny, as in Osamu: a word, not a button.
        'inline-flex h-5 max-w-full shrink-0 items-center gap-1 rounded-md px-1.5 text-xs leading-none font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}

/** Cell Status as a badge: Regular, or the 1st to 3rd timer. */
export function CellStatusPill({
  status,
  named,
}: {
  status: CellStatus
  named?: boolean
}) {
  return (
    <Pill tone={status === 'REGULAR' ? 'covered' : 'caution'}>
      {named ? `Cell · ${CELL_STATUS[status]}` : CELL_STATUS[status]}
    </Pill>
  )
}

/** Process Level as a badge (the Growth Process step). */
export function ProcessLevelPill({ level }: { level: ProcessLevel }) {
  return (
    <Pill tone={level === 'NONE' ? 'neutral' : 'primary'}>
      {PROCESS_LEVEL[level]}
    </Pill>
  )
}

/** Member Type as a badge, the word only. */
export function MemberTypePill({ type }: { type: MemberType }) {
  return <Pill>{MEMBER_TYPE[type]}</Pill>
}

/** Church Status as a badge. `named` adds "Church ·" where it sits beside
 * Cell Status and both could read Regular. */
export function ChurchStatusPill({
  status,
  named,
}: {
  status: ChurchStatus
  named?: boolean
}) {
  const tone: Tone =
    status === 'REGULAR' ? 'covered' : status === 'ACS' ? 'primary' : 'neutral'
  return (
    <Pill tone={tone}>
      {named ? `Church · ${CHURCH_STATUS[status]}` : CHURCH_STATUS[status]}
    </Pill>
  )
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

/** A lesson's source, as v2 tagged it: GCC Lesson or Custom. */
export function LessonTag({ custom }: { custom: boolean }) {
  return (
    <Pill tone={custom ? 'neutral' : 'primary'}>
      {custom ? 'Custom' : 'GCC Lesson'}
    </Pill>
  )
}

/* One color per report kind, everywhere (badges, charts, PDF): the
   Insights series colors, checked for color-blind separation. */
export const KIND_COLOR = {
  OPEN: 'var(--series-1)',
  DISCIPLESHIP: 'var(--series-2)',
  SOULWINNING: 'var(--series-3)',
  SOUL_WINNING: 'var(--series-3)',
  CONSOLIDATION: 'var(--series-4)',
} as const

const KIND_LABEL = {
  OPEN: 'Open Cell',
  DISCIPLESHIP: 'Discipleship',
  SOULWINNING: 'Soul Winning',
  SOUL_WINNING: 'Soul Winning',
  CONSOLIDATION: 'Consolidation',
} as const

/** A report's kind as a badge in its color: Open Cell, Discipleship, Soul
 * Winning, Consolidation. */
export function KindPill({ kind }: { kind: CellType | SoulWinningReportType }) {
  const color = KIND_COLOR[kind]
  return (
    <span
      className="inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs leading-none font-medium whitespace-nowrap"
      style={{
        color,
        background: `color-mix(in oklab, ${color} 16%, transparent)`,
      }}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}
