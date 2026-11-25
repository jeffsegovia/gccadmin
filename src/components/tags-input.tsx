import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from 'cn'

/** Words typed one at a time (v2's tags input): type one, then Enter or a
 * comma; each shows as a tag that can be removed. Leaving the field keeps
 * what was typed, so nothing is lost on Next. */
export function TagsInput({
  id,
  value,
  onChange,
  placeholder,
  hint,
  invalid,
}: {
  id?: string
  value: ReadonlyArray<string>
  onChange: (value: Array<string>) => void
  placeholder?: string
  hint?: string
  invalid?: boolean
}) {
  const [text, setText] = useState('')
  const add = (raw: string) => {
    const next = raw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !value.includes(t))
    if (next.length) onChange([...value, ...next])
    setText('')
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div
        className={cn(
          'flex min-h-10 min-w-0 flex-wrap items-center gap-1.5 border border-input px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 rounded-lg',
          invalid && 'border-destructive',
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md bg-secondary py-0.5 pr-1 pl-2 text-[13px]"
          >
            <span className="min-w-0 break-words">{tag}</span>
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="grid size-5 shrink-0 place-items-center text-muted-foreground hover:text-foreground"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          enterKeyHint="enter"
          aria-invalid={invalid || undefined}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => {
            if (e.target.value.includes(',')) add(e.target.value)
            else setText(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(text)
            } else if (e.key === 'Backspace' && !text && value.length)
              onChange(value.slice(0, -1))
          }}
          onBlur={() => text.trim() && add(text)}
          className="h-7 min-w-32 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
