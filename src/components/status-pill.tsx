import type { ReactNode } from 'react'
import { cn } from 'cn'
import type {
  CellStatus,
  CellType,
  SoulWinningReportType,
  ChurchStatus,
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
  neutral: 'bg-muted text-foreground/80',
}

/** A small word: gray by default, as in the redesign (27 November 2026).
 * A tint only says something needs a look (No Sunday yet, Not yet) or is
 * done (Reported). Always a word, never color alone. */
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
        'inline-flex h-5 w-fit max-w-full shrink-0 items-center gap-1 rounded-md px-1.5 text-xs leading-none font-medium whitespace-nowrap',
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
    <Pill>{named ? `Cell · ${CELL_STATUS[status]}` : CELL_STATUS[status]}</Pill>
  )
}

/** Process Level as a badge (the Growth Process step). */
export function ProcessLevelPill({ level }: { level: ProcessLevel }) {
  return <Pill>{PROCESS_LEVEL[level]}</Pill>
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
  return (
    <Pill>
      {named ? `Church · ${CHURCH_STATUS[status]}` : CHURCH_STATUS[status]}
    </Pill>
  )
}

/** A lesson's source, as v2 tagged it: GCC Lesson or Custom, as a gray
 * badge beside the lesson's name. */
export function LessonTag({ custom }: { custom: boolean }) {
  return <Pill>{custom ? 'Custom' : 'GCC Lesson'}</Pill>
}

/* One color per report kind, everywhere (badges, charts, PDF): the
   Insights series colors, checked for color-blind separation.
   Discipleship is green, as in v2. */
export const KIND_COLOR = {
  OPEN: 'var(--series-1)',
  DISCIPLESHIP: 'var(--series-3)',
  SOULWINNING: 'var(--series-2)',
  SOUL_WINNING: 'var(--series-2)',
  CONSOLIDATION: 'var(--series-4)',
} as const

const KIND_LABEL = {
  OPEN: 'Open Cell',
  DISCIPLESHIP: 'Discipleship',
  SOULWINNING: 'Soul Winning',
  SOUL_WINNING: 'Soul Winning',
  CONSOLIDATION: 'Consolidation',
} as const

/** A report's kind as a gray badge with a dot in its color (the color it
 * has in the charts and PDF): Open Cell, Discipleship, Soul Winning,
 * Consolidation. */
export function KindPill({ kind }: { kind: CellType | SoulWinningReportType }) {
  return (
    <Pill>
      <span
        aria-hidden="true"
        className="mr-1 inline-block size-1.5 rounded-full align-middle"
        style={{ background: KIND_COLOR[kind] }}
      />
      {KIND_LABEL[kind]}
    </Pill>
  )
}
