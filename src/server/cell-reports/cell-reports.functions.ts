import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { cellReports } from '@/db/schema'
import {
  AccessError,
  requireAccess,
  seesEveryone,
} from '@/server/auth/access.server'
import { listLeaders } from '@/server/disciples/disciples.queries'
import { cellReportSchema, listReportsSchema } from '@/lib/cell-reports/schema'
import {
  attendeeChoices,
  findReport,
  insertReport,
  lessonChoices,
  listReports,
  replaceReport,
  suggestedLesson,
} from './cell-reports.server'

/* Everyone with access reads every report, as in v2 (with "Mine" to narrow
   it). A leader files and edits their own network's reports; admins any. */

export const getReportsPage = createServerFn({ method: 'GET' })
  .validator(listReportsSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const [list, leaders] = await Promise.all([
      listReports(data, access.disciple?.id ?? null),
      seesEveryone(access) ? listLeaders() : Promise.resolve([]),
    ])
    return {
      ...list,
      leaders,
      canFilterLeader: seesEveryone(access),
      myId: access.disciple?.id ?? null,
    }
  })

export const exportReports = createServerFn({ method: 'GET' })
  .validator(listReportsSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    return (await listReports(data, access.disciple?.id ?? null, true)).rows
  })

export const getReport = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const found = await findReport(data.id)
    if (!found) throw new AccessError('That report isn’t here anymore.')
    return {
      ...found,
      canEdit: access.isAdmin || found.report.leaderId === access.disciple?.id,
    }
  })

/** Lessons, the network's people and a suggested lesson, for the form. */
export const getReportFormOptions = createServerFn({ method: 'GET' })
  .validator(z.object({ leaderId: z.string().optional() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const leaderId = access.isAdmin
      ? (data.leaderId ?? access.disciple?.id)
      : access.disciple?.id
    const [allLessons, people, leaders] = await Promise.all([
      lessonChoices(),
      attendeeChoices({ leaderId }),
      access.isAdmin ? listLeaders() : Promise.resolve([]),
    ])
    return {
      lessons: allLessons,
      people,
      leaders,
      leaderId: leaderId ?? null,
      chooseLeader: access.isAdmin,
      suggested: leaderId
        ? await suggestedLesson({ leaderId }, allLessons)
        : null,
    }
  })

function ownerFor(
  access: Awaited<ReturnType<typeof requireAccess>>,
  wanted?: string,
) {
  const leaderId = access.isAdmin
    ? (wanted ?? access.disciple?.id)
    : access.disciple?.id
  if (!leaderId) throw new AccessError('Choose the network leader.')
  return leaderId
}

export const createReport = createServerFn({ method: 'POST' })
  .validator(cellReportSchema)
  .handler(async ({ data }) => {
    const access = await requireAccess()
    return insertReport(data, ownerFor(access, data.leaderId))
  })

export const updateReport = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), report: cellReportSchema }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const found = await findReport(data.id)
    if (!found) throw new AccessError('That report isn’t here anymore.')
    if (!access.isAdmin && found.report.leaderId !== access.disciple?.id)
      throw new AccessError('Only its leader can change this report.')
    await replaceReport(
      data.id,
      data.report,
      access.isAdmin
        ? (data.report.leaderId ?? found.report.leaderId)
        : found.report.leaderId,
    )
  })

export const deleteReport = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const found = await findReport(data.id)
    if (!found) return
    if (!access.isAdmin && found.report.leaderId !== access.disciple?.id)
      throw new AccessError('Only its leader can delete this report.')
    await db.delete(cellReports).where(eq(cellReports.id, data.id))
  })
