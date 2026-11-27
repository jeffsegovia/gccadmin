import { createContext, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ComponentProps } from 'react'
import type { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { cn } from 'cn'
import { LayerDepth, useLayerDepth } from '@/components/layer-depth'

/** A centered dialog from 768px, a bottom sheet below (as in Bliss): the
 * same parts either way, so a dialog switches by swapping its `Dialog*`
 * imports for these. */
const SheetModeContext = createContext(false)
/** Whether a form is rendered inside a dialog or sheet, so its actions can
 * pin to the bottom there and sit inline on a page. */
const InDialogContext = createContext(false)

/** The sheet's top bar, where its title is drawn. */
const TitleSlotContext = createContext<HTMLElement | null>(null)

const useSheetMode = () => useContext(SheetModeContext)

type SubmitState = { label: string; disabled: boolean; busy: boolean }

/** The form's own submit button inside the sheet, watched so the top
 * bar's short submit says the same, is off when it's off, and Cancel is
 * off while it saves. A sheet without a form gets no top-bar submit. */
function useSheetSubmit(body: HTMLElement | null) {
  const [state, setState] = useState<SubmitState | null>(null)
  useEffect(() => {
    if (!body) return
    const read = () => {
      const button = body.querySelector<HTMLButtonElement>(
        'form button[type=submit]',
      )
      if (!button) return setState(null)
      const text = button.textContent.trim()
      // A short label as it is ("Add", "Set aside"); a long one is Save.
      const label =
        button.dataset.short ?? (text.length <= 10 && text ? text : 'Save')
      const next = {
        label,
        disabled: button.disabled,
        busy: button.getAttribute('aria-busy') === 'true',
      }
      setState((prev) =>
        prev &&
        prev.label === next.label &&
        prev.disabled === next.disabled &&
        prev.busy === next.busy
          ? prev
          : next,
      )
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-busy'],
    })
    return () => observer.disconnect()
  }, [body])
  const submit = () =>
    body?.querySelector<HTMLFormElement>('form')?.requestSubmit()
  return { state, submit }
}

function ResponsiveDialog(props: DialogPrimitive.Root.Props) {
  const isMobile = useIsMobile()
  const depth = useLayerDepth()
  const { onOpenChange } = props
  return (
    <LayerDepth.Provider value={depth + 1}>
      <SheetModeContext.Provider value={isMobile}>
        {isMobile ? (
          <Sheet
            {...props}
            // A tap outside doesn't close a sheet (a half-filled form
            // would be lost): only Cancel, Close or Escape does.
            disablePointerDismissal
            onOpenChange={(open, details) => {
              if (!open && details?.reason === 'outside-press') return
              onOpenChange?.(open, details)
            }}
          />
        ) : (
          <Dialog {...props} />
        )}
      </SheetModeContext.Provider>
    </LayerDepth.Provider>
  )
}

/** The backdrop for a layer: a plain dim, no blur. A sheet or dialog
 * opened on top dims the one below too, so only the frontmost reads as
 * active; it's a little lighter, as the first dim is still there. */
function useOverlayClass() {
  return useLayerDepth() > 1 ? 'bg-black/40 dark:bg-black/50' : undefined
}

function ResponsiveDialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return useSheetMode() ? (
    <SheetTrigger {...props} />
  ) : (
    <DialogTrigger {...props} />
  )
}

function ResponsiveDialogClose(props: DialogPrimitive.Close.Props) {
  return useSheetMode() ? <SheetClose {...props} /> : <DialogClose {...props} />
}

/** `className` styles the desktop dialog only; `sheetClassName` the sheet
 * (e.g. a taller `max-h-[90dvh]`). */
function ResponsiveDialogContent({
  className,
  sheetClassName,
  showCloseButton,
  children,
  ...props
}: DialogPrimitive.Popup.Props & {
  sheetClassName?: string
  showCloseButton?: boolean
}) {
  const overlay = useOverlayClass()
  if (!useSheetMode()) {
    return (
      <DialogContent
        overlayClassName={overlay}
        className={className}
        showCloseButton={showCloseButton}
        {...props}
      >
        <InDialogContext.Provider value={true}>
          {children}
        </InDialogContext.Provider>
      </DialogContent>
    )
  }
  return (
    <SheetContent sheetClassName={sheetClassName} props={props}>
      {children}
    </SheetContent>
  )
}

/** The sheet, laid out as in Worsheep: a top bar with Cancel, the title
 * and a short submit ("Save"), the fields scrolling under it, and the
 * full submit button at the end of them. */
