import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, FileText } from 'lucide-react'
import { getFolder } from '@/server/resources/resources.functions'

export const Route = createFileRoute('/resources/$folderId')({
  loader: ({ params }) => getFolder({ data: { id: params.folderId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.folder.name ?? 'Folder'} · GCC Resources` }],
  }),
  component: FolderPage,
})

function size(bytes: number | null) {
  if (!bytes) return ''
  return bytes > 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.round(bytes / 1000)} KB`
}

function FolderPage() {
  const { folder, files } = Route.useLoaderData()
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          to="/resources"
          className="-ml-1 inline-flex w-fit items-center gap-0.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-4" /> All lessons
        </Link>
        <h2 className="text-lg font-semibold break-words">{folder.name}</h2>
        {folder.description && (
          <p className="text-sm text-muted-foreground">{folder.description}</p>
        )}
      </div>
      {files.length === 0 ? (
        <p className="border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No files in this folder yet.
        </p>
      ) : (
        <ul className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t">
          {files.map((f) => (
            <li key={f.id}>
              <a
                href={f.webViewLink ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-14 min-w-0 items-center gap-3 px-4 py-2.5 hover:bg-muted/50"
              >
                <FileText
                  aria-hidden="true"
                  className="size-5 shrink-0 text-primary"
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {f.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {size(f.size)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
