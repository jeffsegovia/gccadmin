import { describe, expect, it } from 'vitest'
import {
  addGuest,
  emptyPending,
  isPresent,
  settle,
  toPayload,
  toggle,
} from '../outbox'

const guest = {
  id: 'guest_0001',
  name: 'Daniel Ocampo',
  gender: 'MALE' as const,
  memberType: 'YOUNGPRO' as const,
}

describe('attendance outbox', () => {
  it('shows a tap at once, over what the server has', () => {
    const server = new Set(['a'])
    let p = toggle(emptyPending(), server, 'member', 'b')
    expect(isPresent(p, server, 'member', 'b')).toBe(true)
    p = toggle(p, server, 'member', 'a')
    expect(isPresent(p, server, 'member', 'a')).toBe(false)
  })

  it('a tap undone before syncing sends the final state only', () => {
    const server = new Set<string>()
    let p = toggle(emptyPending(), server, 'member', 'b')
    p = toggle(p, server, 'member', 'b')
    expect(toPayload(p).marks).toEqual([
      { kind: 'member', id: 'b', present: false },
    ])
  })

  it('sends one mark per person: the latest', () => {
    const server = new Set<string>()
    let p = toggle(emptyPending(), server, 'member', 'b')
    p = toggle(p, server, 'member', 'c')
    expect(toPayload(p).marks).toEqual([
      { kind: 'member', id: 'b', present: true },
      { kind: 'member', id: 'c', present: true },
    ])
  })

  it('keeps taps made while a sync was in flight', () => {
    const server = new Set<string>()
    const sent = toggle(emptyPending(), server, 'member', 'b')
    // While sending, b is unmarked and c is marked.
    let now = toggle(sent, server, 'member', 'b')
    now = toggle(now, server, 'member', 'c')
    const left = settle(now, sent)
    // b changed after sending (present → absent), so it still has to go.
    expect(left.marks).toEqual({ 'member:b': false, 'member:c': true })
  })

  it('adds a guest marked present, and settles them once sent', () => {
    let p = addGuest(emptyPending(), guest)
    expect(isPresent(p, new Set(), 'guest', guest.id)).toBe(true)
    expect(toPayload(p).guests).toHaveLength(1)
    p = settle(p, p)
    expect(p.guests).toEqual([])
    expect(p.marks).toEqual({})
  })

  it('a new guest unmarked before syncing still sends the unmark', () => {
    let p = addGuest(emptyPending(), guest)
    p = toggle(p, new Set(), 'guest', guest.id)
    expect(p.marks[`guest:${guest.id}`]).toBe(false)
  })
})
