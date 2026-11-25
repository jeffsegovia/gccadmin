import { SignUp } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '@/components/auth-layout'

export const Route = createFileRoute('/sign-up/$')({
  head: () => ({ meta: [{ title: 'Create an account · GCC Admin' }] }),
  component: () => (
    <AuthLayout>
      <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/home" />
    </AuthLayout>
  ),
})
