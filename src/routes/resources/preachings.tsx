import { createFileRoute } from '@tanstack/react-router'
import { FolderGrid } from '@/components/resources/folder-grid'
import { getPreachingFolders } from '@/server/resources/resources.functions'

export const Route = createFileRoute('/resources/preachings')({
  loader: () => getPreachingFolders(),
  head: () => ({ meta: [{ title: 'Preachings · GCC Resources' }] }),
  component: Folders,
})

function Folders() {
  return <FolderGrid folders={Route.useLoaderData()} />
}
