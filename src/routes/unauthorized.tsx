import { createFileRoute, redirect } from '@tanstack/react-router'
import { useClerk, useUser } from '@clerk/tanstack-react-start'
import { LogOut, Mail } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { AuthLayout } from '@/components/auth-layout'
import { getSignedIn } from '@/server/auth/auth.functions'
import { getAdminEmail } from '@/server/site.functions'

/** Signed in, but no admin has given this account a role yet. */
export const Route = createFileRoute('/unauthorized')({
  beforeLoad: async () => {
    const state = await getSignedIn()
    if (!state.signedIn)
      throw redirect({ to: '/sign-in/$', params: { _splat: '' } })
    if (state.hasRole) throw redirect({ to: '/home' })
  },
  loader: () => getAdminEmail(),
  head: () => ({ meta: [{ title: 'Request access · GCC Admin' }] }),
  component: RequestAccess,
})

function RequestAccess() {
  const adminEmail = Route.useLoaderData()
  const { user } = useUser()
  const clerk = useClerk()
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const name = user?.fullName ?? ''
  const body = `Hi Admin!\n\nPlease grant me Leader rights to GCC Admin.\n\nMy email is ${email} and my account name is ${name}.\n\nThank you.`
  return (
    <AuthLayout>
      <div className="flex w-full flex-col gap-4 border bg-card p-6">
        <h1 className="text-xl font-semibold">Waiting for access</h1>
        <p className="text-sm text-muted-foreground">
          You’re signed in as <span className="text-foreground">{email}</span>,
          but an admin hasn’t linked your account to a leader yet. Ask for
          access and they’ll set you up.
        </p>
        {adminEmail && (
          <a
            href={`mailto:${adminEmail}?subject=${encodeURIComponent('GCC Admin access')}&body=${encodeURIComponent(body)}`}
            className={buttonVariants({ size: 'lg' })}
          >
            <Mail aria-hidden="true" /> Email the admin
          </a>
        )}
        <Button
          variant="secondary"
          size="lg"
          onClick={() => void clerk.signOut({ redirectUrl: '/' })}
        >
          <LogOut aria-hidden="true" /> Sign out
        </Button>
      </div>
    </AuthLayout>
  )
}
