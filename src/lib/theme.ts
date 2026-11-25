/** The page is dark by default until the person picks
 * light, or to follow the device, with the header's toggle. The choice
 * lives in a cookie, so the server renders the right theme, and on the
 * profile, so it follows the person to another device. */

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

/** GCC Admin is dark until the person picks otherwise. */
export const DEFAULT_THEME: ThemePreference = 'dark'

export const THEME_COOKIE = 'gcc-theme'
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 400

export function themePreference(value: unknown): ThemePreference {
  return (THEME_PREFERENCES as ReadonlyArray<unknown>).includes(value)
    ? (value as ThemePreference)
    : DEFAULT_THEME
}

/** The page background in each theme (`--background` in styles.css), for
 * the browser's own bars (status bar, bottom bar): they take it from the
 * `theme-color` tag, which must follow the page's theme, not the device's,
 * or a pinned theme shows a bar of the other one. */
export const THEME_BAR = { light: '#0a0a0a', dark: '#0a0a0a' } as const

/** Run in <head> before the first paint: "system" can only be resolved in
 * the browser, so the page doesn't flash light before turning dark. It
 * also follows the device while the page is open, for as long as the
 * choice (kept on `window.__gccTheme`, which `applyTheme` updates) is
 * "system". */
export function themeScript(preference: ThemePreference): string {
  return `(function(){var w=window,d=document.documentElement,m=w.matchMedia('(prefers-color-scheme: dark)');w.__gccTheme=${JSON.stringify(preference)};function a(){var p=w.__gccTheme,dark=p==='dark'||(p==='system'&&m.matches);d.classList.toggle('dark',dark);d.style.colorScheme=dark?'dark':'light';var t=document.querySelectorAll('meta[name=theme-color]');for(var i=0;i<t.length;i++){t[i].removeAttribute('media');t[i].setAttribute('content',dark?${JSON.stringify(THEME_BAR.dark)}:${JSON.stringify(THEME_BAR.light)})}}a();if(m.addEventListener)m.addEventListener('change',a)})()`
}

declare global {
  interface Window {
    __gccTheme?: ThemePreference
  }
}

/** Applies a new preference to the open page at once. */
export function applyTheme(preference: ThemePreference) {
  window.__gccTheme = preference
  const dark =
    preference === 'dark' ||
    (preference === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  // Edited in place, never removed: the head's tags belong to React.
  for (const bar of document.querySelectorAll('meta[name="theme-color"]')) {
    bar.removeAttribute('media')
    bar.setAttribute('content', dark ? THEME_BAR.dark : THEME_BAR.light)
  }
}

/** Whether the page is dark right now, whatever the preference: for
 * widgets that take a theme of their own (the toaster). Follows `.dark`
 * on <html>, which the theme script and `applyTheme` set. */
export function subscribeDarkClass(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => observer.disconnect()
}

export function isDarkNow(): boolean {
  return document.documentElement.classList.contains('dark')
}
