'use client'

import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/hooks/use-workspace'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  BellIcon,
  LogOutIcon,
  UserIcon,
  SettingsIcon,
  CoinsIcon,
} from 'lucide-react'

interface TopBarProps {
  userEmail: string
}

export function TopBar({ userEmail }: TopBarProps) {
  const router = useRouter()
  const { profile, creditBalance, currentWorkspace } = useWorkspace()

  const handleSignOut = async () => {
    // Do a real navigation so the POST + 302 redirect works correctly behind proxies.
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  const displayName = profile?.full_name || userEmail.split('@')[0]

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-40">
      {/* Left: Breadcrumb area (can be extended later) */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {currentWorkspace?.name ?? 'FeasiAI'}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Credits */}
        <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => router.push('/settings/billing')} aria-label="Credit balance">
          <CoinsIcon className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-medium">{creditBalance.toLocaleString()}</span>
          <span className="text-muted-foreground hidden sm:inline">credits</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Notifications">
          <BellIcon className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle className="h-8 w-8 text-muted-foreground" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-8" aria-label="User menu">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline max-w-[120px] truncate">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <SettingsIcon className="w-3.5 h-3.5 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              <LogOutIcon className="w-3.5 h-3.5 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
