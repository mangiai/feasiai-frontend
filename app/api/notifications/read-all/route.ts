import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ status: 'read' as const, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .in('status', ['pending', 'sent'])
    .select('id')

  if (error) {
    return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated_count: data?.length ?? 0 })
}
