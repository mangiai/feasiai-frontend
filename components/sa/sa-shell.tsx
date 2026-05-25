'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  MenuIcon,
  ShieldIcon,
  ArrowLeftIcon,
  LogOutIcon,
  LayoutDashboardIcon,
  UsersIcon,
  BuildingIcon,
  ActivityIcon,
  ClipboardCheckIcon,
  CreditCardIcon,
  HelpCircleIcon,
  MessageSquareIcon,
  HeartPulseIcon,
  DollarSignIcon,
  BarChart3Icon,
  LinkIcon,
  HandshakeIcon,
  ScrollTextIcon,
  ServerIcon,
  CpuIcon,
  MailIcon,
  FileTextIcon,
  CoinsIcon,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface SAShellProps {
  children: React.ReactNode
  userName: string
  userEmail: string
}

const SA_NAV: NavItem[] = [
  { href: '/sa', label: 'Dashboard', icon: LayoutDashboardIcon },
  { href: '/sa/users', label: 'Users', icon: UsersIcon },
  { href: '/sa/workspaces', label: 'Workspaces', icon: BuildingIcon },
  { href: '/sa/pipeline', label: 'Pipeline Queue', icon: ActivityIcon },
  { href: '/sa/reports', label: 'Reports', icon: FileTextIcon },
  { href: '/sa/reviews', label: 'Review Queue', icon: ClipboardCheckIcon },
  { href: '/sa/skills', label: 'Skill Health', icon: HeartPulseIcon },
  { href: '/sa/feedback', label: 'Feedback', icon: MessageSquareIcon },
  { href: '/sa/contact', label: 'Contact Forms', icon: MailIcon },
  { href: '/sa/billing', label: 'Billing / Sales', icon: CreditCardIcon },
  { href: '/sa/sales', label: 'Sales Pipeline', icon: DollarSignIcon },
  { href: '/sa/analytics', label: 'Analytics', icon: BarChart3Icon },
  { href: '/sa/referrals', label: 'Referrals', icon: LinkIcon },
  { href: '/sa/collaborations', label: 'Collaborations', icon: HandshakeIcon },
  { href: '/sa/models', label: 'Model Pipeline', icon: CpuIcon },
  { href: '/sa/llm-usage', label: 'LLM Usage', icon: CoinsIcon },
  { href: '/sa/dev-logs', label: 'Dev Logs', icon: ScrollTextIcon },
  { href: '/sa/system', label: 'System', icon: ServerIcon },
  { href: '/sa/help', label: 'Help Center', icon: HelpCircleIcon },
]

function isNavItemActive(pathname: string, href: string) {
  if (href === '/sa') {
    return pathname === '/sa'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarNav({
  navItems,
  pathname,
  compact = false,
}: {
  navItems: NavItem[]
  pathname: string
  compact?: boolean
}) {
  return (
    <nav className={cn('h-full space-y-1 overflow-y-auto', compact ? 'p-2' : 'px-2 py-3')}>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isNavItemActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm transition-all',
              active
                ? 'border-primary/30 bg-gradient-to-r from-primary/12 via-primary/8 to-secondary/12 text-foreground shadow-[0_8px_24px_-18px_hsl(var(--primary)/0.55)]'
                : 'border-transparent text-muted-foreground hover:border-border/80 hover:bg-accent/80 hover:text-foreground',
            )}
          >
            <Icon className={cn('h-4 w-4', active ? 'text-primary' : '')} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function ShellFooter({ userName, userEmail }: { userName: string; userEmail: string }) {
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'SA'

  return (
    <div className="shrink-0 space-y-2 border-t border-border p-3">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/12 via-background to-secondary/10 p-3 shadow-[0_10px_24px_-20px_hsl(var(--primary)/0.55)]">
        <div className="pointer-events-none absolute -right-7 -top-7 h-14 w-14 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-14 w-14 rounded-full bg-primary/12 blur-2xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/55 text-xs font-semibold tracking-wide text-foreground/90 dark:bg-black/25 dark:text-white/90">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground/95">{userName}</p>
            <p className="truncate text-[10px] text-foreground/75">{userEmail}</p>
            <p className="mt-1 inline-flex rounded-full border border-white/35 bg-white/35 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-foreground/75 dark:bg-black/20 dark:text-white/75">
              Super Admin
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Link
          href="/dashboard"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeftIcon className="h-3 w-3" />
          App
        </Link>
        <form action="/auth/signout" method="POST" className="flex-1">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
          >
            <LogOutIcon className="h-3 w-3" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

export function SAShell({ children, userName, userEmail }: SAShellProps) {
  const pathname = usePathname()
  const pageTitle = SA_NAV.find((item) => isNavItemActive(pathname, item.href))?.label ?? 'Super Admin'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-gradient-to-br from-primary/15 to-secondary/15">
                <ShieldIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-tight font-display">Back Office</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-secondary">FeasiAI Super Admin</p>
              </div>
            </div>
            <ThemeToggle className="h-8 w-8 text-muted-foreground hover:text-foreground" />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <SidebarNav navItems={SA_NAV} pathname={pathname} />
          </div>

          <ShellFooter userName={userName} userEmail={userEmail} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon-sm" aria-label="Open admin navigation">
                      <MenuIcon className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <SheetHeader className="border-b border-border">
                      <SheetTitle className="flex items-center gap-2 text-sm">
                        <ShieldIcon className="h-4 w-4 text-primary" />
                        Back Office
                      </SheetTitle>
                      <SheetDescription>FeasiAI Super Admin navigation</SheetDescription>
                    </SheetHeader>
                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className="min-h-0 flex-1 overflow-hidden">
                        <SidebarNav navItems={SA_NAV} pathname={pathname} compact />
                      </div>
                      <ShellFooter userName={userName} userEmail={userEmail} />
                    </div>
                  </SheetContent>
                </Sheet>
                <span className="text-sm font-semibold tracking-tight font-display">{pageTitle}</span>
              </div>
              <ThemeToggle className="h-8 w-8 text-muted-foreground hover:text-foreground" />
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
