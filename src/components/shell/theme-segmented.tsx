import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from 'cn'
import type { ThemePreference } from '@/lib/theme'
import { chooseTheme, currentTheme } from './theme'

/** Light, dark or the device's: three buttons, for the More page. */
export function ThemeSegmented() {
  const [theme, setTheme] = useState<ThemePreference>('dark')
  useEffect(() => setTheme(currentTheme()), [])
  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'Device', icon: Monitor },
  ] as const
  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="grid grid-cols-3 gap-0.5 rounded-lg bg-card p-[3px]"
    >
      {options.map((o) => {
        const on = theme === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              setTheme(o.value)
              void chooseTheme(o.value)
            }}
            className={cn(
              'flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium',
              on
                ? 'bg-secondary text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            <o.icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
