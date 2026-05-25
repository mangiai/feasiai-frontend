import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { ClipboardCheckIcon, LogOutIcon, ArrowLeftIcon, ShieldIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Reviewer',
  robots: { index: false },
}

const reviewerNav = [
  { href: '/reviewer', label: 'Review Queue', icon: ClipboardCheckIcon },
]

export default async function ReviewerPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/reviewer/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile?.system_role || !['reviewer', 'super_admin'].includes(profile.system_role)) {
    redirect('/reviewer/login')
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-60 border-r border-border bg-card flex flex-col shrink-0">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ShieldIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">Reviewer</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                Human-in-the-Loop
              </span>
            </div>
          </div>
          <ThemeToggle className="h-8 w-8 text-muted-foreground hover:text-foreground" />
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {reviewerNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-border space-y-2">
          <div className="px-2">
            <p className="text-xs font-medium truncate">
              {profile.full_name || 'Reviewer'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
          </div>
          <div className="flex gap-1">
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
            >
              <ArrowLeftIcon className="w-3 h-3" />
              App
            </Link>
            <form action="/auth/signout" method="POST" className="flex-1">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive rounded-md hover:bg-accent transition-colors"
              >
                <LogOutIcon className="w-3 h-3" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

