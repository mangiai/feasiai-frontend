import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/server/access-control'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let admin
  try {
    admin = getAdminSupabase()
  } catch {
    return NextResponse.json(
      { error: 'Server misconfiguration: Supabase service role is not set' },
      { status: 503 },
    )
  }

  // Find invitation by token
  const { data: invitation } = await supabase
    .from('workspace_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (!invitation) {
    return NextResponse.json({ error: 'Invalid or already used invitation' }, { status: 404 })
  }

  // Check expiration
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  // Ensure the logged-in user matches the invited email (prevents accidental acceptance on wrong account)
  const invitedEmail = String(invitation.email || '').trim().toLowerCase()
  const userEmail = String(user.email || '').trim().toLowerCase()
  if (!invitedEmail || !userEmail || invitedEmail !== userEmail) {
    return NextResponse.json(
      { error: 'This invitation was sent to a different email address. Please sign in with the invited account.' },
      { status: 403 },
    )
  }

  // Update invitation status
  const { error: updateError } = await admin
    .from('workspace_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invitation.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Create workspace membership
  const { error: membershipError } = await admin
    .from('workspace_memberships')
    .insert({
      workspace_id: invitation.workspace_id,
      user_id: user.id,
      role: invitation.role,
    })

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
