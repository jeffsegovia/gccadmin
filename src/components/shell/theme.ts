import { applyTheme } from '@/lib/theme'
import type { ThemePreference } from '@/lib/theme'
import { setThemePreference } from '@/server/theme/theme.functions'

export function currentTheme(): ThemePreference {
  return (typeof window !== 'undefined' && window.__gccTheme) || 'dark'
}

/** Applies at once, then saves the cookie so the server renders it next. */
export async function chooseTheme(theme: ThemePreference) {
  applyTheme(theme)
  await setThemePreference({ data: { theme } }).catch(() => {
    // The page already shows it; the next visit just starts dark.
  })
}
