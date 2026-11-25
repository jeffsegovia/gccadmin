import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  THEME_PREFERENCES,
  themePreference,
} from '@/lib/theme'

/** The theme to render: the cookie, else dark. */
export const getThemePreference = createServerFn({ method: 'GET' }).handler(
  async () => themePreference(getCookie(THEME_COOKIE)),
)

/** Light, dark or the device's, kept in a cookie so the server renders it. */
export const setThemePreference = createServerFn({ method: 'POST' })
  .validator(z.object({ theme: z.enum(THEME_PREFERENCES) }))
  .handler(async ({ data }) => {
    setCookie(THEME_COOKIE, data.theme, {
      path: '/',
      maxAge: THEME_COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  })
