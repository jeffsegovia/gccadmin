import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addGuest as addGuestTo,
  emptyPending,
  isEmpty,
  isPresent,
  load,
  save,
  settle,
  toPayload,
  toggle as toggleIn,
} from '@/lib/attendance/outbox'
import type { MarkKind, Pending } from '@/lib/attendance/outbox'
import type { GuestInput } from '@/lib/attendance/schema'
import { isNetworkError, messageOf } from '@/lib/errors'
import { syncAttendance } from '@/server/attendance/attendance.functions'
import type { Sheet } from '@/server/attendance/attendance.functions'

export type SyncStatus =
  'saved' | 'saving' | 'waiting' | 'offline' | 'error' | 'locked'

const RETRY_MS = 15_000
const DEBOUNCE_MS = 500

/** The sheet's marks, offline-first: every tap is kept on the device and
 * shown at once, then sent in the background (after a short pause, when
 * the connection comes back, and every 15 seconds while anything waits). */
export function useAttendanceSync(sheet: Sheet, onGuestsSaved?: () => void) {
  const id = sheet.service.id
  const [pending, setPendingState] = useState<Pending>(emptyPending)
  const pendingRef = useRef(pending)
  const [server, setServer] = useState(() => ({
    members: new Set(sheet.members.filter((m) => m.present).map((m) => m.id)),
    guests: new Set(sheet.guestsHere.map((g) => g.id)),
  }))
  // Guests added on this device, shown until the server's copy has them.
  const [added, setAdded] = useState<Array<GuestInput>>([])
  const [status, setStatus] = useState<SyncStatus>('saved')
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locked = sheet.service.isLocked

  // A fresh copy from the server (another usher's marks) replaces ours.
  useEffect(() => {
    setServer({
      members: new Set(sheet.members.filter((m) => m.present).map((m) => m.id)),
      guests: new Set(sheet.guestsHere.map((g) => g.id)),
    })
  }, [sheet])

  // What this device still owes the server, and the copy for offline use.
  useEffect(() => {
    const stored = load<Sheet>(id)
    pendingRef.current = stored.pending
    setPendingState(stored.pending)
    if (!isEmpty(stored.pending)) setStatus('waiting')
  }, [id])
  useEffect(() => {
    save(id, { pending: pendingRef.current, snapshot: sheet })
  }, [id, sheet])

  const setPending = useCallback(
    (next: Pending) => {
      pendingRef.current = next
      setPendingState(next)
      save(id, { pending: next, snapshot: sheet })
    },
    [id, sheet],
  )

  const sync = useCallback(async () => {
    if (inFlight.current || locked) return
    const sent = pendingRef.current
    if (isEmpty(sent)) {
      setStatus('saved')
      return
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline')
      return
    }
    inFlight.current = true
    setStatus('saving')
    try {
      const result = await syncAttendance({
        data: { attendanceId: id, ...toPayload(sent) },
      })
      setServer({
        members: new Set(result.members),
        guests: new Set(result.guests),
      })
      const left = settle(pendingRef.current, sent)
      setPending(left)
      setError(null)
      setStatus(isEmpty(left) ? 'saved' : 'waiting')
      if (sent.guests.length) onGuestsSaved?.()
    } catch (e) {
      if (isNetworkError(e)) setStatus('offline')
      else {
        const message = messageOf(e)
        setError(message)
        setStatus(/closed/i.test(message) ? 'locked' : 'error')
      }
    } finally {
      inFlight.current = false
    }
  }, [id, locked, setPending, onGuestsSaved])

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void sync(), DEBOUNCE_MS)
  }, [sync])

  useEffect(() => {
    const online = () => void sync()
    window.addEventListener('online', online)
    const visible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    document.addEventListener('visibilitychange', visible)
    const retry = setInterval(() => {
      if (!isEmpty(pendingRef.current)) void sync()
    }, RETRY_MS)
    void sync()
    return () => {
      window.removeEventListener('online', online)
      document.removeEventListener('visibilitychange', visible)
      clearInterval(retry)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [sync])

  const present = useCallback(
    (kind: MarkKind, personId: string) =>
      isPresent(
        pending,
        kind === 'member' ? server.members : server.guests,
        kind,
        personId,
      ),
    [pending, server],
  )

  const toggle = useCallback(
    (kind: MarkKind, personId: string) => {
      if (locked) return
      const set = kind === 'member' ? server.members : server.guests
      setPending(toggleIn(pendingRef.current, set, kind, personId))
      setStatus('waiting')
      schedule()
    },
    [locked, server, setPending, schedule],
  )

  const addGuest = useCallback(
    (guest: GuestInput) => {
      if (locked) return
      setPending(addGuestTo(pendingRef.current, guest))
      setAdded((list) => [...list.filter((g) => g.id !== guest.id), guest])
      setStatus('waiting')
      schedule()
    },
    [locked, setPending, schedule],
  )

  const waitingCount = useMemo(
    () => Object.keys(pending.marks).length,
    [pending],
  )

  return {
    present,
    toggle,
    addGuest,
    newGuests: [
      ...pending.guests,
      ...added.filter((a) => !pending.guests.some((g) => g.id === a.id)),
    ],
    status,
    error,
    waitingCount,
    retry: sync,
  }
}
