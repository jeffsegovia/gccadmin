import { createFileRoute } from '@tanstack/react-router'
import { FolderGrid } from '@/components/resources/folder-grid'
import { getLessonFolders } from '@/server/resources/resources.functions'

export const Route = createFileRoute('/resources/')({
  loader: () => getLessonFolders(),
  head: () => ({ meta: [{ title: 'Lessons · GCC Resources' }] }),
  component: Folders,
})

function Folders() {
  return <FolderGrid folders={Route.useLoaderData()} />
}
