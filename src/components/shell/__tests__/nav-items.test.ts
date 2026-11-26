import { describe, expect, it } from 'vitest'
import { PHONE_TABS, isActive } from '../nav-items'

describe('phone tabs', () => {
  const on = (path: string) =>
    PHONE_TABS.filter((t) => isActive(t, path)).map((t) => t.label)

  it('puts Attendance one tap away and Insights in More', () => {
    expect(PHONE_TABS.map((t) => t.label)).toEqual([
      'Home',
      'Disciples',
      'Attendance',
      'Reports',
    ])
    expect(on('/insights')).toEqual([])
  })

  it('keeps Reports lit on soul winning pages', () => {
    expect(on('/soul-winning')).toEqual(['Reports'])
    expect(on('/reports/abc')).toEqual(['Reports'])
  })
})
