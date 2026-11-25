import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import {
  attendanceDisciples,
  attendanceNewComers,
  attendances,
  disciples,
  newComers,
} from '@/db/schema'
import { AccessError, requireAccess } from '@/server/auth/access.server'
import { dayToDate } from '@/lib/dates'
import { guestSchema, serviceSchema, syncSchema } from '@/lib/attendance/schema'
import {
  findService,
  guestIdsAt,
  listGuests,
  listServices,
  memberIdsAt,
  sheetGuests,
  sheetMembers,
} from './attendance.queries'

export const getServices = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().optional() }))
  .handler(async ({ data }) => {
    await requireAccess()
    return listServices(data.q)
  })

export const createService = createServerFn({ method: 'POST' })
  .validator(serviceSchema)
  .handler(async ({ data }) => {
    await requireAccess()
    const [row] = await db
      .insert(attendances)
      .values({
        title: data.title,
        type: data.type,
        date: dayToDate(data.date),
        tags: data.tags,
      })
      .returning({ id: attendances.id })
    return row
  })

export const updateService = createServerFn({ method: 'POST' })
  .validator(serviceSchema.extend({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireAccess()
    await db
      .update(attendances)
      .set({
        title: data.title,
        type: data.type,
        date: dayToDate(data.date),
        tags: data.tags,
      })
      .where(eq(attendances.id, data.id))
  })

/** Deletes the service and its marks. Guests stay (they may have come to
 * other services); one whose only service this was goes too. */
export const deleteService = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const service = await findService(data.id)
    if (!service) return
    if (service.isLocked && !access.isAdmin)
      throw new AccessError('This service is closed. Ask an admin to open it.')
    await db.transaction(async (tx) => {
      const guestIds = (
        await tx
          .select({ id: attendanceNewComers.newComerId })
          .from(attendanceNewComers)
          .where(eq(attendanceNewComers.attendanceId, data.id))
      ).map((r) => r.id)
      await tx.delete(attendances).where(eq(attendances.id, data.id))
      if (guestIds.length) {
        const stillSeen = new Set(
          (
            await tx
              .select({ id: attendanceNewComers.newComerId })
              .from(attendanceNewComers)
              .where(inArray(attendanceNewComers.newComerId, guestIds))
          ).map((r) => r.id),
        )
        const orphans = guestIds.filter((id) => !stillSeen.has(id))
        if (orphans.length)
          await tx.delete(newComers).where(
            and(
              inArray(newComers.id, orphans),
              // Never one who became a disciple.
              isNull(newComers.discipleProfileId),
            ),
          )
      }
    })
  })

/** Closing locks the sheet for everyone, on the server: marks sent after
 * are refused. Only admins reopen. */
export const setServiceLocked = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string(), isLocked: z.boolean() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    if (!data.isLocked && !access.isAdmin)
      throw new AccessError('Only an admin can reopen a closed service.')
    await db
      .update(attendances)
      .set({ isLocked: data.isLocked })
      .where(eq(attendances.id, data.id))
  })

/** Everything the sheet needs, also kept on the device for offline use. */
export const getSheet = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const service = await findService(data.id)
    if (!service) throw new AccessError('That service isn’t here anymore.')
    const [members, guests, inviters] = await Promise.all([
      sheetMembers(service.id),
      sheetGuests(service.id, service.date),
      db
        .select({ id: disciples.id, name: disciples.name })
        .from(disciples)
        .where(
          and(eq(disciples.isDeleted, false), eq(disciples.isActive, true)),
        )
        .orderBy(disciples.name),
    ])
    return {
      service: {
        id: service.id,
        title: service.title,
        date: service.date.toISOString(),
        type: service.type,
        tags: service.tags ?? [],
        isLocked: !!service.isLocked,
      },
      members: members.map((m) => ({ ...m, present: !!m.present })),
      guestsHere: guests.present,
      guestsBefore: guests.before.map((g) => ({
        ...g,
        firstDate: new Date(g.firstDate).toISOString(),
        lastDate: new Date(g.lastDate).toISOString(),
      })),
      inviters,
      isAdmin: access.isAdmin,
      loadedAt: new Date().toISOString(),
    }
  })

