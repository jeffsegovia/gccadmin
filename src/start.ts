import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

// Clerk talks to its own Frontend API on the instance's domain. Its
// "auto-proxy" would route it through /__clerk on this site whenever
// Vercel reports a *.vercel.app production address (even with a custom
// domain set up), and this app serves no proxy there, so it's off.
process.env.CLERK_DISABLE_AUTO_PROXY ??= 'true'

// The local preview (no Clerk keys in dev) runs without Clerk.
const withClerk =
  !!process.env.CLERK_SECRET_KEY || process.env.NODE_ENV === 'production'

export const startInstance = createStart(() => ({
  requestMiddleware: withClerk
    ? [clerkMiddleware(), csrfMiddleware]
    : [csrfMiddleware],
}))
