import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { cn } from 'cn'

/** How long a navigation has to be pending before the bar shows — keeps
 * instant (cached/preloaded) navigations from flickering it. */
const SHOW_DELAY_MS = 150

/** Thin indeterminate bar pinned to the top of the viewport while the router
 * is resolving a navigation (running `beforeLoad`/loaders). */
export function NavigationProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading })
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setVisible(false)
      return
    }
    const timeout = setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [isLoading])

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="h-full animate-nav-progress bg-primary w-1/3 motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  )
}
