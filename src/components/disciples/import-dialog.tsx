import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Download, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/responsive-dialog'
import { FormField } from '@/components/form-field'
import { PersonCombobox } from '@/components/person-combobox'
import { PendingButton } from '@/components/pending-button'
import { Button, buttonVariants } from '@/components/ui/button'
import { importRowSchema } from '@/lib/disciples/schema'
import type { DiscipleInput } from '@/lib/disciples/schema'
import { readDisciplesFile } from '@/lib/disciples/spreadsheet'
import { messageOf } from '@/lib/errors'
import { importDisciples } from '@/server/disciples/disciples.functions'

export function ImportDialog({
  open,
  onOpenChange,
  leaders,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Admins choose the network; leaders import into their own. */
  leaders: ReadonlyArray<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [rows, setRows] = useState<Array<DiscipleInput>>([])
  const [problems, setProblems] = useState<Array<string>>([])
  const [leaderId, setLeaderId] = useState('')

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setRows([])
          setProblems([])
        }
        onOpenChange(o)
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Import disciples</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Fill in the template, one disciple a row, then choose the file.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-4">
          <a
            href="/disciple-template.xlsx"
            download
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            <Download aria-hidden="true" /> Download the template
          </a>
          {leaders.length > 0 && (
            <FormField label="Network">
              <PersonCombobox
                aria-label="Network"
                people={leaders}
                value={leaderId}
                onChange={setLeaderId}
                placeholder="Choose their leader"
              />
            </FormField>
          )}
          <FormField
            label="File"
            htmlFor="import-file"
            hint="Excel (.xlsx) or CSV."
          >
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="text-sm file:mr-3 file:h-9 file:border-0 file:bg-secondary file:px-3 file:text-sm file:font-medium file:text-secondary-foreground"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const read = await readDisciplesFile(file)
                  const issues: Array<string> = []
                  read.forEach((r, i) => {
                    const parsed = importRowSchema.safeParse(r)
                    if (!parsed.success)
                      issues.push(
                        `Row ${i + 2} (${r.name || 'no name'}): ${parsed.error.issues[0]?.message}`,
                      )
                  })
                  setRows(read)
                  setProblems(issues)
                } catch {
                  toast.error('That file couldn’t be read.')
                }
              }}
            />
          </FormField>
          {rows.length > 0 && (
            <div className="flex items-center gap-2 border bg-muted/40 p-3 text-sm rounded-lg">
              <FileSpreadsheet
                aria-hidden="true"
                className="size-4 shrink-0 text-primary"
              />
              <span className="min-w-0">
                {rows.length} {rows.length === 1 ? 'disciple' : 'disciples'}{' '}
                found
                {problems.length ? `, ${problems.length} to fix first` : ''}.
              </span>
            </div>
          )}
          {problems.length > 0 && (
            <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-destructive">
              {problems.slice(0, 20).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <DialogActions>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <PendingButton
              size="lg"
              disabled={
                !rows.length ||
                problems.length > 0 ||
                (leaders.length > 0 && !leaderId)
              }
              pendingLabel="Importing…"
              onClick={async () => {
                try {
                  const parsed = rows.map((r) => importRowSchema.parse(r))
                  const result = await importDisciples({
                    data: { rows: parsed, leaderId: leaderId || undefined },
                  })
                  toast.success(`${result.count} disciples imported`)
                  onOpenChange(false)
                  await router.invalidate()
                } catch (error) {
                  toast.error(messageOf(error))
                }
              }}
            >
              Import
            </PendingButton>
          </DialogActions>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
