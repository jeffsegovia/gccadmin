import type { GuestInput, Mark } from './schema'

/* Attendance is offline-first. Every tap lands here first, on the device,
   and the sheet shows it at once; a sync sends what's waiting and keeps
   whatever changed while it was in flight. Only the latest state per
   person is kept (tapping twice offline sends nothing), and a guest added
   offline carries an id made here, so a retried sync never doubles them.

   Kept in localStorage under one key per service, with the last copy of
   the sheet from the server, so the sheet also opens with no signal. */

export type MarkKind = Mark['kind']
export type Pending = {
  /** `${kind}:${id}` → present */
  marks: Record<string, boolean>
  guests: Array<GuestInput>
}

export const emptyPending = (): Pending => ({ marks: {}, guests: [] })

export const markKey = (kind: MarkKind, id: string) => `${kind}:${id}`

export function isEmpty(p: Pending): boolean {
  return p.guests.length === 0 && Object.keys(p.marks).length === 0
}

export function pendingCount(p: Pending): number {
  return Object.keys(p.marks).length
}

/** Whether someone shows as present: what's waiting wins over the server. */
export function isPresent(
  p: Pending,
  server: ReadonlySet<string>,
  kind: MarkKind,
  id: string,
): boolean {
  const waiting = p.marks[markKey(kind, id)]
  return waiting ?? server.has(id)
}

/** A tap. The latest state is always kept, even when it matches what the
 * server had: a sync may be in flight that changes the server, and
 * sending "absent" for someone already absent is harmless. */
export function toggle(
  p: Pending,
  server: ReadonlySet<string>,
  kind: MarkKind,
  id: string,
): Pending {
  const key = markKey(kind, id)
  return { ...p, marks: { ...p.marks, [key]: !isPresent(p, server, kind, id) } }
}

export function addGuest(p: Pending, guest: GuestInput): Pending {
  return {
    guests: [...p.guests.filter((g) => g.id !== guest.id), guest],
    marks: { ...p.marks, [markKey('guest', guest.id)]: true },
  }
}

/** What to send. */
export function toPayload(p: Pending): {
  marks: Array<Mark>
  guests: Array<GuestInput>
} {
  return {
    marks: Object.entries(p.marks).map(([key, present]) => {
      const i = key.indexOf(':')
      return {
        kind: key.slice(0, i) as MarkKind,
        id: key.slice(i + 1),
        present,
      }
    }),
    guests: p.guests,
  }
}

/** After a sync of `sent`: drop what the server now has, keep anything
 * tapped again while the sync was in flight. */
export function settle(current: Pending, sent: Pending): Pending {
  const marks: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(current.marks))
    if (sent.marks[key] !== value) marks[key] = value
  const sentGuests = new Set(sent.guests.map((g) => g.id))
  return { marks, guests: current.guests.filter((g) => !sentGuests.has(g.id)) }
}

/* ---- Storage ---- */

const PREFIX = 'gcc-attendance:v1:'

type Stored<TSheet> = { pending: Pending; snapshot?: TSheet }

export function load<TSheet>(attendanceId: string): Stored<TSheet> {
  try {
    const raw = localStorage.getItem(PREFIX + attendanceId)
    if (!raw) return { pending: emptyPending() }
    const parsed = JSON.parse(raw) as Stored<TSheet>
    return {
      pending: {
        marks: parsed.pending?.marks ?? {},
        guests: parsed.pending?.guests ?? [],
      },
      snapshot: parsed.snapshot,
    }
  } catch {
    return { pending: emptyPending() }
  }
}

export function save<TSheet>(attendanceId: string, stored: Stored<TSheet>) {
  try {
    localStorage.setItem(PREFIX + attendanceId, JSON.stringify(stored))
  } catch {
    // Storage full or blocked (private mode): the sheet still works while
    // open; it just can't survive a reload offline.
  }
}

/** Services with marks still waiting, for the list's "not synced" note. */
export function servicesWithPending(): Array<string> {
  const ids: Array<string> = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(PREFIX)) continue
      const id = key.slice(PREFIX.length)
      if (!isEmpty(load(id).pending)) ids.push(id)
    }
  } catch {
    // No storage: nothing waiting that we can know about.
  }
  return ids
}
