import { Link, createFileRoute } from '@tanstack/react-router'
import { useClerkSafe } from '@/lib/auth/clerk-safe'
import {
  ChartColumn,
  ChevronRight,
  ExternalLink,
  LogOut,
  Smartphone,
  Sprout,
  UsersRound,
} from 'lucide-react'
import { Page, Section } from '@/components/shell/page'
import { UserAvatar } from '@/components/shell/user-menu'
import { ThemeSegmented } from '@/components/shell/theme-segmented'
import { Button } from '@/components/ui/button'
import { Group } from '@/components/ui/list'
import { SiteIcon } from '@/components/site-icon'
import { GCC_LINKS } from '@/config/links'
import { ADMIN_NAV, RESOURCE_NAV } from '@/components/shell/nav-items'
import type { NavItem } from '@/components/shell/nav-items'

/** Phones: everything that isn't in the bottom bar. */
export const Route = createFileRoute('/_app/more')({
  head: () => ({ meta: [{ title: 'More · GCC Admin' }] }),
  component: MorePage,
})

function Rows({ items }: { items: ReadonlyArray<NavItem> }) {
  return (
    <Group>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="flex min-h-13 min-w-0 items-center gap-3 px-3.5 py-2"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-primary">
            <item.icon aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
            {item.label}
          </span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </Link>
      ))}
    </Group>
  )
}

function MorePage() {
  const { viewer } = Route.useRouteContext()
  const signOut = useClerkSafe()
  return (
    <Page title="More">
      <Link
        to="/profile"
        className="flex min-w-0 items-center gap-3 border bg-card p-3.5 dark:border-transparent rounded-xl"
      >
        <UserAvatar user={viewer} className="size-11" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-semibold">
            {viewer.name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {viewer.isAdmin ? 'Admin' : viewer.isPastor ? 'Pastor' : 'Leader'}
            {viewer.disciple?.isPrimary ? ' · Primary leader' : ''}
          </span>
        </span>
        <span className="text-[13px] font-medium text-primary">Profile</span>
      </Link>
      <Section title="Ministry">
        <Rows
          items={[
            { to: '/insights', label: 'Insights', icon: ChartColumn },
            { to: '/soul-winning', label: 'Soul winning', icon: Sprout },
            {
              to: '/attendance/guests',
              label: 'Guests to follow up',
              icon: UsersRound,
            },
          ]}
        />
      </Section>
      <Section title="Resources">
        <Rows items={RESOURCE_NAV} />
      </Section>
      {viewer.isAdmin && (
        <Section title="Admin">
          <Rows items={ADMIN_NAV} />
        </Section>
      )}
      <Section title="Grace City Church">
        <Group>
          {GCC_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-13 min-w-0 items-center gap-3 px-3.5 py-2"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                <SiteIcon href={l.href} className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                {l.label}
              </span>
              <ExternalLink
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            </a>
          ))}
        </Group>
      </Section>
      <Section title="Appearance">
        <ThemeSegmented />
      </Section>
      <Section title="App">
        <p className="flex items-start gap-2 border bg-card p-3.5 text-sm text-muted-foreground dark:border-transparent rounded-xl">
          <Smartphone
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
          Install GCC Admin: in Safari tap Share › Add to Home Screen; in Chrome
          tap ⋮ › Install app. Installed, attendance works offline.
        </p>
      </Section>
      <Button variant="destructive" size="xl" onClick={signOut}>
        <LogOut aria-hidden="true" /> Sign out
      </Button>
    </Page>
  )
}
