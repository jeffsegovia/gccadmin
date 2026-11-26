import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import {
  attendanceDisciples,
  attendances,
  disciplePortalLinks,
  disciples,
} from '@/db/schema'
import type { Access } from '@/server/auth/access.server'
import { seesEveryone } from '@/server/auth/access.server'
import { PAGE_SIZE } from '@/lib/disciples/schema'
import type { DisciplesSearch } from '@/lib/disciples/schema'

const leader = alias(disciples, 'leader')
const handler = alias(disciples, 'handler')

/** `%term%` with LIKE's own characters taken literally. */
export function likeTerm(q: string) {
  return `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

/** The last four Sunday services, newest first. */
const lastFourSundays = sql`select ${attendances.id} from ${attendances} where ${attendances.type} = 'SUNDAY_SERVICE' and ${attendances.date} < now() order by ${attendances.date} desc limit 4`

/** Missing from each of the last four Sunday services (and there have been
 * four), so who a leader should call. Shared by Home's count and the list. */
export const awayFromSunday = sql`(select count(*) from (${lastFourSundays}) f) = 4 and not exists (select 1 from ${attendanceDisciples} ad where ad."B" = ${disciples.id} and ad."A" in (${lastFourSundays}))`

/** The day this disciple was last marked present at a Sunday service. */
export const lastSundayAt = sql<Date | null>`(select max(a.date) from ${attendanceDisciples} ad join ${attendances} a on a.id = ad."A" where ad."B" = ${disciples.id} and a.type = 'SUNDAY_SERVICE')`

export function disciplesWhere(access: Access, s: DisciplesSearch) {
  const all = seesEveryone(access)
  const scope = s.scope ?? (all ? 'all' : 'mine')
  const parts: Array<SQL | undefined> = [eq(disciples.isDeleted, false)]
  // A leader only ever sees their own network.
  if (scope === 'mine' || !all) {
    const mine = access.disciple?.id
    parts.push(
      mine
        ? or(eq(disciples.leaderId, mine), eq(disciples.handledById, mine))
        : sql`false`,
    )
  }
  if (s.leader && all) parts.push(eq(disciples.leaderId, s.leader))
  if (s.handledBy) parts.push(eq(disciples.handledById, s.handledBy))
  if (s.status === 'inactive') parts.push(eq(disciples.isActive, false))
  else parts.push(eq(disciples.isActive, true))
  if (s.status === 'assistants')
    parts.push(
      or(eq(disciples.isPrimary, true), eq(disciples.isMyPrimary, true)),
    )
  if (s.away) parts.push(eq(disciples.isPrimary, false), awayFromSunday)
  if (s.q?.trim()) parts.push(ilike(disciples.name, likeTerm(s.q)))
  if (s.memberType?.length)
    parts.push(inArray(disciples.memberType, s.memberType))
  if (s.churchStatus?.length)
    parts.push(inArray(disciples.churchStatus, s.churchStatus))
  if (s.cellStatus?.length)
    parts.push(inArray(disciples.cellStatus, s.cellStatus))
  if (s.processLevel?.length)
    parts.push(inArray(disciples.processLevel, s.processLevel))
  return and(...parts)
}

export const discipleRowSelect = {
  id: disciples.id,
  name: disciples.name,
  gender: disciples.gender,
  birthdate: disciples.birthdate,
  memberType: disciples.memberType,
  churchStatus: disciples.churchStatus,
  cellStatus: disciples.cellStatus,
  processLevel: disciples.processLevel,
  processLevelStatus: disciples.processLevelStatus,
  isPrimary: disciples.isPrimary,
  isMyPrimary: disciples.isMyPrimary,
  isActive: disciples.isActive,
  address: disciples.address,
  contactNo: disciples.contactNo,
  leaderId: disciples.leaderId,
  leaderName: leader.name,
  handledById: disciples.handledById,
  handledByName: handler.name,
  portalEnabled: disciplePortalLinks.isEnabled,
  portalOpenedAt: disciplePortalLinks.lastOpenedAt,
  lastSunday: lastSundayAt.as('lastSunday'),
}

export async function listDisciples(
  access: Access,
  s: DisciplesSearch,
  all = false,
) {
  const where = disciplesWhere(access, s)
  const order =
    s.sort === 'lastSeen'
      ? [sql`${lastSundayAt} asc nulls first`, asc(disciples.name)]
      : s.sort === 'newest'
        ? [desc(disciples.createdAt)]
        : s.sort === 'process'
          ? [desc(disciples.processLevel), asc(disciples.name)]
          : [desc(disciples.isPrimary), asc(disciples.name)]
  const page = s.page ?? 1
  const base = db
    .select(discipleRowSelect)
    .from(disciples)
    .leftJoin(leader, eq(leader.id, disciples.leaderId))
    .leftJoin(handler, eq(handler.id, disciples.handledById))
    .leftJoin(
      disciplePortalLinks,
      eq(disciplePortalLinks.discipleId, disciples.id),
    )
    .where(where)
    .orderBy(...order)
  const rows = all
    ? await base
    : await base.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
  const [{ total }] = await db
    .select({ total: count() })
    .from(disciples)
    .where(where)
  return { rows, total, page, pageSize: PAGE_SIZE }
}

export type DiscipleRow = Awaited<
  ReturnType<typeof listDisciples>
>['rows'][number]

/** Primary leaders (network heads), for filters and pickers. */
export async function listLeaders() {
  return db
    .select({
      id: disciples.id,
      name: disciples.name,
      gender: disciples.gender,
    })
    .from(disciples)
    .where(
      and(
        eq(disciples.isPrimary, true),
        eq(disciples.isDeleted, false),
        eq(disciples.isActive, true),
      ),
    )
    .orderBy(asc(disciples.name))
}

/** People who can handle disciples in a network: its assistant leaders. */
export async function listAssistants(leaderId: string | undefined) {
  if (!leaderId) return []
  return db
    .select({ id: disciples.id, name: disciples.name })
    .from(disciples)
    .where(
      and(
        eq(disciples.leaderId, leaderId),
        eq(disciples.isMyPrimary, true),
        eq(disciples.isPrimary, false),
        eq(disciples.isDeleted, false),
      ),
    )
    .orderBy(asc(disciples.name))
}

/** Everyone who handles a disciple in what this viewer can see, for v2's
 * "Handled By" filter. */
export async function listHandlers(access: Access) {
  const mine = access.disciple?.id
  return db
    .selectDistinct({ id: handler.id, name: handler.name })
    .from(disciples)
    .innerJoin(handler, eq(handler.id, disciples.handledById))
    .where(
      and(
        eq(disciples.isDeleted, false),
        seesEveryone(access)
          ? undefined
          : mine
            ? or(eq(disciples.leaderId, mine), eq(disciples.handledById, mine))
            : sql`false`,
      ),
    )
    .orderBy(asc(handler.name))
}
