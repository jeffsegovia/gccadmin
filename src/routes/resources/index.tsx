import { createFileRoute } from '@tanstack/react-router'
import { FolderList } from '@/components/resources/folder-list'
import { getLessonFolders } from '@/server/resources/resources.functions'

export const Route = createFileRoute('/resources/')({
  loader: () => getLessonFolders(),
  head: () => ({ meta: [{ title: 'Lessons · GCC Resources' }] }),
  component: Folders,
})

function Folders() {
  return <FolderList folders={Route.useLoaderData()} from="lessons" />
}
