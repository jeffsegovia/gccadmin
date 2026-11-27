import { useState } from 'react'
import { cn } from 'cn'
import { ChipChoice, FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import { MEMBER_TYPE, options } from '@/lib/labels'
import type { SoulWinningSearch } from '@/lib/soul-winning/schema'

export type SoulFilters = Pick<
  SoulWinningSearch,
  'mine' | 'leader' | 'wonBy' | 'memberType' | 'lessons'
>

/** Soul winning's filters in one sheet: whose, the network leader, and
 * for new believers who won them, their member type and which lessons to
 * track. Applied together with Show results. */
export function SoulWinningFiltersDialog({
  open,
  onOpenChange,
  value,
  onApply,
  believers,
  canChooseWhose,
  leaders,
  winners,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: SoulFilters
  onApply: (next: SoulFilters) => void
  believers: boolean
  canChooseWhose: boolean
  leaders: ReadonlyArray<{ id: string; name: string }>
  winners: ReadonlyArray<{ id: string; name: string }>
}) {
  const [draft, setDraft] = useState<SoulFilters>(value)
  const types = new Set(draft.memberType ?? [])
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        if (o) setDraft(value)
        onOpenChange(o)
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Filters</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="flex min-w-0 flex-col gap-5">
          {canChooseWhose && (
            <FormField label="Whose">
              <ChipChoice
                label="Whose"
                value={draft.mine ? 'mine' : 'all'}
                onChange={(v) =>
                  setDraft({ ...draft, mine: v === 'mine' ? true : undefined })
                }
                options={[
                  { value: 'all', label: 'Everyone' },
                  { value: 'mine', label: 'Mine' },
                ]}
              />
            </FormField>
          )}
          {leaders.length > 0 && (
            <FormField label="Network Leader">
              <PersonCombobox
                aria-label="Network Leader"
                people={leaders}
                value={draft.leader ?? ''}
                onChange={(v) =>
                  setDraft({
                    ...draft,
                    leader: v || undefined,
                    wonBy: undefined,
                  })
                }
                noneLabel="Every leader"
                placeholder="Every leader"
              />
            </FormField>
          )}
          {believers && winners.length > 0 && (
            <FormField label="Won By">
              <PersonCombobox
                aria-label="Won By"
                people={winners}
                value={draft.wonBy ?? ''}
                onChange={(v) => setDraft({ ...draft, wonBy: v || undefined })}
                noneLabel="Anyone"
                placeholder="Anyone"
              />
            </FormField>
          )}
          {believers && (
            <FormField label="Member Type">
              <div
                role="group"
                aria-label="Member Type"
                className="flex flex-wrap gap-1.5"
              >
                {options(MEMBER_TYPE).map((o) => {
                  const on = types.has(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const next = new Set(types)
                        if (on) next.delete(o.value)
                        else next.add(o.value)
                        setDraft({
                          ...draft,
                          memberType: next.size ? [...next] : undefined,
                        })
                      }}
                      className={cn(
                        'h-8 rounded-full border px-3 text-[13px] font-medium',
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
          )}
          {believers && (
            <FormField label="Lessons to track">
              <ChipChoice
                label="Lessons to track"
                value={draft.lessons ?? 'all'}
                onChange={(v) =>
                  setDraft({ ...draft, lessons: v === 'all' ? undefined : v })
                }
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'soul-winning', label: 'Soul Winning' },
                  { value: 'consolidation', label: 'Consolidation' },
                ]}
              />
            </FormField>
          )}
        </div>
        <DialogActions>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setDraft({})}
          >
            Reset
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
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
