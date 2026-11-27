import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from 'cn'

/** The phone's bottom sheet, on Base UI's Dialog: focus, Escape, scroll
 * lock and the dialog role come from it; the slide is plain CSS. It
 * replaces Base UI's Drawer, which measured its own height and the
 * viewport on every open (for swiping and snap points Osamu doesn't use)
 * and made sheets slow to start moving on phones. */
function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPopup({
  className,
  overlayClassName,
  ...props
}: DialogPrimitive.Popup.Props & { overlayClassName?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        // Nested ones too, so the layer behind is dimmed.
        forceRender
        data-slot="sheet-overlay"
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0',
          overlayClassName,
        )}
      />
      <DialogPrimitive.Popup
        data-slot="sheet-popup"
        className={cn(
          // Only transform animates, so the slide stays on the GPU.
          'fixed inset-x-0 bottom-0 z-50 flex flex-col text-sm text-popover-foreground outline-none',
          'transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform data-ending-style:translate-y-full data-ending-style:duration-150 data-ending-style:ease-in data-starting-style:translate-y-full',
          className,
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  )
}

function SheetTitle(props: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="sheet-title" {...props} />
}

function SheetDescription(props: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description data-slot="sheet-description" {...props} />
  )
}

export {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
}
