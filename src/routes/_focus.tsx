import { Outlet, createFileRoute } from '@tanstack/react-router'
import { viewerFor } from '@/lib/auth/viewer'

/** Signed-in, full-screen tasks (taking attendance, a report form): no
 * bottom bar or menu, just the task and a way back. */
export const Route = createFileRoute('/_focus')({
  beforeLoad: async ({ location, cause }) => ({
    viewer: await viewerFor(location.href, cause),
  }),
  headers: () => ({ 'X-Robots-Tag': 'noindex, nofollow' }),
  component: () => (
    <div data-app-shell className="min-h-dvh">
      <Outlet />
    </div>
  ),
})
