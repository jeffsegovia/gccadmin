import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <p className="text-sm font-semibold text-muted-foreground">404</p>
      <h1 className="font-heading text-3xl font-semibold">
        This page isn’t here
      </h1>
      <p className="text-muted-foreground">
        It may have been deleted, or the link is wrong.
      </p>
      <Link
        to="/home"
        className={buttonVariants({ size: 'lg', className: 'mt-3' })}
      >
        Go to Home
      </Link>
    </div>
  )
}
