import { useSyncExternalStore } from 'react'

/** Phones: below Tailwind's `md`, so `md:` classes and this hook always
 * agree. */
const MOBILE_QUERY = '(max-width: 767px)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** True below 768px. For overlays and other client-only UI that can't be
 * switched with `md:` classes — the shell chrome itself uses CSS, so the
 * server render is right on every screen. `false` on the server. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  )
}

/** Like `useIsMobile`, but `null` while hydrating (and on the server), when
 * the screen isn't known yet. For a page that renders both layouts behind
 * `md:` classes until then, and only the right one after — so the first
 * paint is right on every screen, with one layout mounted from there on. */
export function useIsMobileOnceKnown(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => null,
  )
}

/** Large screens: from Tailwind's `lg`, where the rail runs down the left
 * and a set's item details sit beside its list. */
const WIDE_QUERY = '(min-width: 1024px)'

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/** True from 1024px. False on the server. */
export function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  )
}
