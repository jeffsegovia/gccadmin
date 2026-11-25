import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

/* The tables Prisma made, mapped as they are: PascalCase table names,
   camelCase columns, Prisma's enum types and its implicit many-to-many
   join tables (`_AttendanceToDisciple` and friends, columns "A" and "B",
   A being the model whose name sorts first). Nothing here renames or
   drops anything, so the old app and this one can read the same database
   during the switch. New tables and columns come from `migrations/`
   (`pnpm db:migrate`), never from Prisma. */

export const role = pgEnum('Role', ['USER', 'ADMIN'])
export const gender = pgEnum('Gender', ['MALE', 'FEMALE'])
export const memberType = pgEnum('MemberType', [
  'UNCATEGORIZED',
  'KIDS',
  'MEN',
  'WOMEN',
  'YOUTH',
  'YOUNGPRO',
])
export const churchStatus = pgEnum('ChurchStatus', ['NACS', 'ACS', 'REGULAR'])
export const cellStatus = pgEnum('CellStatus', [
  'FIRST_TIMER',
  'SECOND_TIMER',
  'THIRD_TIMER',
  'REGULAR',
])
export const processLevel = pgEnum('ProcessLevel', [
  'NONE',
  'PREENC',
  'ENCOUNTER',
  'LEADERSHIP_1',
  'LEADERSHIP_2',
  'LEADERSHIP_3',
])
export const cellType = pgEnum('CellType', [
  'SOULWINNING',
  'OPEN',
  'DISCIPLESHIP',
])
export const processLevelStatus = pgEnum('ProcessLevelStatus', [
  'NOT_STARTED',
  'ON_GOING',
  'PENDING_REQUIREMENTS',
  'FINISHED',
  'UNFINISHED',
  'DROPPED',
])
export const attendanceType = pgEnum('AttendanceType', [
  'SUNDAY_SERVICE',
  'EVENT',
])
export const soulWinningReportType = pgEnum('SoulWinningReportType', [
  'SOUL_WINNING',
  'CONSOLIDATION',
])

// Prisma's `@default(cuid())` and `@updatedAt` live in the client, not the
// database, so they are done here too.
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => createId())
const createdAt = () =>
  timestamp('createdAt', { precision: 3 }).defaultNow().notNull()
