import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find collaboration by invite_token
  const { data: collaboration } = await supabase
    .from('project_collaborations')
    .select('*')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .single()

  if (!collaboration) {
    return NextResponse.json({ error: 'Invalid or already used invitation' }, { status: 404 })
  }

  // If invitation targets a specific user, only that user can accept.
  if (collaboration.grantee_user_id && collaboration.grantee_user_id !== user.id) {
    return NextResponse.json({ error: 'This invitation is not assigned to your account' }, { status: 403 })
  }

  // Check expiration
  if (collaboration.expires_at && new Date(collaboration.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  // Accept the collaboration
  const { data: updated, error } = await supabase
    .from('project_collaborations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      grantee_user_id: collaboration.grantee_user_id ?? user.id,
    })
    .eq('id', collaboration.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
