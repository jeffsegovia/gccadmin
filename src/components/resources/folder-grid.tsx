import { Link } from '@tanstack/react-router'
import { Folder } from 'lucide-react'
import type { DriveFolder } from '@/server/resources/drive.server'

export function FolderGrid({
  folders,
}: {
  folders: ReadonlyArray<DriveFolder>
}) {
  if (!folders.length)
    return (
      <p className="border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        Nothing here yet.
      </p>
    )
  return (
    <ul className="grid gap-px border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {folders.map((f) => (
        <li key={f.id} className="bg-card">
          <Link
            to="/resources/$folderId"
            params={{ folderId: f.id }}
            className="flex h-full min-h-16 min-w-0 items-start gap-3 p-4 hover:bg-muted/50"
          >
            <Folder
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-primary"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium break-words">{f.name}</span>
              {f.description && (
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {f.description}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