export type Sheet = Awaited<ReturnType<typeof getSheet>>

/** Applies the device's marks and new guests. Safe to repeat: marking
 * someone present twice is one row, unmarking someone absent changes
 * nothing, and a guest's id comes from the device. One person changes at
 * a time, so a filter or a tab can never drop anyone (v2 replaced the
 * whole list on Save). */
export const syncAttendance = createServerFn({ method: 'POST' })
  .validator(syncSchema)
  .handler(async ({ data }) => {
    await requireAccess()
    const service = await findService(data.attendanceId)
    if (!service) throw new AccessError('That service isn’t here anymore.')
    if (service.isLocked)
      throw new AccessError(
        'This service was closed, so these marks weren’t saved.',
      )
    await db.transaction(async (tx) => {
      if (data.guests.length) {
        await tx
          .insert(newComers)
          .values(
            data.guests.map((g) => ({
              id: g.id,
              name: g.name,
              gender: g.gender,
              memberType: g.memberType,
              invitedById: g.invitedById || null,
              contactNo: g.contactNo || null,
              email: g.email || null,
              address: g.address || null,
              attendedAt: service.date,
            })),
          )
          .onConflictDoNothing()
      }
      const add = (kind: 'member' | 'guest') =>
        data.marks.filter((m) => m.kind === kind && m.present).map((m) => m.id)
      const remove = (kind: 'member' | 'guest') =>
        data.marks.filter((m) => m.kind === kind && !m.present).map((m) => m.id)
      const memberAdds = add('member')
      if (memberAdds.length)
        await tx
          .insert(attendanceDisciples)
          .values(
            memberAdds.map((id) => ({
              attendanceId: service.id,
              discipleId: id,
            })),
          )
          .onConflictDoNothing()
      const memberRemoves = remove('member')
      if (memberRemoves.length)
        await tx
          .delete(attendanceDisciples)
          .where(
            and(
              eq(attendanceDisciples.attendanceId, service.id),
              inArray(attendanceDisciples.discipleId, memberRemoves),
            ),
          )
      const guestAdds = add('guest')
      if (guestAdds.length)
        await tx
          .insert(attendanceNewComers)
          .values(
            guestAdds.map((id) => ({
              attendanceId: service.id,
              newComerId: id,
            })),
          )
          .onConflictDoNothing()
      const guestRemoves = remove('guest')
      if (guestRemoves.length)
        await tx
          .delete(attendanceNewComers)
          .where(
            and(
              eq(attendanceNewComers.attendanceId, service.id),
              inArray(attendanceNewComers.newComerId, guestRemoves),
            ),
          )
    })
    const [members, guests] = await Promise.all([
      memberIdsAt(service.id),
      guestIdsAt(service.id),
    ])
    return { members, guests, syncedAt: new Date().toISOString() }
  })

export const updateGuest = createServerFn({ method: 'POST' })
  .validator(guestSchema)
  .handler(async ({ data }) => {
    await requireAccess()
    await db
      .update(newComers)
      .set({
        name: data.name,
        gender: data.gender,
        memberType: data.memberType,
        invitedById: data.invitedById || null,
        contactNo: data.contactNo || null,
        email: data.email || null,
        address: data.address || null,
      })
      .where(eq(newComers.id, data.id))
  })

export const getGuests = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().optional() }))
  .handler(async ({ data }) => {
    await requireAccess()
    const rows = await listGuests(data.q)
    return rows.map((r) => ({
      ...r,
      firstDate: r.firstDate ? new Date(r.firstDate).toISOString() : null,
      lastDate: r.lastDate ? new Date(r.lastDate).toISOString() : null,
    }))
  })
