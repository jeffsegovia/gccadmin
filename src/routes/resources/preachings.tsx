import { createFileRoute } from '@tanstack/react-router'
import { FolderList } from '@/components/resources/folder-list'
import { getPreachingFolders } from '@/server/resources/resources.functions'

export const Route = createFileRoute('/resources/preachings')({
  loader: () => getPreachingFolders(),
  head: () => ({ meta: [{ title: 'Preachings · GCC Resources' }] }),
  component: Folders,
})

function Folders() {
  return <FolderList folders={Route.useLoaderData()} from="preachings" />
}
