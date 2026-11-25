import { z } from 'zod'
import { gender, memberType, soulWinningReportType } from '@/db/schema'
import { REPORT_RANGES } from '@/lib/cell-reports/schema'

export const newBelieverSchema = z.object({
  name: z.string().trim().min(1, { message: 'Enter their name' }).max(120),
  gender: z.enum(gender.enumValues),
  memberType: z.enum(memberType.enumValues),
  contactNo: z.string().trim().max(40).optional(),
  email: z
    .union([z.literal(''), z.email({ message: 'That email looks wrong' })])
    .optional(),
  address: z.string().trim().max(300).optional(),
})
export type NewBelieverInput = z.input<typeof newBelieverSchema>

const session = {
  venue: z.string().trim().min(1, { message: 'Where was it?' }).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, {
    message: 'Pick the date and time',
  }),
  lessonId: z.string().min(1, { message: 'Choose the lesson' }),
  networkLeaderId: z.string().optional(),
  assistantLeaderId: z.string().optional(),
}

/** A soul-winning session: the souls won are new records. */
export const soulWinningSchema = z.object({
  ...session,
  newBelievers: z
    .array(newBelieverSchema)
    .min(1, { message: 'Add at least one new believer' }),
})

/** A consolidation session: follow-up with believers already won. */
export const consolidationSchema = z.object({
  ...session,
  newBelieverIds: z
    .array(z.string())
    .min(1, { message: 'Tick at least one believer' }),
})

export const listSoulWinningSchema = z.object({
  view: z.enum(['sessions', 'souls']).optional(),
  type: z.enum(soulWinningReportType.enumValues).optional(),
  range: z.enum(REPORT_RANGES).optional(),
  mine: z.boolean().optional(),
  q: z.string().optional(),
  /** Sessions: one network leader's (admins and pastors). Believers: won
   * in that leader's network. */
  leader: z.string().optional(),
  assistant: z.string().optional(),
  /** Believers: who handles them (v2's "Won by"). */
  wonBy: z.string().optional(),
  memberType: z.array(z.enum(memberType.enumValues)).optional(),
  /** Believers: which lessons to track (v2's View). */
  lessons: z.enum(['soul-winning', 'consolidation']).optional(),
  /** Believers: only those at one session (v2's Track). */
  session: z.string().optional(),
  page: z.number().int().min(1).optional(),
})
/** Sessions and believers a page, as v2 paged its tables. */
export const SOUL_PAGE = 25
export type SoulWinningSearch = z.infer<typeof listSoulWinningSchema>