const updatedAt = () =>
  timestamp('updatedAt', { precision: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())

export const users = pgTable('User', {
  id: id(),
  clerkId: text('clerkId').notNull().unique('User_clerkId_key'),
  email: text('email').notNull().unique('User_email_key'),
  name: text('name').notNull(),
  role: role('role').notNull().default('USER'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const disciples = pgTable(
  'Disciple',
  {
    id: id(),
    // The disciple's sign-in: a Clerk user id (`User.clerkId`).
    userAccountId: text('userAccountId'),
    name: text('name').notNull(),
    address: text('address').notNull(),
    birthdate: timestamp('birthdate', { precision: 3 }).notNull(),
    gender: gender('gender').notNull(),
    // Added by migrations/0001: the portal's "Fix your details".
    contactNo: text('contactNo'),
    isPrimary: boolean('isPrimary').notNull().default(false),
    isActive: boolean('isActive').notNull().default(true),
    isDeleted: boolean('isDeleted').notNull().default(false),
    isMyPrimary: boolean('isMyPrimary').notNull().default(false),
    leaderId: text('leaderId'),
    memberType: memberType('memberType').notNull().default('UNCATEGORIZED'),
    processLevel: processLevel('processLevel').notNull().default('NONE'),
    cellStatus: cellStatus('cellStatus').notNull().default('FIRST_TIMER'),
    churchStatus: churchStatus('churchStatus').notNull().default('NACS'),
    processLevelStatus: processLevelStatus('processLevelStatus')
      .notNull()
      .default('NOT_STARTED'),
    handledById: text('handledById'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('Disciple_leaderId_idx').on(t.leaderId),
    index('Disciple_handledById_idx').on(t.handledById),
  ],
)

export const lessonSeries = pgTable('LessonSeries', {
  id: id(),
  title: text('title').notNull(),
  description: text('description'),
  tags: text('tags').array(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const lessons = pgTable('Lesson', {
  id: id(),
  lessonSeriesId: text('lessonSeriesId')
    .notNull()
    .references(() => lessonSeries.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  fileUrl: text('fileUrl'),
  scriptureReferences: text('scriptureReferences').array(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const cellReports = pgTable('CellReport', {
  id: id(),
  type: cellType('type').notNull().default('OPEN'),
  venue: text('venue').notNull(),
  date: timestamp('date', { precision: 3 }).notNull(),
  lessonId: text('lessonId'),
  lessonTitle: text('lessonTitle'),
  hasCustomLesson: boolean('hasCustomLesson').notNull().default(false),
  scriptureReferences: text('scriptureReferences').array(),
  assistantId: text('assistantId'),
  leaderId: text('leaderId').notNull(),
  worship: text('worship').array(),
  work: text('work').array(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const cellReportAttendeeSnapshots = pgTable(
  'CellReportAttendeeSnapshot',
  {
    id: id(),
    name: text('name').notNull(),
    status: cellStatus('status').notNull(),
    churchStatus: churchStatus('churchStatus').notNull(),
    discipleId: text('discipleId').notNull(),
    cellReportId: text('cellReportId')
      .notNull()
      .references(() => cellReports.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
)

/** Who came to a cell group: A is the report, B the disciple. */
export const attendedCellGroups = pgTable(
  '_attendedCellGroups',
  {
    cellReportId: text('A').notNull(),
    discipleId: text('B').notNull(),
  },
  (t) => [primaryKey({ columns: [t.cellReportId, t.discipleId] })],
)

export const processLessonSeries = pgTable('ProcessLessonSeries', {
  id: id(),
  title: text('title').notNull(),
  description: text('description'),
  tags: text('tags').array(),
  processLevel: processLevel('processLevel').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const processLessons = pgTable('ProcessLesson', {
  id: id(),
  title: text('title').notNull(),
  description: text('description'),
  fileUrl: text('fileUrl'),
  scriptureReferences: text('scriptureReferences').array(),
  processLessonSeriesId: text('processLessonSeriesId').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const attendances = pgTable('Attendance', {
  id: id(),
  title: text('title').notNull(),
  date: timestamp('date', { precision: 3 }).notNull(),
  type: attendanceType('type').notNull().default('SUNDAY_SERVICE'),
  tags: text('tags').array(),
  isLocked: boolean('isLocked').default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

/** Members present at a service: A is the service, B the disciple. One
 * row per person, added or removed one tap at a time. */
export const attendanceDisciples = pgTable(
  '_AttendanceToDisciple',
  {
    attendanceId: text('A').notNull(),
    discipleId: text('B').notNull(),
  },
  (t) => [primaryKey({ columns: [t.attendanceId, t.discipleId] })],
)

/** A guest (not a disciple yet). Whether they are a first-timer at a given
 * service is worked out from their earliest service, never stored. */
export const newComers = pgTable('NewComer', {
  id: id(),
  name: text('name').notNull(),
  gender: gender('gender').notNull(),
  memberType: memberType('memberType').notNull().default('UNCATEGORIZED'),
  contactNo: text('contactNo'),
  email: text('email'),
  address: text('address'),
  invitedById: text('invitedById'),
  discipleProfileId: text('discipleProfileId'),
  attendedAt: timestamp('attendedAt', { precision: 3 }).defaultNow().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

/** Guests present at a service: A is the service, B the guest. */
export const attendanceNewComers = pgTable(
  '_AttendanceToNewComer',
  {
    attendanceId: text('A').notNull(),
    newComerId: text('B').notNull(),
  },
  (t) => [primaryKey({ columns: [t.attendanceId, t.newComerId] })],
)

export const newBelievers = pgTable('NewBeliever', {
  id: id(),
  name: text('name').notNull(),
  gender: gender('gender').notNull(),
  memberType: memberType('memberType').notNull().default('UNCATEGORIZED'),
  networkLeaderId: text('networkLeaderId').notNull(),
  handledById: text('handledById'),
  contactNo: text('contactNo'),
  email: text('email'),
  address: text('address'),
  discipleProfileId: text('discipleProfileId'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const soulWinningReports = pgTable('SoulWinningReport', {
  id: id(),
  venue: text('venue').notNull(),
  date: timestamp('date', { precision: 3 }).notNull(),
  type: soulWinningReportType('type').notNull().default('SOUL_WINNING'),
  lessonId: text('lessonId').notNull(),
  networkLeaderId: text('networkLeaderId').notNull(),
  assistantLeaderId: text('assistantLeaderId'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

/** New believers at a soul-winning session: A the believer, B the report. */
export const soulWinningNewBelievers = pgTable(
  '_NewBelieverToSoulWinningReport',
  {
    newBelieverId: text('A').notNull(),
    reportId: text('B').notNull(),
  },
  (t) => [primaryKey({ columns: [t.newBelieverId, t.reportId] })],
)

/* ---- Added by GCC Admin v3 (migrations/0001) ---- */

/** A non-primary disciple's own page, opened with a link and no sign-in.
 * The token is the key, like a shared document's link: anyone holding it
 * sees that one disciple's page. Their leader makes it, and making a new
 * one (or turning it off) stops the old link at once. */
export const disciplePortalLinks = pgTable(
  'DisciplePortalLink',
  {
    id: id(),
    discipleId: text('discipleId')
      .notNull()
      .references(() => disciples.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    createdById: text('createdById'),
    isEnabled: boolean('isEnabled').notNull().default(true),
    lastOpenedAt: timestamp('lastOpenedAt', { precision: 3 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('DisciplePortalLink_discipleId_key').on(t.discipleId),
    uniqueIndex('DisciplePortalLink_token_key').on(t.token),
  ],
)

/** Emails sent on request (migrations/0003_email_log.sql). `key` is what
 * the email is about: a leader's id, or the week of a summary. */
export const emailLogs = pgTable(
  'EmailLog',
  {
    id: id(),
    kind: text('kind').notNull(),
    key: text('key').notNull(),
    recipient: text('recipient').notNull(),
    sentById: text('sentById'),
    sentAt: timestamp('sentAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index('EmailLog_kind_key_sentAt_idx').on(t.kind, t.key, t.sentAt)],
)

export type Disciple = typeof disciples.$inferSelect
export type Gender = (typeof gender.enumValues)[number]
export type MemberType = (typeof memberType.enumValues)[number]
export type ChurchStatus = (typeof churchStatus.enumValues)[number]
export type CellStatus = (typeof cellStatus.enumValues)[number]
export type ProcessLevel = (typeof processLevel.enumValues)[number]
export type ProcessLevelStatus = (typeof processLevelStatus.enumValues)[number]
export type CellType = (typeof cellType.enumValues)[number]
export type AttendanceType = (typeof attendanceType.enumValues)[number]
export type SoulWinningReportType =
  (typeof soulWinningReportType.enumValues)[number]