function SheetContent({
  sheetClassName,
  props,
  children,
}: {
  sheetClassName?: string
  props: Omit<DialogPrimitive.Popup.Props, 'className' | 'children'>
  children: ComponentProps<'div'>['children']
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)
  const { state, submit } = useSheetSubmit(body)
  return (
    <SheetPopup
      overlayClassName={useOverlayClass()}
      className={cn(
        // A visible top edge: the sheet's background matches the page in
        // dark mode, and a sheet opened on top doesn't dim what's below.
        'bg-background mx-auto max-h-[94dvh] w-full max-w-120 rounded-t-xl border-t border-foreground/20 shadow-[0_-8px_24px_rgb(0_0_0/0.35)]',
        sheetClassName,
      )}
      {...props}
    >
      <div className="grid min-h-14 shrink-0 grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)_minmax(4.5rem,auto)] items-center gap-1 border-b border-border px-1.5">
        <SheetClose
          disabled={state?.busy}
          className="flex h-11 items-center justify-self-start rounded-lg px-2.5 text-[15px] text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
        >
          {state ? 'Cancel' : 'Close'}
        </SheetClose>
        <div ref={setSlot} className="min-w-0 text-center" />
        {state ? (
          <button
            type="button"
            onClick={submit}
            disabled={state.disabled}
            className="flex h-11 items-center justify-self-end rounded-lg px-2.5 text-[15px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
          >
            {state.label}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
      {/* Its children keep their height and the column scrolls; a flex
          column would squash them to fit instead. */}
      <div
        ref={setBody}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))] *:shrink-0"
      >
        <TitleSlotContext.Provider value={slot}>
          <InDialogContext.Provider value={true}>
            {children}
          </InDialogContext.Provider>
        </TitleSlotContext.Provider>
      </div>
    </SheetPopup>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: ComponentProps<'div'>) {
  // Room on the right for the dialog's close button. In the sheet the
  // title sits in the top bar; the description stays here.
  return useSheetMode() ? (
    <div
      className={cn('flex flex-col gap-1 empty:hidden', className)}
      {...props}
    />
  ) : (
    <DialogHeader className={cn('pr-8', className)} {...props} />
  )
}

/** In the sheet: a row of 48px buttons pinned to the bottom of the scroll
 * area, the last (primary) one twice as wide. */
function ResponsiveDialogFooter({
  className,
  ...props
}: ComponentProps<'div'>) {
  return useSheetMode() ? (
    <div
      className={cn(
        'bg-background sticky -bottom-[calc(16px+env(safe-area-inset-bottom))] -mx-4 mt-auto -mb-[calc(16px+env(safe-area-inset-bottom))] flex flex-row gap-2 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] *:h-12 *:flex-1 *:text-base *:last:flex-2',
        className,
      )}
      {...props}
    />
  ) : (
    <DialogFooter className={className} {...props} />
  )
}

/** A form's buttons. In a dialog they pin to the bottom while the fields
 * scroll, so Save is never pushed off-screen; in a sheet they end the
 * fields (the top bar has Save too); on a page they sit in a row after
 * the fields. The last button is the primary one. */
function DialogActions({ className, ...props }: ComponentProps<'div'>) {
  const inDialog = useContext(InDialogContext)
  const sheet = useSheetMode()
  return (
    <div
      data-slot="dialog-actions"
      className={cn(
        'flex gap-2 *:flex-1',
        // In a sheet the top bar's short submit is always in reach, so
        // the full buttons close the fields, 48px tall (as in Worsheep).
        inDialog && sheet && 'mt-3 *:h-12 *:text-[15px]',
        // In a dialog they pin to its foot while the fields scroll.
        // Sticky pins inside the scroller's padding; a negative offset as
        // big as the padding pins it to the edge.
        inDialog &&
          !sheet &&
          'sticky -bottom-6 z-10 -mx-6 mt-2 -mb-6 border-t border-border bg-popover px-6 pt-3 pb-6 shadow-[0_-12px_16px_-12px_var(--background)]',
        // On a page (a form of its own), phones pin the buttons to the
        // foot, as a sheet's are; the bottom bar is hidden on form pages.
        !inDialog &&
          'mt-2 max-md:sticky max-md:bottom-0 max-md:z-20 max-md:-mx-4 max-md:border-t max-md:bg-background/95 max-md:px-4 max-md:pt-3 max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:backdrop-blur',
        className,
      )}
      {...props}
    />
  )
}

/** The plain text of a title, to size a long one down. */
function textOf(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return ''
}

function ResponsiveDialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  const sheet = useSheetMode()
  const slot = useContext(TitleSlotContext)
  if (!sheet) return <DialogTitle className={className} {...props} />
  // Drawn in the top bar, between Cancel and the submit.
  const title = (
    <SheetTitle
      className={cn(
        // A long title wraps to two lines and steps down a size rather
        // than being cut off between Cancel and Save.
        'line-clamp-2 font-sans text-[17px] leading-tight font-semibold text-balance break-words data-[long]:text-[15px]',
        typeof className === 'string' && className.replace(/\bsr-only\b/, ''),
      )}
      data-long={textOf(props.children).length > 22 ? '' : undefined}
      {...props}
    />
  )
  return slot ? createPortal(title, slot) : null
}

function ResponsiveDialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return useSheetMode() ? (
    <SheetDescription
      className={cn(
        'text-muted-foreground text-sm leading-normal text-pretty',
        className,
      )}
      {...props}
    />
  ) : (
    <DialogDescription className={className} {...props} />
  )
}

export {
  DialogActions,
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  useSheetMode,
}
