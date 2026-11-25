import { createFileRoute } from '@tanstack/react-router'
import { clerkFrontendApiProxy } from '@clerk/backend/proxy'

/** Clerk's Frontend API through this site. With a live key on a
 * *.vercel.app address, Clerk's browser SDK loads itself and talks to
 * Clerk through /__clerk on the same origin (its auto-proxy); Next.js
 * serves that path by itself, TanStack Start needs this route. On a
 * custom domain set up in Clerk, nothing calls it. */
const forward = ({ request }: { request: Request }) =>
  clerkFrontendApiProxy(request, {
    publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })

export const Route = createFileRoute('/__clerk/$')({
  server: {
    handlers: {
      GET: forward,
      POST: forward,
      PUT: forward,
      PATCH: forward,
      DELETE: forward,
      OPTIONS: forward,
    },
  },
})
