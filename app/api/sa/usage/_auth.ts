import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/server/access-control'

export async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, status: 401, message: 'Unauthorized', userId: null, adminSupabase: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'super_admin') {
    return { ok: false as const, status: 403, message: 'Forbidden', userId: null, adminSupabase: null }
  }

  return { ok: true as const, userId: user.id, adminSupabase: getAdminSupabase() }
}

