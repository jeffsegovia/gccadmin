import { describe, expect, it } from 'vitest'
import { genderFor, groupIssue } from '../rules'

describe('genderFor', () => {
  it('makes Men male and Women female', () => {
    expect(genderFor('MEN', 'FEMALE')).toBe('MALE')
    expect(genderFor('WOMEN', 'MALE')).toBe('FEMALE')
  })
  it('keeps the chosen gender for the other groups', () => {
    expect(genderFor('KIDS', 'FEMALE')).toBe('FEMALE')
    expect(genderFor('YOUTH', 'MALE')).toBe('MALE')
    expect(genderFor('YOUNGPRO', 'FEMALE')).toBe('FEMALE')
  })
})

describe('groupIssue', () => {
  it('refuses no group', () => {
    expect(groupIssue('UNCATEGORIZED', 'MALE')?.field).toBe('memberType')
  })
  it('refuses a man who is female and a woman who is male', () => {
    expect(groupIssue('MEN', 'FEMALE')?.field).toBe('gender')
    expect(groupIssue('WOMEN', 'MALE')?.field).toBe('gender')
  })
  it('accepts the rest', () => {
    expect(groupIssue('MEN', 'MALE')).toBeUndefined()
    expect(groupIssue('WOMEN', 'FEMALE')).toBeUndefined()
    expect(groupIssue('KIDS', 'FEMALE')).toBeUndefined()
  })
})
