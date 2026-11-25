import {
  Link,
  Outlet,
  createFileRoute,
  useLocation,
} from '@tanstack/react-router'
import { cn } from 'cn'
import { Logo } from '@/components/shell/logo'
import { buttonVariants } from '@/components/ui/button'
import { appConfig } from '@/config/site'
import { getSignedIn } from '@/server/auth/auth.functions'

/** GCC Resources: public, no sign-in. */
export const Route = createFileRoute('/resources')({
  loader: () => getSignedIn(),
  staleTime: 60_000,
  head: () => ({
    meta: [
      { title: 'GCC Resources' },
      { name: 'description', content: appConfig.resourcesDescription },
      { property: 'og:title', content: 'GCC Resources' },
      { property: 'og:description', content: appConfig.resourcesDescription },
    ],
  }),
  component: ResourcesLayout,
})

const TABS = [
  { to: '/resources', label: 'Cell group lessons', exact: true },
  { to: '/resources/preachings', label: 'Preachings' },
  { to: '/resources/others', label: 'More from GCC' },
] as const

function ResourcesLayout() {
  const state = Route.useLoaderData()
  const { pathname, search } = useLocation()
  // A folder page belongs to the tab it was opened from (?from=).
  const inFolder = /^\/resources\/(?!preachings|others)[^/]+/.test(pathname)
  const fromPreachings =
    inFolder && (search as { from?: string }).from === 'preachings'
  const onTab = (t: (typeof TABS)[number]) =>
    t.to === '/resources/preachings'
      ? pathname.startsWith(t.to) || fromPreachings
      : 'exact' in t
        ? pathname === t.to ||
          pathname === `${t.to}/` ||
          (inFolder && !fromPreachings)
        : pathname.startsWith(t.to)
  return (
    <div className="min-h-dvh">
      <header className="dark sticky top-0 z-30 border-b bg-background text-foreground">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <Logo />
            <span className="truncate font-semibold">{appConfig.church}</span>
          </Link>
          <span className="ml-auto" />
          {state.signedIn && state.hasRole ? (
            <Link
              to="/home"
              className={buttonVariants({ variant: 'secondary' })}
            >
              GCC Admin
            </Link>
          ) : (
            <Link
              to="/sign-in/$"
              params={{ _splat: '' }}
              className={buttonVariants({ variant: 'ghost' })}
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl min-w-0 flex-col gap-5 px-4 pt-6 pb-16">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            GCC Resources
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {appConfig.resourcesDescription}
          </p>
        </div>
        <nav
          aria-label="Resources"
          className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b px-4"
        >
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap',
                onTab(t)
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </main>
    </div>
  )
}
