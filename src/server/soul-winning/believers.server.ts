import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import {
  lessonSeries,
  lessons,
  soulWinningNewBelievers,
  soulWinningReports,
} from '@/db/schema'

export type LessonView = 'soul-winning' | 'consolidation'

// As in v2, the lessons a new believer goes through are the lessons of the
// series named Soul-Winning (or Soul Winning) and Consolidation.
const SERIES: Record<LessonView, Array<string>> = {
  'soul-winning': ['Soul-Winning', 'Soul Winning'],
  consolidation: ['Consolidation'],
}

/** The soul-winning and consolidation lessons, soul winning first. */
export async function trackedLessons(view?: LessonView) {
  const titles = view
    ? SERIES[view]
    : [...SERIES['soul-winning'], ...SERIES.consolidation]
  const rows = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      seriesTitle: lessonSeries.title,
    })
    .from(lessons)
    .innerJoin(lessonSeries, eq(lessonSeries.id, lessons.lessonSeriesId))
    .where(inArray(lessonSeries.title, titles))
    .orderBy(asc(lessons.createdAt), asc(lessons.title))
  const rank = (t: string) => (SERIES.consolidation.includes(t) ? 1 : 0)
  return rows
    .map((r) => ({
      ...r,
      kind: rank(r.seriesTitle) ? 'consolidation' : 'soul-winning',
    }))
    .sort((a, b) => rank(a.seriesTitle) - rank(b.seriesTitle))
}

/** Each believer's lessons taken: the lesson of every session they were
 * part of, with the first date they took it. */
export async function lessonsTakenBy(ids: ReadonlyArray<string>) {
  const taken = new Map<string, Map<string, Date>>()
  if (ids.length === 0) return taken
  const rows = await db
    .select({
      believerId: soulWinningNewBelievers.newBelieverId,
      lessonId: soulWinningReports.lessonId,
      date: soulWinningReports.date,
    })
    .from(soulWinningNewBelievers)
    .innerJoin(
      soulWinningReports,
      eq(soulWinningReports.id, soulWinningNewBelievers.reportId),
    )
    .where(inArray(soulWinningNewBelievers.newBelieverId, [...ids]))
  for (const r of rows) {
    const mine = taken.get(r.believerId) ?? new Map<string, Date>()
    const had = mine.get(r.lessonId)
    if (!had || r.date < had) mine.set(r.lessonId, r.date)
    taken.set(r.believerId, mine)
  }
  return taken
}

/** v2 let a believer become a disciple only once they had taken every
 * soul-winning and consolidation lesson. */
export async function missingLessons(believerId: string) {
  const [all, taken] = await Promise.all([
    trackedLessons(),
    lessonsTakenBy([believerId]),
  ])
  const mine = taken.get(believerId) ?? new Map()
  return all.filter((l) => !mine.has(l.id))
}
