import { describe, expect, it } from 'vitest'
import { cellStatusAfter } from '../status'
import { cellReportSchema, splitList } from '../schema'

describe('cell status', () => {
  it('moves up one step a cell group, up to Regular', () => {
    expect(cellStatusAfter('FIRST_TIMER', false)).toBe('SECOND_TIMER')
    expect(cellStatusAfter('SECOND_TIMER', false)).toBe('THIRD_TIMER')
    expect(cellStatusAfter('THIRD_TIMER', false)).toBe('REGULAR')
    expect(cellStatusAfter('REGULAR', false)).toBe('REGULAR')
  })
  it('keeps someone added today a first-timer at their first cell group', () => {
    expect(cellStatusAfter('FIRST_TIMER', true)).toBe('FIRST_TIMER')
  })
})

describe('cell report form', () => {
  const base = {
    type: 'OPEN' as const,
    venue: 'Reyes residence',
    date: '2026-11-26T19:30',
    attendees: ['a'],
  }
  it('needs a lesson or a lesson of their own', () => {
    expect(cellReportSchema.safeParse(base).success).toBe(false)
    expect(cellReportSchema.safeParse({ ...base, lessonId: 'x' }).success).toBe(
      true,
    )
    // A custom lesson names its scripture, as in v2.
    expect(
      cellReportSchema.safeParse({ ...base, lessonTitle: 'Grace' }).success,
    ).toBe(false)
    expect(
      cellReportSchema.safeParse({
        ...base,
        lessonTitle: 'Grace',
        scriptureReferences: ['Ephesians 2:8-9'],
      }).success,
    ).toBe(true)
  })
  it('needs someone who came', () => {
    expect(
      cellReportSchema.safeParse({ ...base, lessonId: 'x', attendees: [] })
        .success,
    ).toBe(false)
  })
  it('splits songs and work on commas and lines', () => {
    expect(splitList('Way Maker, Goodness of God\nBuild My Life,')).toEqual([
      'Way Maker',
      'Goodness of God',
      'Build My Life',
    ])
  })
})
