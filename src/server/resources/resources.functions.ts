import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { z } from 'zod'
import { folderFiles, foldersIn } from './drive.server'

/** Public: no sign-in. Cached at the edge for 10 minutes. */
function cache() {
  setResponseHeader(
    'Cache-Control',
    'public, s-maxage=600, stale-while-revalidate=3600',
  )
}

export const getLessonFolders = createServerFn({ method: 'GET' }).handler(
  async () => {
    cache()
    return foldersIn('gcc_app', 'createdTime')
  },
)

export const getPreachingFolders = createServerFn({ method: 'GET' }).handler(
  async () => {
    cache()
    return foldersIn('Preaching', 'name desc')
  },
)

export const getFolder = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().regex(/^[\w-]{10,80}$/) }))
  .handler(async ({ data }) => {
    cache()
    return folderFiles(data.id)
  })
