import { requireViewer } from '@/server/auth/auth.functions'
import type { Viewer } from '@/server/auth/auth.functions'

// Moving between pages reuses the viewer for a minute, so a page's data
// isn't kept waiting on Clerk; entering the app always asks. Every server
// function checks access again anyway.
let remembered: { viewer: Viewer; at: number } | null = null

export async function viewerFor(href: string, cause: string): Promise<Viewer> {
  if (
    typeof window !== 'undefined' &&
    cause !== 'enter' &&
    remembered &&
    Date.now() - remembered.at < 60_000
  )
    return remembered.viewer
  try {
    const viewer = await requireViewer({ data: { redirectTo: href } })
    if (typeof window !== 'undefined') remembered = { viewer, at: Date.now() }
    return viewer
  } catch (error) {
    // Offline in the installed app: keep going with who we last knew, so
    // an attendance sheet kept on the device still opens.
    if (typeof navigator !== 'undefined' && !navigator.onLine && remembered)
      return remembered.viewer
    throw error
  }
}
