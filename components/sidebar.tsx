'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  LayoutDashboardIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusCircleIcon,
  CreditCardIcon,
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  BellIcon,
  ShieldIcon,
  FileTextIcon,
  GiftIcon,
  MenuIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'

interface SidebarProps {
  isStaff?: boolean
}

interface NavItem {
  label: string
  icon: typeof LayoutDashboardIcon
  href: string
  staffOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboardIcon, href: '/dashboard' },
  { label: 'Projects', icon: FolderIcon, href: '/projects' },
  { label: 'New Project', icon: PlusCircleIcon, href: '/projects/new' },
  { label: 'My Projects', icon: FolderOpenIcon, href: '/my-projects' },
  { label: 'Reports', icon: FileTextIcon, href: '/reports' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Referrals', icon: GiftIcon, href: '/referrals' },
  { label: 'Billing', icon: CreditCardIcon, href: '/settings/billing' },
  { label: 'Team', icon: UsersIcon, href: '/settings/team' },
  { label: 'Notifications', icon: BellIcon, href: '/settings/notifications' },
  { label: 'Settings', icon: SettingsIcon, href: '/settings' },
  { label: 'Admin', icon: ShieldIcon, href: '/sa', staffOnly: true },
]

const SIDEBAR_STORAGE_KEY = 'feasiai-sidebar-collapsed'

export function Sidebar({ isStaff }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Sync from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored === 'true') setCollapsed(true)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      }
      return next
    })
  }, [])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/settings') return pathname === '/settings' && !pathname.includes('/settings/')
    return pathname.startsWith(href)
  }

  const renderNavItem = (item: NavItem, mobile?: boolean) => {
    if (item.staffOnly && !isStaff) return null

    const active = isActive(item.href)
    const Icon = item.icon
    const isCollapsed = !mobile && collapsed

    const button = (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </Link>
    )

    if (isCollapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      )
    }

    return button
  }

  const sidebarContent = (mobile?: boolean) => (
    <>
      {/* Brand */}
      <div className={cn(
        'flex items-center h-14 border-b border-border px-3',
        !mobile && collapsed ? 'justify-center' : 'gap-2.5'
      )}>
        <Image src="/images/feasiai-icon.svg" alt="FeasiAI" width={24} height={24} className="flex-shrink-0" />
        {(mobile || !collapsed) && (
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-primary tracking-tight">FeasiAI</span>
          </div>
        )}
      </div>

      {/* Workspace switcher */}
      <div className="px-2 py-2 border-b border-border">
        <WorkspaceSwitcher collapsed={mobile ? false : collapsed} />
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => renderNavItem(item, mobile))}
      </nav>

      {/* Bottom nav */}
      <nav className="py-2 px-2 space-y-0.5 border-t border-border">
        {BOTTOM_ITEMS.map((item) => renderNavItem(item, mobile))}
      </nav>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Main navigation"
        className={cn(
          'hidden md:flex flex-col h-screen border-r border-border bg-card/50 backdrop-blur-sm sticky top-0 transition-all duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {sidebarContent()}

        {/* Collapse toggle */}
        <div className="px-2 py-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            aria-label="Toggle sidebar"
            aria-expanded={!collapsed}
            className={cn('w-full', collapsed ? 'justify-center px-2' : 'justify-start')}
          >
            {collapsed ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeftIcon className="w-4 h-4 mr-2" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-3 left-3 z-50 h-9 w-9 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
            >
              <MenuIcon className="w-5 h-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex flex-col h-full">
              {sidebarContent(true)}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
