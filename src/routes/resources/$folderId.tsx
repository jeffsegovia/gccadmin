import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Check, ChevronLeft, Download, FileText, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { ListSearch } from '@/components/list-search'
import { Button, buttonVariants } from '@/components/ui/button'
import { timeAgo } from '@/lib/dates'
import { getFolder } from '@/server/resources/resources.functions'

export const Route = createFileRoute('/resources/$folderId')({
  validateSearch: z.object({
    from: z.enum(['lessons', 'preachings']).optional(),
    q: z.string().optional(),
  }),
  // Searching only filters what's loaded; the order follows the tab.
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: ({ params, deps }) =>
    getFolder({ data: { id: params.folderId, from: deps.from } }),
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
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const preachings = search.from === 'preachings'
  const term = search.q?.trim().toLowerCase() ?? ''
  const shown = term
    ? files.filter((f) => f.name.toLowerCase().includes(term))
    : files

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          to={preachings ? '/resources/preachings' : '/resources'}
          className="-ml-1 inline-flex w-fit items-center gap-0.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {preachings ? 'All preachings' : 'All lessons'}
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
        <>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <ListSearch
              value={search.q}
              placeholder={`Search ${files.length} ${files.length === 1 ? 'file' : 'files'}`}
              onChange={(q) =>
                void navigate({
                  search: (prev) => ({ ...prev, q }),
                  replace: true,
                })
              }
            />
            <p
              aria-live="polite"
              className="shrink-0 text-[13px] text-muted-foreground"
            >
              {term ? 'Found ' : ''}
              {shown.length} {shown.length === 1 ? 'file' : 'files'}
              {preachings ? ' · Z to A' : ' · A to Z'}
            </p>
          </div>
          {shown.length === 0 ? (
            <p className="border border-dashed px-4 py-10 text-center text-sm break-words text-muted-foreground">
              Nothing matches “{search.q}”.
            </p>
          ) : (
            <ul className="flex flex-col border bg-card dark:border-transparent [&>*+*]:border-t">
              {shown.map((f) => (
                <li
                  key={f.id}
                  className="flex min-h-15 min-w-0 items-center gap-1 pr-2"
                >
                  <a
                    href={f.webViewLink ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 hover:text-primary"
                  >
                    <FileText
                      aria-hidden="true"
                      className="size-5 shrink-0 text-primary"
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium break-words">{f.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[
                          f.createdTime && `Added ${timeAgo(f.createdTime)}`,
                          size(f.size),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </a>
                  {f.webViewLink && (
                    <CopyLink url={f.webViewLink} name={f.name} />
                  )}
                  {f.webContentLink && (
                    <a
                      href={f.webContentLink}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Download ${f.name}`}
                      className={buttonVariants({
                        variant: 'ghost',
                        size: 'icon-lg',
                      })}
                    >
                      <Download aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

/** Copies a file's link (v2's copy button), to share in a group chat. */
function CopyLink({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={`Copy the link to ${name}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          toast.success('Link copied')
          setTimeout(() => setCopied(false), 2000)
        } catch {
          toast.error('Couldn’t copy; open the file and share it from there.')
        }
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
    </Button>
  )
}
