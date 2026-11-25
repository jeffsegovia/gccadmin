import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import { disciples, processLevel } from '@/db/schema'
import { requireAccess, seesEveryone } from '@/server/auth/access.server'

const leader = alias(disciples, 'leader')

/** The Growth Process System: how many are at each step, and who. */
export const getGrowth = createServerFn({ method: 'GET' })
  .validator(z.object({ level: z.enum(processLevel.enumValues).optional() }))
  .handler(async ({ data }) => {
    const access = await requireAccess()
    const me = access.disciple?.id
    const scope = seesEveryone(access)
      ? undefined
      : me
        ? or(eq(disciples.leaderId, me), eq(disciples.handledById, me))
        : sql`false`
    const base = and(
      eq(disciples.isDeleted, false),
      eq(disciples.isActive, true),
      scope,
    )
    const counts = await db
      .select({
        level: disciples.processLevel,
        status: disciples.processLevelStatus,
        n: count(),
      })
      .from(disciples)
      .where(base)
      .groupBy(disciples.processLevel, disciples.processLevelStatus)
    const level = data.level ?? 'ENCOUNTER'
    const people = await db
      .select({
        id: disciples.id,
        name: disciples.name,
        gender: disciples.gender,
        status: disciples.processLevelStatus,
        leaderName: leader.name,
      })
      .from(disciples)
      .leftJoin(leader, eq(leader.id, disciples.leaderId))
      .where(and(base, eq(disciples.processLevel, level)))
      .orderBy(asc(disciples.processLevelStatus), asc(disciples.name))
      .limit(500)
    return { counts, level, people, everyone: seesEveryone(access) }
  })
