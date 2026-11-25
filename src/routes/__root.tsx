import { useEffect } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-react-start'
import { NotFound } from '@/components/not-found'
import { RouteError } from '@/components/error-page'
import { NavigationProgress } from '@/components/ui/navigation-progress'
import { Toaster } from '@/components/ui/sonner'
import { appConfig } from '@/config/site'
import { THEME_BAR, themeScript } from '@/lib/theme'
import type { ThemePreference } from '@/lib/theme'
import { getThemePreference } from '@/server/theme/theme.functions'
import { getSiteUrl } from '@/server/site.functions'
import { DEV_AUTH } from '@/lib/auth/dev'

import appCss from '../styles.css?url'
import interFont from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'

/** The browser bar's color: a pinned theme says its own; "system" gives
 * both, and the theme script keeps one in step with the page. */
function themeColorMeta(theme: ThemePreference | undefined) {
  if (theme === 'light' || theme === 'dark')
    return [{ name: 'theme-color', content: THEME_BAR[theme] }]
  return [
    {
      name: 'theme-color',
      content: THEME_BAR.light,
      media: '(prefers-color-scheme: light)',
    },
    {
      name: 'theme-color',
      content: THEME_BAR.dark,
      media: '(prefers-color-scheme: dark)',
    },
  ]
}

export const Route = createRootRoute({
  loader: async () => {
    const [theme, site] = await Promise.all([
      getThemePreference(),
      getSiteUrl(),
    ])
    return { theme, site }
  },
  staleTime: Infinity,
  shouldReload: false,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: appConfig.title },
      { name: 'description', content: appConfig.description },
      { property: 'og:site_name', content: appConfig.title },
      { property: 'og:locale', content: 'en_PH' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: appConfig.title },
      { property: 'og:description', content: appConfig.description },
      // Crawlers want an absolute address for the share image.
      { property: 'og:image', content: `${loaderData?.site ?? ''}/og.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content: 'GCC Admin, Grace City Church',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: `${loaderData?.site ?? ''}/og.png` },
      ...themeColorMeta(loaderData?.theme),
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
    ],
    links: [
      {
        rel: 'preload',
        href: interFont,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon-32.png', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

/** Registers the service worker in production builds (in dev it would
 * cache Vite's modules). */
function useServiceWorker() {
  useEffect(() => {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installing and offline sheets are extras; the app works without.
    })
  }, [])
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { theme } = Route.useLoaderData()
  useServiceWorker()
  const page = (
    <html
      lang="en-PH"
      className={theme === 'dark' ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript(theme) }} />
        <HeadContent />
      </head>
      <body>
        <NavigationProgress />
        {children}
        <Toaster
          position="bottom-right"
          mobileOffset={{
            bottom: 'calc(5rem + env(safe-area-inset-bottom))',
          }}
        />
        <Scripts />
      </body>
    </html>
  )
  if (DEV_AUTH) return page
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'var(--primary)',
          colorPrimaryForeground: 'var(--primary-foreground)',
          colorBackground: 'var(--card)',
          colorForeground: 'var(--foreground)',
          colorMutedForeground: 'var(--muted-foreground)',
          colorInput: 'var(--background)',
          colorInputForeground: 'var(--foreground)',
          colorNeutral: 'var(--foreground)',
          borderRadius: '0',
          fontFamily: 'var(--font-sans)',
        },
      }}
    >
      {page}
    </ClerkProvider>
  )
}
