import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SAShell } from '@/components/sa/sa-shell'

export const metadata: Metadata = {
  title: 'Super Admin',
  robots: { index: false },
}

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sa/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role, full_name, email')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'super_admin') {
    redirect('/sa/login')
  }

  return (
    <SAShell
      userName={profile.full_name || 'Super Admin'}
      userEmail={profile.email || user.email || '—'}
    >
      {children}
    </SAShell>
  )
}
