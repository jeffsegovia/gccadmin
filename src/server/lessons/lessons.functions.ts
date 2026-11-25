import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, ilike, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  cellReports,
  lessonSeries,
  lessons,
  soulWinningReports,
} from '@/db/schema'
import {
  AccessError,
  requireAccess,
  requireAdmin,
} from '@/server/auth/access.server'
import { likeTerm } from '@/server/disciples/disciples.queries'

/* Cell group lessons: everyone reads them; admins add and change them. */

const lessonCount = db
  .select({ seriesId: lessons.lessonSeriesId, n: count().as('n') })
  .from(lessons)
  .groupBy(lessons.lessonSeriesId)
  .as('lesson_count')

export const getSeriesList = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().optional() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const rows = await db
      .select({
        id: lessonSeries.id,
        title: lessonSeries.title,
        description: lessonSeries.description,
        tags: lessonSeries.tags,
        lessons: sql<number>`coalesce(${lessonCount.n}, 0)`.mapWith(Number),
      })
      .from(lessonSeries)
      .leftJoin(lessonCount, eq(lessonCount.seriesId, lessonSeries.id))
      .where(
        data.q?.trim()
          ? ilike(lessonSeries.title, likeTerm(data.q))
          : undefined,
      )
      .orderBy(desc(lessonSeries.createdAt))
    return { series: rows, canEdit: access.isAdmin }
  })

export const getSeries = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const [series] = await db
      .select()
      .from(lessonSeries)
      .where(eq(lessonSeries.id, data.id))
    if (!series) throw new AccessError('That series isn’t here anymore.')
    const list = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        description: lessons.description,
        fileUrl: lessons.fileUrl,
        scriptureReferences: lessons.scriptureReferences,
        taught:
          sql<number>`(select count(*) from ${cellReports} where ${cellReports.lessonId} = ${lessons.id})`.mapWith(
            Number,
          ),
      })
      .from(lessons)
      .where(eq(lessons.lessonSeriesId, data.id))
      .orderBy(asc(lessons.createdAt), asc(lessons.title))
    return { series, lessons: list, canEdit: access.isAdmin }
  })

const tagList = z.array(z.string().trim().min(1).max(40)).max(8).default([])
const refs = z.array(z.string().trim().min(1).max(80)).max(12).default([])

export const seriesSchema = z.object({
  title: z.string().trim().min(1, { message: 'Name the series' }).max(160),
  description: z.string().trim().max(1000).optional(),
  tags: tagList,
})

export const lessonSchema = z.object({
  title: z.string().trim().min(1, { message: 'Name the lesson' }).max(200),
  description: z.string().trim().max(2000).optional(),
  fileUrl: z
    .union([z.literal(''), z.url({ message: 'That link looks wrong' })])
    .optional(),
  scriptureReferences: refs,
})

export const saveSeries = createServerFn({ method: 'POST' })
  .validator(seriesSchema.extend({ id: z.string().optional() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const values = {
      title: data.title,
      description: data.description || null,
      tags: data.tags,
    }
    if (data.id) {
      await db
        .update(lessonSeries)
        .set(values)
        .where(eq(lessonSeries.id, data.id))
      return { id: data.id }
    }
    const [made] = await db
      .insert(lessonSeries)
      .values(values)
      .returning({ id: lessonSeries.id })
    return made
  })

export const deleteSeries = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const [used] = await db
      .select({ n: count() })
      .from(cellReports)
      .innerJoin(lessons, eq(lessons.id, cellReports.lessonId))
      .where(
        and(
          eq(lessons.lessonSeriesId, data.id),
          isNotNull(cellReports.lessonId),
        ),
      )
    if (used && used.n > 0)
      throw new AccessError(
        `Its lessons are in ${used.n} cell reports, so it stays. Rename it instead.`,
      )
    await db.delete(lessonSeries).where(eq(lessonSeries.id, data.id))
  })

export const saveLesson = createServerFn({ method: 'POST' })
  .validator(
    lessonSchema.extend({ id: z.string().optional(), seriesId: z.string() }),
  )
  .handler(async ({ data }) => {
    await requireAdmin()
    const values = {
      title: data.title,
      description: data.description || null,
      fileUrl: data.fileUrl || null,
      scriptureReferences: data.scriptureReferences,
    }
    if (data.id)
      await db.update(lessons).set(values).where(eq(lessons.id, data.id))
    else
      await db
        .insert(lessons)
        .values({ ...values, lessonSeriesId: data.seriesId })
  })

export const deleteLesson = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const [used] = await db
      .select({
        n: sql<number>`(select count(*) from ${cellReports} where ${cellReports.lessonId} = ${data.id}) + (select count(*) from ${soulWinningReports} where ${soulWinningReports.lessonId} = ${data.id})`.mapWith(
          Number,
        ),
      })
      .from(sql`(select 1) as one`)
    if (used && used.n > 0)
      throw new AccessError(`It’s used in ${used.n} reports, so it stays.`)
    await db.delete(lessons).where(eq(lessons.id, data.id))
  })
