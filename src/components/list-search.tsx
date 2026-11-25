import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from 'cn'

/** A search field that follows the URL and pushes typing to it after a
 * short pause (so Back and Forward work, and the server filters). */
export function ListSearch({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  placeholder: string
  className?: string
}) {
  const [text, setText] = useState(value ?? '')
  const latest = useRef(onChange)
  latest.current = onChange
  useEffect(() => setText(value ?? ''), [value])
  useEffect(() => {
    if (text === (value ?? '')) return
    const timer = setTimeout(
      () => latest.current(text.trim() || undefined),
      300,
    )
    return () => clearTimeout(timer)
  }, [text, value])
  return (
    <div className={cn('relative w-full min-w-0 md:max-w-sm', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full min-w-0 border border-input bg-card pr-9 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-10 md:text-sm [&::-webkit-search-cancel-button]:hidden rounded-xl"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText('')
            onChange(undefined)
          }}
          className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center text-muted-foreground hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  )
}
