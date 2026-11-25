import { useState } from 'react'
import { FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'

export type ReportFilters = { mine?: boolean; leader?: string }

/** Cell reports' filters in one sheet: whose, and which leader. */
export function ReportFiltersDialog({
  open,
  onOpenChange,
  value,
  onApply,
  canChooseWhose,
  leaders,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: ReportFilters
  onApply: (next: ReportFilters) => void
  canChooseWhose: boolean
  leaders: ReadonlyArray<{ id: string; name: string }>
}) {
  const [draft, setDraft] = useState<ReportFilters>(value)
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
              <Segmented
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
            <FormField label="Leader">
              <PersonCombobox
                aria-label="Leader"
                people={leaders}
                value={draft.leader ?? ''}
                onChange={(v) => setDraft({ ...draft, leader: v || undefined })}
                noneLabel="Every leader"
                placeholder="Every leader"
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
