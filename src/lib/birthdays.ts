import { addDays, weekStart } from '@/lib/dates'

/** The seven calendar days (YYYY-MM-DD) of the Monday-to-Sunday week
 * holding `day`, each with its month-day key ("11-26"). In a year with no
 * Feb 29, people born on Feb 29 celebrate on Feb 28. */
export function birthdayWeek(
  day: string,
): Array<{ date: string; keys: Array<string> }> {
  const monday = weekStart(day)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    const key = date.slice(5)
    const year = Number(date.slice(0, 4))
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    return { date, keys: key === '02-28' && !leap ? ['02-28', '02-29'] : [key] }
  })
}

/** How old someone turns on `date` (YYYY-MM-DD). */
export function turningAge(birthdate: Date | string, date: string): number {
  return Number(date.slice(0, 4)) - new Date(birthdate).getUTCFullYear()
}
