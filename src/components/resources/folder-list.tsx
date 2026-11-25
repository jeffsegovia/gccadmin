import { Link } from '@tanstack/react-router'
import { ChevronRight, Folder } from 'lucide-react'
import type { DriveFolder } from '@/server/resources/drive.server'

/** Drive folders as one list, a row each, like every list in the app. */
export function FolderList({
  folders,
  from,
}: {
  folders: ReadonlyArray<DriveFolder>
  /** Which tab the folders are from: preachings list their files Z to A. */
  from: 'lessons' | 'preachings'
}) {
  if (!folders.length)
    return (
      <p className="border border-dashed px-4 py-10 text-center text-sm text-muted-foreground rounded-xl">
        Nothing here yet.
      </p>
    )
  return (
    <ul className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t rounded-xl overflow-hidden">
      {folders.map((f) => (
        <li key={f.id}>
          <Link
            to="/resources/$folderId"
            params={{ folderId: f.id }}
            search={{ from }}
            className="flex min-h-15 min-w-0 items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50"
          >
            <Folder
              aria-hidden="true"
              className="size-5 shrink-0 text-primary"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium break-words">{f.name}</span>
              {f.description && (
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {f.description}
                </span>
              )}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}
