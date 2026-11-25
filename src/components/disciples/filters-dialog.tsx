import { useState } from 'react'
import { cn } from 'cn'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import { Button } from '@/components/ui/button'
import type { DisciplesSearch } from '@/lib/disciples/schema'
import {
  CELL_STATUS,
  CHURCH_STATUS,
  MEMBER_TYPE,
  PROCESS_LEVEL,
  options,
} from '@/lib/labels'

function Multi<T extends string>({
  label,
  labels,
  value,
  onChange,
}: {
  label: string
  labels: Record<T, string>
  value: Array<T> | undefined
  onChange: (v: Array<T> | undefined) => void
}) {
  const set = new Set(value ?? [])
  return (
    <FormField label={label}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options(labels).map((o) => {
          const on = set.has(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = new Set(set)
                if (on) next.delete(o.value)
                else next.add(o.value)
                onChange(next.size ? [...next] : undefined)
              }}
              className={cn(
                'h-9 border px-3 text-[13px] font-medium',
                on
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border hover:bg-muted',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </FormField>
  )
}

export type FilterValues = Pick<
  DisciplesSearch,
  | 'memberType'
  | 'churchStatus'
  | 'cellStatus'
  | 'processLevel'
  | 'status'
  | 'leader'
  | 'handledBy'
>

export function countFilters(f: FilterValues): number {
  return (
    (f.memberType?.length ?? 0) +
    (f.churchStatus?.length ?? 0) +
    (f.cellStatus?.length ?? 0) +
    (f.processLevel?.length ?? 0) +
    (f.status && f.status !== 'active' ? 1 : 0) +
    (f.leader ? 1 : 0) +
    (f.handledBy ? 1 : 0)
  )
}

export function FiltersDialog({
  open,
  onOpenChange,
  value,
  onApply,
  leaders,
  handlers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: FilterValues
  onApply: (v: FilterValues) => void
  leaders: ReadonlyArray<{ id: string; name: string }>
  handlers: ReadonlyArray<{ id: string; name: string }>
}) {
  const [draft, setDraft] = useState<FilterValues>(value)
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(value)
        onOpenChange(o)
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Filters</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-5">
          <FormField label="Status">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['active', 'Active'],
                  ['assistants', 'Leaders and assistants'],
                  ['inactive', 'Inactive'],
                ] as const
              ).map(([v, l]) => {
                const on = (draft.status ?? 'active') === v
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        status: v === 'active' ? undefined : v,
                      })
                    }
                    className={cn(
                      'h-9 border px-3 text-[13px] font-medium',
                      on
                        ? 'border-primary/50 bg-primary/15 text-primary'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    {l}
                  </button>
                )
              })}
            </div>
          </FormField>
          {leaders.length > 0 && (
            <FormField label="Network">
              <PersonCombobox
                aria-label="Network"
                people={leaders}
                value={draft.leader ?? ''}
                onChange={(v) => setDraft({ ...draft, leader: v || undefined })}
                noneLabel="Every network"
                placeholder="Every network"
              />
            </FormField>
          )}
          {handlers.length > 0 && (
            <FormField label="Handled By">
              <PersonCombobox
                aria-label="Handled By"
                people={handlers}
                value={draft.handledBy ?? ''}
                onChange={(v) =>
                  setDraft({ ...draft, handledBy: v || undefined })
                }
                noneLabel="Anyone"
                placeholder="Anyone"
              />
            </FormField>
          )}
          <Multi
            label="Member Type"
            labels={MEMBER_TYPE}
            value={draft.memberType}
            onChange={(v) => setDraft({ ...draft, memberType: v })}
          />
          <Multi
            label="Church Status"
            labels={CHURCH_STATUS}
            value={draft.churchStatus}
            onChange={(v) => setDraft({ ...draft, churchStatus: v })}
          />
          <Multi
            label="Cell Status"
            labels={CELL_STATUS}
            value={draft.cellStatus}
            onChange={(v) => setDraft({ ...draft, cellStatus: v })}
          />
          <Multi
            label="Process Level"
            labels={PROCESS_LEVEL}
            value={draft.processLevel}
            onChange={(v) => setDraft({ ...draft, processLevel: v })}
          />
          <DialogActions>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setDraft({})}
            >
              Clear
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => {
                onApply(draft)
                onOpenChange(false)
              }}
            >
              Show results
            </Button>
          </DialogActions>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
