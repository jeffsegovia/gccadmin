import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/shell/app-shell'
import { viewerFor } from '@/lib/auth/viewer'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location, cause }) => ({
    viewer: await viewerFor(location.href, cause),
  }),
  headers: () => ({ 'X-Robots-Tag': 'noindex, nofollow' }),
  component: AppLayout,
})

function AppLayout() {
  const { viewer } = Route.useRouteContext()
  const role = viewer.isAdmin ? 'Admin' : viewer.isPastor ? 'Pastor' : 'Leader'
  return (
    <AppShell
      user={{
        name: viewer.name,
        email: viewer.email,
        imageUrl: viewer.imageUrl,
        role,
      }}
      isAdmin={viewer.isAdmin}
    >
      <Outlet />
    </AppShell>
  )
}
