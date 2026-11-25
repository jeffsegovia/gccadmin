import type {
  AttendanceType,
  CellStatus,
  CellType,
  ChurchStatus,
  Gender,
  MemberType,
  ProcessLevel,
  ProcessLevelStatus,
  SoulWinningReportType,
} from '@/db/schema'

/* Words for every stored value, in one place. Enum values never reach the
   screen as they are. */

export const GENDER: Record<Gender, string> = { MALE: 'Male', FEMALE: 'Female' }

export const MEMBER_TYPE: Record<MemberType, string> = {
  KIDS: 'Kids',
  YOUTH: 'Youth',
  YOUNGPRO: 'Young pro',
  MEN: 'Men',
  WOMEN: 'Women',
  UNCATEGORIZED: 'No group',
}

export const CHURCH_STATUS: Record<ChurchStatus, string> = {
  REGULAR: 'Regular',
  ACS: 'ACS',
  NACS: 'NACS',
}

export const CELL_STATUS: Record<CellStatus, string> = {
  FIRST_TIMER: '1st timer',
  SECOND_TIMER: '2nd timer',
  THIRD_TIMER: '3rd timer',
  REGULAR: 'Regular',
}

export const PROCESS_LEVEL: Record<ProcessLevel, string> = {
  NONE: 'None yet',
  PREENC: 'Pre-encounter',
  ENCOUNTER: 'Encounter',
  LEADERSHIP_1: 'Leadership 1',
  LEADERSHIP_2: 'Leadership 2',
  LEADERSHIP_3: 'Leadership 3',
}

/** The steps of the Growth Process System in order (None is before them). */
export const PROCESS_STEPS: ReadonlyArray<ProcessLevel> = [
  'PREENC',
  'ENCOUNTER',
  'LEADERSHIP_1',
  'LEADERSHIP_2',
  'LEADERSHIP_3',
]

export const PROCESS_STATUS: Record<ProcessLevelStatus, string> = {
  NOT_STARTED: 'Not started',
  ON_GOING: 'Ongoing',
  PENDING_REQUIREMENTS: 'Pending requirements',
  FINISHED: 'Finished',
  UNFINISHED: 'Unfinished',
  DROPPED: 'Dropped',
}

export const CELL_TYPE: Record<CellType, string> = {
  OPEN: 'Open',
  DISCIPLESHIP: 'Discipleship',
  SOULWINNING: 'Soul winning',
}

export const ATTENDANCE_TYPE: Record<AttendanceType, string> = {
  SUNDAY_SERVICE: 'Sunday service',
  EVENT: 'Event',
}

export const SOUL_WINNING_TYPE: Record<SoulWinningReportType, string> = {
  SOUL_WINNING: 'Soul winning',
  CONSOLIDATION: 'Consolidation',
}

export function options<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as Array<T>).map((value) => ({
    value,
    label: labels[value],
  }))
}

export function initials(name: string): string {
  return name
    .replace(/^(ptr|ptra|pastor|bro|sis)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`
}
