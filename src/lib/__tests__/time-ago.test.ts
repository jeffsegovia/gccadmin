import { describe, expect, it } from 'vitest'
import { timeAgo } from '@/lib/dates'

const now = new Date('2026-11-25T12:00:00Z')

describe('timeAgo', () => {
  it('names the largest whole unit', () => {
    expect(timeAgo('2026-08-20T12:00:00Z', now)).toBe('3 months ago')
    expect(timeAgo('2026-11-11T12:00:00Z', now)).toBe('2 weeks ago')
    expect(timeAgo('2026-11-24T12:00:00Z', now)).toBe('yesterday')
    expect(timeAgo('2026-11-25T09:00:00Z', now)).toBe('3 hours ago')
  })
  it('says just now under a minute', () => {
    expect(timeAgo('2026-11-25T11:59:30Z', now)).toBe('just now')
  })
})
