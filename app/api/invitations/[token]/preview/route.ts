import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/server/access-control'

/**
 * Public (unauthenticated) preview: which email the invite was sent to.
 * The token is a random UUID; this allows the /invite page to prefill signup/login
 * without putting the email in the URL.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token?.trim()) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  let admin
  try {
    admin = getAdminSupabase()
  } catch {
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 503 },
    )
  }

  const { data: invitation, error } = await admin
    .from('workspace_invitations')
    .select('email, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation is no longer valid' }, { status: 410 })
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })
  }

  return NextResponse.json({ email: String(invitation.email || '').trim() })
}
