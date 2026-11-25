import { and, eq, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { disciples } from '@/db/schema'
import { birthdayWeek, turningAge } from '@/lib/birthdays'

/** Birthdays this week (Monday to Sunday, Manila), soonest first: the
 * whole church, or a leader's network (led or handled by them). Home and
 * Insights both show it. */
export async function weekBirthdays(
  today: string,
  scope: { everyone: boolean; me: string | null },
) {
  const week = birthdayWeek(today)
  const keys = week.flatMap((d) => d.keys)
  const monthDay = sql<string>`to_char(${disciples.birthdate}, 'MM-DD')`
  const born = await db
    .select({
      id: disciples.id,
      name: disciples.name,
      gender: disciples.gender,
      birthdate: disciples.birthdate,
      key: monthDay,
    })
    .from(disciples)
    .where(
      and(
        eq(disciples.isDeleted, false),
        eq(disciples.isActive, true),
        scope.everyone
          ? undefined
          : scope.me
            ? or(
                eq(disciples.leaderId, scope.me),
                eq(disciples.handledById, scope.me),
              )
            : sql`false`,
        inArray(monthDay, keys),
      ),
    )
  return born
    .map((b) => {
      const date = week.find((d) => d.keys.includes(b.key))!.date
      return {
        id: b.id,
        name: b.name,
        gender: b.gender,
        date,
        turns: turningAge(b.birthdate, date),
      }
    })
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
    )
}
