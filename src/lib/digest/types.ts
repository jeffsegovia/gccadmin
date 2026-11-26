/** A period's report for the whole church, the one thing behind the
 * email, the preview and the image, so they always say the same. */
export type DigestKind = 'week' | 'month'

export type Digest = {
  kind: DigestKind
  /** "Nov 17–23" or "October 2026". */
  label: string
  /** The period's first day (YYYY-MM-DD, Manila): its log key. */
  key: string
  /** 1. Reports filed by type: cell groups, then the Soul winning
   * module's sessions. */
  reports: {
    open: number
    discipleship: number
    soulWinning: number
    consolidation: number
  }
  newBelievers: number
  /** 2. Cell reports each leader filed, by type. Leaders who filed none
   * are under `notReported`. */
  byLeader: Array<{
    name: string
    open: number
    discipleship: number
  }>
  /** 3. Disciples who led cell groups as an assistant, and how many. */
  assistants: Array<{ name: string; n: number }>
  /** 4. Sunday services in the period. */
  sundays: Array<{ date: string; title: string; total: number; guests: number }>
  /** 5. Leaders with no cell report in the period. */
  leaders: number
  reported: number
  notReported: Array<{ name: string; last: string }>
  /** 6. Everyone in GCC today, by member type. */
  members: {
    total: number
    rows: Array<{
      label: string
      total: number
      nacs: number
      acs: number
      regular: number
    }>
  }
}

export const DIGEST_WORDS: Record<
  DigestKind,
  { title: string; short: string; once: string }
> = {
  week: { title: 'Last week at GCC', short: 'Last week', once: 'week' },
  month: { title: 'Last month at GCC', short: 'Last month', once: 'month' },
}
