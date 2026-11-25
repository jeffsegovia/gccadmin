import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '@/components/auth-layout'

export const Route = createFileRoute('/sign-in/$')({
  head: () => ({ meta: [{ title: 'Sign in · GCC Admin' }] }),
  component: () => (
    <AuthLayout>
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/home" />
    </AuthLayout>
  ),
})
