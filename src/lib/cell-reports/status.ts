import type { CellStatus } from '@/db/schema'

/** One more cell group: 1st timer → 2nd → 3rd → Regular. Someone added
 * today as a first-timer stays one for the cell group they were added at
 * (it is their first). As in v2. */
export function cellStatusAfter(
  current: CellStatus,
  addedToday: boolean,
): CellStatus {
  if (addedToday && current === 'FIRST_TIMER') return 'FIRST_TIMER'
  switch (current) {
    case 'FIRST_TIMER':
      return 'SECOND_TIMER'
    case 'SECOND_TIMER':
      return 'THIRD_TIMER'
    default:
      return 'REGULAR'
  }
}
