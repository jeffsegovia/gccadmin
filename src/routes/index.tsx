import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { FolderOpen, LogIn } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Logo } from '@/components/shell/logo'
import { appConfig } from '@/config/site'
import { getSignedIn } from '@/server/auth/auth.functions'

/** The front door: signed-in leaders go straight to Home. */
export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const state = await getSignedIn()
    if (state.signedIn && state.hasRole) throw redirect({ to: '/home' })
    if (state.signedIn) throw redirect({ to: '/unauthorized' })
  },
  component: Landing,
})

function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo className="size-20" />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          {appConfig.church}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {appConfig.title}
        </h1>
        <p className="text-muted-foreground">{appConfig.description}</p>
      </div>
      <div className="flex w-full flex-col gap-2">
        <Link
          to="/sign-in/$"
          params={{ _splat: '' }}
          className={buttonVariants({ size: 'xl' })}
        >
          <LogIn aria-hidden="true" /> Sign in
        </Link>
        <Link
          to="/resources"
          className={buttonVariants({ size: 'xl', variant: 'secondary' })}
        >
          <FolderOpen aria-hidden="true" /> GCC resources
        </Link>
      </div>
    </main>
  )
}
