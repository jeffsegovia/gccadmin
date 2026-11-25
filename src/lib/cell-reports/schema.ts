import { z } from 'zod'
import { cellType } from '@/db/schema'

/** A cell group report, shared by the form, the portal and the server.
 * `date` is Manila wall time from <input type="datetime-local">. */
export const cellReportSchema = z
  .object({
    type: z.enum(cellType.enumValues),
    venue: z
      .string()
      .trim()
      .min(1, { message: 'Where did you meet?' })
      .max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, {
      message: 'Pick the date and time',
    }),
    lessonId: z.string().optional(),
    lessonTitle: z.string().trim().max(200).optional(),
    scriptureReferences: z
      .array(z.string().trim().min(1).max(80))
      .max(10)
      .default([]),
    assistantId: z.string().optional(),
    leaderId: z.string().optional(),
    attendees: z
      .array(z.string())
      .min(1, { message: 'Tick at least one person who came' }),
    worship: z.array(z.string().trim().min(1).max(120)).max(10).default([]),
    work: z.array(z.string().trim().min(1).max(200)).max(10).default([]),
  })
  .refine((v) => !!v.lessonId || !!v.lessonTitle?.trim(), {
    message: 'Choose a lesson or type your own',
    path: ['lessonId'],
  })
export type CellReportInput = z.input<typeof cellReportSchema>

export const REPORT_RANGES = [
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'all',
] as const
export type ReportRange = (typeof REPORT_RANGES)[number]

export const RANGE_LABEL: Record<ReportRange, string> = {
  this_week: 'This week',
  last_week: 'Last week',
  this_month: 'This month',
  last_month: 'Last month',
  all: 'All time',
}

export const listReportsSchema = z.object({
  range: z.enum(REPORT_RANGES).optional(),
  mine: z.boolean().optional(),
  leader: z.string().optional(),
  type: z.enum(cellType.enumValues).optional(),
  page: z.number().int().min(1).optional(),
})
export type ReportsSearch = z.infer<typeof listReportsSchema>

/** Comma or line separated words to a clean list. */
export function splitList(text: string): Array<string> {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** A saved report as the form's values (dates in Manila wall time). */
export function reportToForm(
  r: {
    type: CellReportInput['type']
    venue: string
    date: Date | string
    lessonId: string | null
    lessonTitle: string | null
    scriptureReferences: Array<string> | null
    assistantId: string | null
    leaderId: string
    worship: Array<string> | null
    work: Array<string> | null
  },
  attendees: Array<string>,
  toLocal: (d: Date | string) => string,
): CellReportInput {
  return {
    type: r.type,
    venue: r.venue,
    date: toLocal(r.date),
    lessonId: r.lessonId ?? undefined,
    lessonTitle: r.lessonTitle ?? undefined,
    scriptureReferences: r.scriptureReferences ?? [],
    assistantId: r.assistantId ?? undefined,
    leaderId: r.leaderId,
    attendees,
    worship: r.worship ?? [],
    work: r.work ?? [],
  }
}
