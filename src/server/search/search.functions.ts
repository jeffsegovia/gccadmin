import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { disciples, lessonSeries, lessons, newComers } from '@/db/schema'
import { requireAccess, seesEveryone } from '@/server/auth/access.server'
import { likeTerm } from '@/server/disciples/disciples.queries'

/** The top bar's search: people first, then lessons. */
export const searchEverything = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().trim().min(2).max(80) }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const term = likeTerm(data.q)
    const me = access.disciple?.id
    const scope = seesEveryone(access)
      ? undefined
      : me
        ? or(
            eq(disciples.leaderId, me),
            eq(disciples.handledById, me),
            eq(disciples.id, me),
          )
        : sql`false`
    const [people, guests, lessonRows] = await Promise.all([
      db
        .select({
          id: disciples.id,
          name: disciples.name,
          isPrimary: disciples.isPrimary,
          isActive: disciples.isActive,
        })
        .from(disciples)
        .where(
          and(
            eq(disciples.isDeleted, false),
            ilike(disciples.name, term),
            scope,
          ),
        )
        .orderBy(asc(disciples.name))
        .limit(8),
      db
        .select({ id: newComers.id, name: newComers.name })
        .from(newComers)
        .where(
          and(
            ilike(newComers.name, term),
            sql`${newComers.discipleProfileId} is null`,
          ),
        )
        .orderBy(asc(newComers.name))
        .limit(5),
      db
        .select({
          id: lessons.id,
          title: lessons.title,
          seriesId: lessonSeries.id,
          seriesTitle: lessonSeries.title,
        })
        .from(lessons)
        .innerJoin(lessonSeries, eq(lessonSeries.id, lessons.lessonSeriesId))
        .where(or(ilike(lessons.title, term), ilike(lessonSeries.title, term)))
        .orderBy(asc(lessons.title))
        .limit(6),
    ])
    return { people, guests, lessons: lessonRows }
  })
