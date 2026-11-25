import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Logo } from '@/components/shell/logo'
import { appConfig } from '@/config/site'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-8 px-4 py-10">
      <Link to="/" className="flex items-center gap-2.5">
        <Logo className="size-9" />
        <span className="text-lg font-semibold">{appConfig.title}</span>
      </Link>
      <div className="flex w-full max-w-md justify-center">{children}</div>
    </div>
  )
}
