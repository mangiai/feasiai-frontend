import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DevTools } from '@/components/dev-tools'
import { ErrorBoundary } from '@/components/error-boundary'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AppShell userId={user.id} userEmail={user.email || ''}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      <DevTools />
    </AppShell>
  )
}
