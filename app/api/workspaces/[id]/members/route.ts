import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getEmailActionBaseUrl } from '@/lib/http/email-action-base-url'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

function isUserAlreadyRegisteredAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const o = err as { message?: string; code?: string; status?: number }
  const msg = (o.message || '').toLowerCase()
  const code = (o.code || '').toLowerCase()
  return (
    code === 'email_exists'
    || msg.includes('already been registered')
    || msg.includes('already registered')
    || msg.includes('user already exists')
    || msg.includes('a user with this email address has already been registered')
  )
}

/** Sends workspace invite via Supabase Auth email (custom SMTP), not Mailgun. */
async function sendWorkspaceInviteViaSupabaseAuth(params: {
  email: string
  redirectTo: string
  userMetadata: Record<string, unknown>
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !serviceKey || !anonKey) {
    throw new Error('Supabase URL/keys are not configured')
  }

  const admin = createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(params.email, {
    redirectTo: params.redirectTo,
    data: params.userMetadata,
  })

  if (!inviteErr) return { method: 'inviteUserByEmail' as const }

  if (!isUserAlreadyRegisteredAuthError(inviteErr)) {
    throw inviteErr
  }

  const anon = createServiceClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: otpErr } = await anon.auth.signInWithOtp({
    email: params.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: params.redirectTo,
      data: params.userMetadata,
    },
  })

  if (otpErr) throw otpErr
  return { method: 'signInWithOtp' as const }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify membership
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 })
  }

  // Fetch all members first, then resolve profile metadata separately.
  // This avoids brittle nested relationship aliases that can fail across schema changes.
  const { data: memberships, error } = await supabase
    .from('workspace_memberships')
    .select('id, user_id, role, is_active, created_at')
    .eq('workspace_id', id)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  const userIds = (memberships ?? []).map((m) => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null; email: string | null }> }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
  const members = (memberships ?? []).map((m) => ({
    ...m,
    profiles: profileMap.get(m.user_id)
      ? {
          full_name: profileMap.get(m.user_id)!.full_name,
          avatar_url: profileMap.get(m.user_id)!.avatar_url,
          email: profileMap.get(m.user_id)!.email,
        }
      : null,
  }))

  return NextResponse.json(members)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify admin/owner role
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await request.json()
  const { email, role } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const validRoles = ['admin', 'member', 'viewer'] as const
  const memberRole = validRoles.includes(role) ? (role as typeof validRoles[number]) : 'member'

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('workspace_invitations')
    .insert({
      workspace_id: id,
      email: email.trim().toLowerCase(),
      role: memberRole,
      invited_by: user.id,
      token: randomUUID(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This email has already been invited' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }

  // Send invitation email via Supabase Auth (capture errors for debugging)
  let inviteEmail:
    | { ok: true; method: 'inviteUserByEmail' | 'signInWithOtp'; redirect_to: string }
    | { ok: false; error: string; redirect_to: string } = { ok: true, method: 'inviteUserByEmail', redirect_to: '' }
  try {
    const [{ data: inviterProfile }, { data: workspace }] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
      supabase.from('workspaces').select('name').eq('id', id).single(),
    ])

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'An FeasiAI user'
    const workspaceName = workspace?.name || 'a workspace'
    const baseUrl = getEmailActionBaseUrl(request)
    const acceptUrl = `${baseUrl}/invite/${invitation.token}`

    const result = await sendWorkspaceInviteViaSupabaseAuth({
      email: invitation.email,
      redirectTo: acceptUrl,
      userMetadata: {
        inviter_name: inviterName,
        workspace_name: workspaceName,
        workspace_role: invitation.role,
        invite_kind: 'workspace',
        // Used by `/auth/code` to recover the invite acceptance URL if Supabase
        // falls back `redirect_to` to the Site URL (redirect allow-list mismatch).
        workspace_invite_token: invitation.token,
      },
    })
    inviteEmail = { ok: true, method: result.method, redirect_to: acceptUrl }
  } catch (emailErr) {
    console.error('Failed to send workspace invite email (Supabase Auth):', emailErr)
    const baseUrl = getEmailActionBaseUrl(request)
    const acceptUrl = `${baseUrl}/invite/${invitation.token}`
    inviteEmail = { ok: false, error: emailErr instanceof Error ? emailErr.message : 'unknown_error', redirect_to: acceptUrl }
  }

  return NextResponse.json({ ...invitation, invite_email: inviteEmail }, { status: 201 })
}
