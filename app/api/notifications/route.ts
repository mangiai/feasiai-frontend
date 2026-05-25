import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status === 'unread') {
    query = query.in('status', ['pending', 'sent'])
  }

  const { data: notifications, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  // Get unread count
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['pending', 'sent'])

  return NextResponse.json({
    notifications: notifications ?? [],
    unread_count: count ?? 0,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { notification_ids, action } = body

  if (action === 'mark_read') {
    if (Array.isArray(notification_ids) && notification_ids.length > 0) {
      await supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', notification_ids)
    } else {
      // Mark all as read
      await supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('status', ['pending', 'sent'])
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
