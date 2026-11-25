import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { disciples } from '@/db/schema'
import { requireAccess } from '@/server/auth/access.server'
import { dateToDay, dayToDate } from '@/lib/dates'

/** The signed-in leader's own record (v2's My profile). */
export const getProfile = createServerFn({ method: 'GET' }).handler(
  async () => {
    const access = await requireAccess()
    if (!access.disciple) return null
    const [d] = await db
      .select({
        id: disciples.id,
        name: disciples.name,
        birthdate: disciples.birthdate,
        address: disciples.address,
        contactNo: disciples.contactNo,
        isPrimary: disciples.isPrimary,
      })
      .from(disciples)
      .where(eq(disciples.id, access.disciple.id))
    return d ? { ...d, birthdate: dateToDay(d.birthdate) } : null
  },
)

export const updateProfile = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(1, { message: 'Enter your name' }).max(120),
      birthdate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Pick a date' }),
      address: z
        .string()
        .trim()
        .min(1, { message: 'Enter your address' })
        .max(300),
      contactNo: z.string().trim().max(40),
    }),
  )
  .handler(async ({ data }) => {
    const access = await requireAccess()
    if (!access.disciple)
      throw new Error('Your account isn’t linked to a leader record yet.')
    await db
      .update(disciples)
      .set({
        name: data.name,
        birthdate: dayToDate(data.birthdate),
        address: data.address,
        contactNo: data.contactNo || null,
      })
      .where(eq(disciples.id, access.disciple.id))
  })
