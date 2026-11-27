import { useState } from 'react'
import type { ReactElement } from 'react'
import { Link } from '@tanstack/react-router'
import { useClerkSafe } from '@/lib/auth/clerk-safe'
import { BookOpen, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react'
import { GUIDES } from '@/config/guides'
import { cn } from 'cn'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { initials } from '@/lib/labels'
import type { ThemePreference } from '@/lib/theme'
import { chooseTheme, currentTheme } from './theme'

export type MenuUser = {
  name: string
  email: string
  imageUrl: string | null
  role: string
}

export function UserAvatar({
  user,
  className,
}: {
  user: Pick<MenuUser, 'name' | 'imageUrl'>
  className?: string
}) {
  return (
    <Avatar className={cn('size-8 shrink-0 rounded-full', className)}>
      {user.imageUrl && <AvatarImage src={user.imageUrl} alt="" />}
      <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
        {initials(user.name) || '?'}
      </AvatarFallback>
    </Avatar>
  )
}

/** Appearance as three choices, saved for the next visit. */
export function ThemeChoice({ onChosen }: { onChosen?: () => void }) {
  const [theme, setTheme] = useState<ThemePreference>(currentTheme)
  return (
    <DropdownMenuRadioGroup
      value={theme}
      onValueChange={(value) => {
        const next = value as ThemePreference
        setTheme(next)
        void chooseTheme(next)
        onChosen?.()
      }}
    >
      <DropdownMenuRadioItem value="light">
        <Sun /> Light
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">
        <Moon /> Dark
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="system">
        <Monitor /> Same as device
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  )
}

export function UserMenu({
  user,
  trigger,
  side = 'bottom',
}: {
  user: MenuUser
  trigger: ReactElement
  side?: 'bottom' | 'right' | 'top'
}) {
  const signOut = useClerkSafe()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent
        side={side}
        align="end"
        sideOffset={8}
        className="w-64"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex min-w-0 flex-col gap-0.5 py-2">
            <span className="truncate text-sm font-medium text-foreground">
              {user.name}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email} · {user.role}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/profile" />}>
            <UserRound /> My profile
          </DropdownMenuItem>
          {GUIDES.map((g) => (
            <DropdownMenuItem
              key={g.href}
              render={<a href={g.href} download />}
            >
              <BookOpen /> {g.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs">Appearance</DropdownMenuLabel>
          <ThemeChoice />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
