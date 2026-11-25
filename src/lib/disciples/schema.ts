import { z } from 'zod'
import {
  cellStatus,
  churchStatus,
  gender,
  memberType,
  processLevel,
  processLevelStatus,
} from '@/db/schema'

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Pick a date' })

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))

/** A disciple's details, shared by the form and the server. */
export const discipleSchema = z.object({
  name: z.string().trim().min(1, { message: 'Enter their name' }).max(120),
  address: z
    .string()
    .trim()
    .min(1, { message: 'Enter their address' })
    .max(300),
  birthdate: day,
  gender: z.enum(gender.enumValues),
  contactNo: z.string().trim().max(40).optional(),
  memberType: z.enum(memberType.enumValues),
  cellStatus: z.enum(cellStatus.enumValues),
  churchStatus: z.enum(churchStatus.enumValues),
  processLevel: z.enum(processLevel.enumValues),
  processLevelStatus: z.enum(processLevelStatus.enumValues),
  /** An assistant leader: someone the network leader trusts to handle
   * disciples (v2's "isMyPrimary"). */
  isMyPrimary: z.boolean().default(false),
  handledById: optionalId,
  /** Admins pick the network; a leader's disciples join their own. */
  leaderId: optionalId,
})
export type DiscipleInput = z.input<typeof discipleSchema>

/** A disciple added from someone's own page (the portal): their leader's
 * network, handled by them; the Growth Process starts at None. */
export const portalDiscipleSchema = discipleSchema.pick({
  name: true,
  address: true,
  birthdate: true,
  gender: true,
  contactNo: true,
  memberType: true,
  cellStatus: true,
  churchStatus: true,
})
export type PortalDiscipleInput = z.input<typeof portalDiscipleSchema>

export const discipleIdSchema = z.object({ id: z.string().min(1) })

export const listDisciplesSchema = z.object({
  scope: z.enum(['mine', 'all']).optional(),
  q: z.string().optional(),
  status: z.enum(['active', 'inactive', 'assistants']).optional(),
  memberType: z.array(z.enum(memberType.enumValues)).optional(),
  churchStatus: z.array(z.enum(churchStatus.enumValues)).optional(),
  cellStatus: z.array(z.enum(cellStatus.enumValues)).optional(),
  processLevel: z.array(z.enum(processLevel.enumValues)).optional(),
  leader: z.string().optional(),
  handledBy: z.string().optional(),
  sort: z.enum(['name', 'newest', 'process']).optional(),
  page: z.number().int().min(1).optional(),
})
export type DisciplesSearch = z.infer<typeof listDisciplesSchema>

export const PAGE_SIZE = 25

/** One row of the import template (public/disciple-template.xlsx). */
export const importRowSchema = discipleSchema.omit({ leaderId: true }).extend({
  isMyPrimary: z.boolean().default(false),
})
