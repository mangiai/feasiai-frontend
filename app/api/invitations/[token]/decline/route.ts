import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find invitation by token
  const { data: invitation } = await supabase
    .from('workspace_invitations')
    .select('id')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (!invitation) {
    return NextResponse.json({ error: 'Invalid or already used invitation' }, { status: 404 })
  }

  // Decline the invitation
  const { error } = await supabase
    .from('workspace_invitations')
    .update({ status: 'declined' as const })
    .eq('id', invitation.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
