import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createCsrfMiddleware, createStart } from '@tanstack/react-start'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

// The local preview (no Clerk keys in dev) runs without Clerk.
const withClerk =
  !!process.env.CLERK_SECRET_KEY || process.env.NODE_ENV === 'production'

export const startInstance = createStart(() => ({
  requestMiddleware: withClerk
    ? [clerkMiddleware(), csrfMiddleware]
    : [csrfMiddleware],
}))
