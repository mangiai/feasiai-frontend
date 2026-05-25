'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import {
  LogOutIcon,
  ChevronDownIcon,
  WrenchIcon,
  EyeIcon,
  RocketIcon,
  LayoutGridIcon,
  UserIcon,
  PlusIcon,
} from 'lucide-react'
import { useAppMode } from '@/hooks/use-app-mode'
import { setAppMode, type AppMode } from '@/lib/app-mode'

interface NavBarProps {
  userEmail: string
}

const MODE_CONFIG: Record<AppMode, { label: string; icon: typeof WrenchIcon }> = {
  'dev-test': { label: 'Dev Test', icon: WrenchIcon },
  'judge-demo': { label: 'Demo', icon: EyeIcon },
  'real': { label: 'Production', icon: RocketIcon },
}

export function NavBar({ userEmail }: NavBarProps) {
  const router = useRouter()
  const mode = useAppMode()

  const handleSignOut = async () => {
    // Do a real navigation so the POST + 302 redirect works correctly behind proxies.
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  const handleModeChange = (value: string) => {
    setAppMode(value as AppMode)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <nav className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="page-container h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/images/feasiai-icon.svg" alt="FeasiAI" width={28} height={28} className="flex-shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-primary tracking-tight">FeasiAI</span>
            <span className="text-[9px] text-muted-foreground font-medium tracking-wide hidden sm:block">by FeasiAI</span>
          </div>
        </Link>

        {/* Center nav */}
        <div className="hidden sm:flex items-center gap-1">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm font-medium h-8">
              Home
            </Button>
          </Link>
          <Link href="/my-projects">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm font-medium h-8">
              <LayoutGridIcon className="w-3.5 h-3.5 mr-1" />
              Projects
            </Button>
          </Link>
          {mode === 'real' && (
            <Link href="/projects/new">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-sm font-medium h-8">
                <PlusIcon className="w-3.5 h-3.5 mr-1" />
                New
              </Button>
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Mobile-only shortcuts */}
          <Link href="/my-projects" className="sm:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <LayoutGridIcon className="w-4 h-4" />
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground hidden sm:inline max-w-[120px] truncate">
                  {userEmail}
                </span>
                <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Mode</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={mode} onValueChange={handleModeChange}>
                {Object.entries(MODE_CONFIG).map(([key, { label, icon: Icon }]) => (
                  <DropdownMenuRadioItem key={key} value={key} className="gap-2 text-sm">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} variant="destructive">
                <LogOutIcon className="w-3.5 h-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
