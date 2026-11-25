import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from 'cn'

/** An on/off switch (shadcn style on Base UI). Its tap area is 44px tall
 * around the 24px track. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-input p-0.5 transition-colors outline-none after:absolute after:-inset-y-2.5 after:-inset-x-1 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-4"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
