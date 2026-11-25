import { useMemo } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { CheckIcon, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from 'cn'

export type ComboPerson = { id: string; name: string; hint?: string | null }

/** A person picker that stays quick for hundreds of names: looks like a
 * select, opens a list with a search at the top (as in Osamu). */
export function PersonCombobox({
  id,
  people,
  value,
  onChange,
  placeholder = 'Choose someone',
  noneLabel,
  invalid,
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  id?: string
  people: ReadonlyArray<ComboPerson>
  value: string | null | undefined
  onChange: (id: string) => void
  placeholder?: string
  /** Offers "nobody" first, for optional fields and filters. */
  noneLabel?: string
  invalid?: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  const all = useMemo<Array<ComboPerson>>(
    () => (noneLabel ? [{ id: '', name: noneLabel }, ...people] : [...people]),
    [people, noneLabel],
  )
  const selected = all.find((p) => p.id === (value ?? '')) ?? null

  return (
    <Combobox.Root<ComboPerson>
      items={all}
      value={selected}
      onValueChange={(p) => {
        if (p) onChange(p.id)
      }}
      itemToStringLabel={(p) => p.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      autoHighlight
      disabled={disabled}
    >
      <Combobox.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-10 w-full min-w-0 items-center gap-2.5 border border-input bg-transparent pr-3 pl-3 text-left text-base transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm',
          className,
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            !selected && 'text-muted-foreground',
          )}
        >
          {selected?.name || placeholder}
        </span>
        <ChevronsUpDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner
          className="isolate z-50 outline-none"
          align="start"
          sideOffset={4}
        >
          <Combobox.Popup
            aria-label="People"
            className="flex max-h-[min(22rem,var(--available-height))] w-(--anchor-width) min-w-64 origin-(--transform-origin) flex-col overflow-hidden border bg-popover text-popover-foreground shadow-2xl outline-none"
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <Combobox.Input
                placeholder="Search names"
                className="h-11 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Combobox.Empty>
              <p className="px-3 py-4 text-sm text-muted-foreground">
                Nobody by that name.
              </p>
            </Combobox.Empty>
            <Combobox.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 empty:p-0">
              {(p: ComboPerson) => (
                <Combobox.Item
                  key={p.id || 'none'}
                  value={p}
                  className="flex min-h-10 cursor-default items-center gap-2.5 px-2.5 text-sm outline-none select-none data-highlighted:bg-secondary"
                >
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {p.hint && (
                    <span className="shrink-0 truncate text-xs text-muted-foreground">
                      {p.hint}
                    </span>
                  )}
                  <Combobox.ItemIndicator>
                    <CheckIcon
                      aria-hidden="true"
                      className="size-4 text-primary"
                    />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
