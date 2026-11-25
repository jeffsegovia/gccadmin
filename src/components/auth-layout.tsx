import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
} from '@clerk/tanstack-react-start'
import { RefreshCw } from 'lucide-react'
import { Logo } from '@/components/shell/logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { appConfig } from '@/config/site'

type AuthCard = 'sign-in' | 'sign-up'

/** Fields between the divider and Continue on Clerk's card. */
const FIELD_COUNT: Record<AuthCard, number> = { 'sign-in': 1, 'sign-up': 3 }

/** Sign-in, sign-up and the no-access page. Clerk's card renders only once
 * its browser SDK has loaded, so a card-shaped placeholder holds its place
 * until then (as in Bliss), and a message says so if Clerk can't load. */
export function AuthLayout({
  card,
  children,
}: {
  card?: AuthCard
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 px-4 py-10">
      <Link to="/" className="flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="text-lg font-semibold">{appConfig.title}</span>
      </Link>
      <div className="flex w-full max-w-md justify-center">
        {card ? (
          <>
            <ClerkLoading>
              <AuthCardSkeleton card={card} />
            </ClerkLoading>
            <ClerkLoaded>{children}</ClerkLoaded>
            <ClerkFailed>
              <AuthUnavailable />
            </ClerkFailed>
          </>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

/** Roughly Clerk's card: title and subtitle, a social button, the divider,
 * the fields, Continue and the footer link. */
function AuthCardSkeleton({ card }: { card: AuthCard }) {
  return (
    <div
      role="status"
      aria-label="Loading sign-in"
      className="flex w-full max-w-100 flex-col items-center border bg-card px-8 pt-8 pb-7"
    >
      <Skeleton className="h-5 w-44" />
      <Skeleton className="mt-3 h-3.5 w-56" />
      <Skeleton className="mt-8 h-10 w-full" />
      <Skeleton className="mt-6 h-3 w-10" />
      {Array.from({ length: FIELD_COUNT[card] }, (_, i) => (
        <div key={i} className="mt-6 flex w-full flex-col gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="mt-6 h-10 w-full" />
      <Skeleton className="mt-8 h-3.5 w-52" />
    </div>
  )
}

function AuthUnavailable() {
  return (
    <div
      role="alert"
      className="flex w-full max-w-100 flex-col items-center gap-3 border bg-card px-6 py-8 text-center"
    >
      <p className="text-[15px] font-semibold">Sign-in couldn’t load</p>
      <p className="text-sm text-muted-foreground">
        Check your connection and try again. If it keeps happening, let the
        admin know.
      </p>
      <Button
        size="lg"
        variant="secondary"
        onClick={() => window.location.reload()}
      >
        <RefreshCw aria-hidden="true" /> Try again
      </Button>
    </div>
  )
}
