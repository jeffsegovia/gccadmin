import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BookOpen, Search, UserRound, UsersRound } from 'lucide-react'
import { cn } from 'cn'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { Spinner } from '@/components/ui/spinner'
import { searchEverything } from '@/server/search/search.functions'

type Results = Awaited<ReturnType<typeof searchEverything>>

/** Finds disciples, guests and lessons from anywhere (Ctrl/Cmd+K or "/"). */
export function SearchButton({ compact }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest(
        'input, textarea, [contenteditable]',
      )
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' && !typing)
      ) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <>
      <button
        type="button"
        aria-label="Search"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground',
          compact
            ? 'size-10 justify-center'
            : 'h-9 w-72 rounded-lg border border-input bg-card px-3 text-sm max-lg:w-48',
        )}
      >
        <Search aria-hidden="true" className="size-4 shrink-0" />
        {!compact && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">
              Search people, lessons
            </span>
            <kbd className="border px-1.5 font-mono text-[10px] rounded-lg">
              ⌘K
            </kbd>
          </>
        )}
      </button>
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Search</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          {open && <SearchPanel onPick={() => setOpen(false)} />}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}

function SearchPanel({ onPick }: { onPick: () => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const [loading, setLoading] = useState(false)
  const latest = useRef(0)
  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults(null)
      return
    }
    const ticket = ++latest.current
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await searchEverything({ data: { q: term } })
        if (ticket === latest.current) setResults(r)
      } finally {
        if (ticket === latest.current) setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [q])

  const row =
    'flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted'
  const empty =
    results &&
    !results.people.length &&
    !results.guests.length &&
    !results.lessons.length
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name of a disciple, guest or lesson"
          aria-label="Search"
          className="h-11 w-full border border-input bg-transparent pr-9 pl-9 text-base outline-none focus-visible:border-ring rounded-lg"
        />
        {loading && (
          <Spinner className="absolute top-1/2 right-3 -translate-y-1/2" />
        )}
      </div>
      {empty && (
        <p className="px-1 py-4 text-sm text-muted-foreground">
          Nothing matches “{q}”.
        </p>
      )}
      {results && (
        <div className="flex max-h-[60vh] min-w-0 flex-col gap-3 overflow-y-auto">
          {results.people.length > 0 && (
            <div className="flex flex-col">
              <span className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                Disciples
              </span>
              {results.people.map((p) => (
                <Link
                  key={p.id}
                  to="/disciples/$discipleId"
                  params={{ discipleId: p.id }}
                  onClick={onPick}
                  className={row}
                >
                  <UserRound
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {p.isPrimary && (
                    <span className="shrink-0 text-xs text-primary">
                      Leader
                    </span>
                  )}
                  {!p.isActive && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
          {results.guests.length > 0 && (
            <div className="flex flex-col">
              <span className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                Guests
              </span>
              {results.guests.map((g) => (
                <Link
                  key={g.id}
                  to="/attendance/guests"
                  search={{ q: g.name }}
                  onClick={onPick}
                  className={row}
                >
                  <UsersRound
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                </Link>
              ))}
            </div>
          )}
          {results.lessons.length > 0 && (
            <div className="flex flex-col">
              <span className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                Lessons
              </span>
              {results.lessons.map((l) => (
                <Link
                  key={l.id}
                  to="/lessons/$seriesId"
                  params={{ seriesId: l.seriesId }}
                  onClick={onPick}
                  className={row}
                >
                  <BookOpen
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{l.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {l.seriesTitle}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
