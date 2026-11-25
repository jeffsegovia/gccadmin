import { and, asc, desc, eq, ilike, isNull, notInArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import {
  attendanceDisciples,
  attendanceNewComers,
  attendances,
  disciples,
  newComers,
} from '@/db/schema'
import { likeTerm } from '@/server/disciples/disciples.queries'

/* A guest's visits are the services they were marked at, in date order.
   Their first visit is the earliest; "first-timer at service S" means S is
   that first visit. Nothing about it is stored, so a guest who comes back
   next week stays a first-timer on last week's sheet (v2 lost that). */

/** Each guest's services in order, as (guestId, attendanceId, date, n). */
const visits = db.$with('visits').as(
  db
    .select({
      guestId: attendanceNewComers.newComerId,
      attendanceId: attendanceNewComers.attendanceId,
      date: attendances.date,
      n: sql<number>`row_number() over (partition by ${attendanceNewComers.newComerId} order by ${attendances.date}, ${attendances.createdAt})`
        .mapWith(Number)
        .as('n'),
    })
    .from(attendanceNewComers)
    .innerJoin(
      attendances,
      eq(attendances.id, attendanceNewComers.attendanceId),
    ),
)

export async function listServices(q?: string) {
  const present = db
    .select({
      attendanceId: attendanceDisciples.attendanceId,
      n: sql<number>`count(*)`.mapWith(Number).as('n'),
    })
    .from(attendanceDisciples)
    .groupBy(attendanceDisciples.attendanceId)
    .as('present')
  const guests = db
    .with(visits)
    .select({
      attendanceId: visits.attendanceId,
      total: sql<number>`count(*)`.mapWith(Number).as('total'),
      firsts: sql<number>`count(*) filter (where ${visits.n} = 1)`
        .mapWith(Number)
        .as('firsts'),
    })
    .from(visits)
    .groupBy(visits.attendanceId)
    .as('guests')
  return db
    .select({
      id: attendances.id,
      title: attendances.title,
      date: attendances.date,
      type: attendances.type,
      tags: attendances.tags,
      isLocked: attendances.isLocked,
      members: sql<number>`coalesce(${present.n}, 0)`.mapWith(Number),
      guests: sql<number>`coalesce(${guests.total}, 0)`.mapWith(Number),
      firstTimers: sql<number>`coalesce(${guests.firsts}, 0)`.mapWith(Number),
    })
    .from(attendances)
    .leftJoin(present, eq(present.attendanceId, attendances.id))
    .leftJoin(guests, eq(guests.attendanceId, attendances.id))
    .where(q?.trim() ? ilike(attendances.title, likeTerm(q)) : undefined)
    .orderBy(desc(attendances.date), desc(attendances.createdAt))
    .limit(120)
}

export type ServiceRow = Awaited<ReturnType<typeof listServices>>[number]

export async function findService(id: string) {
  const [row] = await db
    .select()
    .from(attendances)
    .where(eq(attendances.id, id))
  return row ?? null
}

const leader = alias(disciples, 'leader')

/** Everyone on the sheet: active disciples, grouped by network. Primary
 * leaders are their own group at the top, as in v2. */
export async function sheetMembers(attendanceId: string) {
  const rows = await db
    .select({
      id: disciples.id,
      name: disciples.name,
      gender: disciples.gender,
      memberType: disciples.memberType,
      isPrimary: disciples.isPrimary,
      leaderId: disciples.leaderId,
      leaderName: leader.name,
      present: sql<boolean>`${attendanceDisciples.discipleId} is not null`,
    })
    .from(disciples)
    .leftJoin(leader, eq(leader.id, disciples.leaderId))
    .leftJoin(
      attendanceDisciples,
      and(
        eq(attendanceDisciples.discipleId, disciples.id),
        eq(attendanceDisciples.attendanceId, attendanceId),
      ),
    )
    .where(and(eq(disciples.isDeleted, false), eq(disciples.isActive, true)))
    .orderBy(asc(disciples.name))
  return rows
}

export type SheetMember = Awaited<ReturnType<typeof sheetMembers>>[number]

const inviter = alias(disciples, 'inviter')

/** Guests at this service (with which visit this was), and guests who came
 * before it and haven't become disciples, last seen first. */
export async function sheetGuests(attendanceId: string, date: Date) {
  const present = await db
    .with(visits)
    .select({
      id: newComers.id,
      name: newComers.name,
      gender: newComers.gender,
      memberType: newComers.memberType,
      contactNo: newComers.contactNo,
      email: newComers.email,
      address: newComers.address,
      invitedById: newComers.invitedById,
      invitedByName: inviter.name,
      visit: visits.n,
    })
    .from(visits)
    .innerJoin(newComers, eq(newComers.id, visits.guestId))
    .leftJoin(inviter, eq(inviter.id, newComers.invitedById))
    .where(eq(visits.attendanceId, attendanceId))
    .orderBy(asc(newComers.name))

  const stats = db
    .with(visits)
    .select({
      guestId: visits.guestId,
      firstDate: sql<Date>`min(${visits.date})`.as('firstDate'),
      lastDate: sql<Date>`max(${visits.date})`.as('lastDate'),
      count: sql<number>`count(*)`.mapWith(Number).as('count'),
    })
    .from(visits)
    .where(sql`${visits.date} <= ${date}`)
    .groupBy(visits.guestId)
    .as('stats')
  const presentIds = present.map((g) => g.id)
  const before = await db
    .select({
      id: newComers.id,
      name: newComers.name,
      gender: newComers.gender,
      memberType: newComers.memberType,
      invitedByName: inviter.name,
      firstDate: stats.firstDate,
      lastDate: stats.lastDate,
      visits: stats.count,
    })
    .from(stats)
    .innerJoin(newComers, eq(newComers.id, stats.guestId))
    .leftJoin(inviter, eq(inviter.id, newComers.invitedById))
    .where(
      and(
        isNull(newComers.discipleProfileId),
        sql`${stats.firstDate} < ${date}`,
        presentIds.length ? notInArray(newComers.id, presentIds) : undefined,
      ),
    )
    .orderBy(desc(stats.lastDate), asc(newComers.name))
    .limit(300)
  return { present, before }
}

/** Every guest, for the Guests page: visits, first and last, and whether
 * they've become a disciple. */
export async function listGuests(q?: string) {
  const stats = db
    .with(visits)
    .select({
      guestId: visits.guestId,
      firstDate: sql<Date>`min(${visits.date})`.as('firstDate'),
      lastDate: sql<Date>`max(${visits.date})`.as('lastDate'),
      count: sql<number>`count(*)`.mapWith(Number).as('count'),
    })
    .from(visits)
    .groupBy(visits.guestId)
    .as('stats')
  return db
    .select({
      id: newComers.id,
      name: newComers.name,
      gender: newComers.gender,
      memberType: newComers.memberType,
      contactNo: newComers.contactNo,
      email: newComers.email,
      address: newComers.address,
      invitedById: newComers.invitedById,
      invitedByName: inviter.name,
      discipleProfileId: newComers.discipleProfileId,
      firstDate: stats.firstDate,
      lastDate: stats.lastDate,
      visits: sql<number>`coalesce(${stats.count}, 0)`.mapWith(Number),
    })
    .from(newComers)
    .leftJoin(stats, eq(stats.guestId, newComers.id))
    .leftJoin(inviter, eq(inviter.id, newComers.invitedById))
    .where(q?.trim() ? ilike(newComers.name, likeTerm(q)) : undefined)
    .orderBy(sql`${stats.lastDate} desc nulls last`, asc(newComers.name))
    .limit(500)
}

export async function guestIdsAt(attendanceId: string) {
  const rows = await db
    .select({ id: attendanceNewComers.newComerId })
    .from(attendanceNewComers)
    .where(eq(attendanceNewComers.attendanceId, attendanceId))
  return rows.map((r) => r.id)
}

export async function memberIdsAt(attendanceId: string) {
  const rows = await db
    .select({ id: attendanceDisciples.discipleId })
    .from(attendanceDisciples)
    .where(eq(attendanceDisciples.attendanceId, attendanceId))
  return rows.map((r) => r.id)
}
