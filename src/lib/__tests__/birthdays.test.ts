import { describe, expect, it } from 'vitest'
import { birthdayWeek, turningAge } from '../birthdays'

describe('birthdays this week', () => {
  it('runs Monday to Sunday', () => {
    const week = birthdayWeek('2026-11-25') // a Wednesday
    expect(week[0].date).toBe('2026-11-23')
    expect(week[6].date).toBe('2026-11-29')
    expect(week.map((d) => d.keys[0])).toEqual([
      '11-23',
      '11-24',
      '11-25',
      '11-26',
      '11-27',
      '11-28',
      '11-29',
    ])
  })
  it('a Sunday belongs to the week that started the Monday before', () => {
    expect(birthdayWeek('2026-11-29')[0].date).toBe('2026-11-23')
  })
  it('crosses into the new year', () => {
    const week = birthdayWeek('2026-12-30')
    expect(week[6].date).toBe('2027-01-03')
  })
  it('celebrates Feb 29 on Feb 28 when there is none', () => {
    const feb28 = birthdayWeek('2027-02-28').find(
      (d) => d.date === '2027-02-28',
    )!
    expect(feb28.keys).toEqual(['02-28', '02-29'])
    const leap = birthdayWeek('2028-02-28').find(
      (d) => d.date === '2028-02-28',
    )!
    expect(leap.keys).toEqual(['02-28'])
  })
  it('says the age they turn', () => {
    expect(turningAge('1995-11-26T00:00:00.000Z', '2026-11-26')).toBe(31)
  })
})
