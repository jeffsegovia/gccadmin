import { z } from 'zod'
import { attendanceType, gender, memberType } from '@/db/schema'

export const serviceSchema = z.object({
  title: z.string().trim().min(1, { message: 'Name the service' }).max(120),
  type: z.enum(attendanceType.enumValues),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Pick a date' }),
  tags: z.array(z.string().trim().min(1).max(40)).max(5).default([]),
})
export type ServiceInput = z.input<typeof serviceSchema>

/** A guest's details. The id is made on the device, so a guest added
 * offline keeps one id however many times the sync is retried. */
export const guestSchema = z.object({
  id: z.string().min(8).max(40),
  name: z.string().trim().min(1, { message: 'Enter their name' }).max(120),
  gender: z.enum(gender.enumValues),
  memberType: z.enum(memberType.enumValues),
  invitedById: z.string().optional().nullable(),
  contactNo: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
})
export type GuestInput = z.infer<typeof guestSchema>

/** One person's mark, as the device last left it. */
export const markSchema = z.object({
  kind: z.enum(['member', 'guest']),
  id: z.string().min(1),
  present: z.boolean(),
})
export type Mark = z.infer<typeof markSchema>

export const syncSchema = z.object({
  attendanceId: z.string().min(1),
  marks: z.array(markSchema).max(2000),
  guests: z.array(guestSchema).max(200),
})
