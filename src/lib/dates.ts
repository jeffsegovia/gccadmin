/* Dates. The church is in the Philippines, so "today", weeks and months
   follow Manila time. Two kinds of stored timestamps:
   - instants (a cell group at 7:30 PM): shown in Manila time;
   - calendar days (a service's date): stored as UTC midnight of that day,
     as v2 did, and shown in UTC so they never slip a day. */

export const TIME_ZONE = 'Asia/Manila'

/** YYYY-MM-DD of an instant, in Manila. */
export function manilaDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** A calendar day (YYYY-MM-DD) as stored: UTC midnight. */
export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`)
}

/** The calendar day a stored day-timestamp stands for. */
export function dateToDay(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10)
}

export function addDays(day: string, days: number): string {
  const d = dayToDate(day)
  d.setUTCDate(d.getUTCDate() + days)
  return dateToDay(d)
}

/** Monday of the week holding `day` (weeks run Monday to Sunday). */
export function weekStart(day: string): string {
  const d = dayToDate(day)
  const dow = (d.getUTCDay() + 6) % 7
  return addDays(day, -dow)
}

export function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`
}

export function monthEnd(day: string): string {
  const d = dayToDate(monthStart(day))
  d.setUTCMonth(d.getUTCMonth() + 1)
  d.setUTCDate(0)
  return dateToDay(d)
}

/** The instant a Manila calendar day starts. */
export function manilaDayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000+08:00`)
}

const fmt = (options: Intl.DateTimeFormatOptions, utc: boolean) =>
  new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: utc ? 'UTC' : TIME_ZONE,
  })

/** "Nov 30" (a calendar day). */
export function shortDay(date: Date | string): string {
  return fmt({ month: 'short', day: 'numeric' }, true).format(new Date(date))
}

/** "Sun, Nov 30, 2026" (a calendar day). */
export function longDay(date: Date | string): string {
  return fmt(
    { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
    true,
  ).format(new Date(date))
}

/** "Sun, Nov 30" (a calendar day), for a headline where the year is
 * plain. */
export function weekdayDay(date: Date | string): string {
  return fmt({ weekday: 'short', month: 'short', day: 'numeric' }, true).format(
    new Date(date),
  )
}

/** Whole days from `from` to `to` (calendar days, so no time-zone drift):
 * 0 is the same day, 1 is the next. */
export function daysBetween(from: string, to: Date | string): number {
  return Math.round(
    (dayToDate(dateToDay(to)).getTime() - dayToDate(from).getTime()) /
      86_400_000,
  )
}

/** "Nov 26" in Manila (an instant). */
export function shortDate(date: Date | string): string {
  return fmt({ month: 'short', day: 'numeric' }, false).format(new Date(date))
}

/** "Wed, Nov 26 · 7:30 PM" in Manila (an instant). */
export function dateTime(date: Date | string): string {
  const d = new Date(date)
  const day = fmt(
    { weekday: 'short', month: 'short', day: 'numeric' },
    false,
  ).format(d)
  const time = fmt({ hour: 'numeric', minute: '2-digit' }, false).format(d)
  return `${day} · ${time}`
}

/** "November 2026" for a YYYY-MM-DD. */
export function monthLabel(day: string): string {
  return fmt({ month: 'long', year: 'numeric' }, true).format(dayToDate(day))
}

/** For an <input type="datetime-local">: Manila wall time of an instant. */
export function toLocalInput(date: Date | string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(date))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

/** The instant of a Manila wall time from <input type="datetime-local">. */
export function fromLocalInput(value: string): Date {
  return new Date(`${value}:00.000+08:00`)
}

/** Whole years between a birthdate and today. */
export function ageOn(birthdate: Date | string, today = new Date()): number {
  const b = new Date(birthdate)
  let age = today.getUTCFullYear() - b.getUTCFullYear()
  const m = today.getUTCMonth() - b.getUTCMonth()
  if (m < 0 || (m === 0 && today.getUTCDate() < b.getUTCDate())) age--
  return age
}

/** "3 months ago", "yesterday" (v2's date distance). */
export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const seconds = (new Date(date).getTime() - now.getTime()) / 1000
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, size] of units)
    if (Math.abs(seconds) >= size)
      return rtf.format(Math.round(seconds / size), unit)
  return 'just now'
}
