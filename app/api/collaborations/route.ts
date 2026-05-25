import { NextRequest, NextResponse } from 'next/server'
import { getEmailActionBaseUrl } from '@/lib/http/email-action-base-url'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { collaborationInviteEmail } from '@/lib/email-templates'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const resourceType = searchParams.get('resource_type')
  const resourceId = searchParams.get('resource_id')

  let asGranteeQuery = supabase
    .from('project_collaborations')
    .select('*, projects(id, name, city, status)')
    .eq('grantee_user_id', user.id)
    .in('status', ['pending', 'accepted'])

  let asInviterQuery = supabase
    .from('project_collaborations')
    .select('*, projects(id, name, city, status)')
    .eq('invited_by', user.id)

  if (resourceType && resourceId) {
    if (resourceType === 'project') {
      asGranteeQuery = asGranteeQuery.eq('project_id', resourceId)
      asInviterQuery = asInviterQuery.eq('project_id', resourceId)
    } else if (resourceType === 'report') {
      asGranteeQuery = asGranteeQuery.eq('report_id', resourceId)
      asInviterQuery = asInviterQuery.eq('report_id', resourceId)
    }
  }

  const [{ data: asGrantee }, { data: asInviter }] = await Promise.all([
    asGranteeQuery.order('created_at', { ascending: false }),
    asInviterQuery.order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    received: asGrantee ?? [],
    sent: asInviter ?? [],
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { project_id, report_id, grantee_email, grantee_user_id, scope, expires_days } = body

  if (!project_id || !scope || (!grantee_email && !grantee_user_id)) {
    return NextResponse.json(
      { error: 'Missing required fields: project_id, scope, and either grantee_email or grantee_user_id' },
      { status: 400 },
    )
  }

  if (!['view', 'comment', 'edit'].includes(scope)) {
    return NextResponse.json({ error: 'Invalid scope. Must be view, comment, or edit' }, { status: 400 })
  }

  let resolvedGranteeUserId: string | null = grantee_user_id ?? null

  // Fallback lookup for legacy callers that only send email.
  if (!resolvedGranteeUserId && grantee_email) {
    const { data: granteeProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', grantee_email)
      .maybeSingle()

    resolvedGranteeUserId = granteeProfile?.id ?? null
  }

  if (!resolvedGranteeUserId) {
    return NextResponse.json(
      { error: 'Could not resolve grantee user. Provide grantee_user_id or a visible existing grantee_email.' },
      { status: 400 },
    )
  }

  const invite_token = crypto.randomUUID()
  const expires_at = expires_days
    ? new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { data: existingPublic } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .single()

  if (!existingPublic?.id) {
    return NextResponse.json(
      { error: 'Invalid project_id — project is missing its public workspace record' },
      { status: 400 },
    )
  }

  const { data: collaboration, error } = await supabase
    .from('project_collaborations')
    .insert({
      project_id,
      report_id: report_id ?? null,
      grantee_user_id: resolvedGranteeUserId,
      scope,
      status: 'pending',
      invite_token,
      invited_by: user.id,
      expires_at,
    })
    .select()
    .single()

  if (error) {
    const message = (error.message || '').toLowerCase()

    if (error.code === '42501' || message.includes('row-level security')) {
      return NextResponse.json(
        { error: 'Forbidden: you do not have permission to create a collaboration for this project' },
        { status: 403 },
      )
    }

    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Invalid project_id or report_id' },
        { status: 400 },
      )
    }

    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'Invalid grantee target. Provide a valid grantee_user_id or resolvable grantee_email.' },
        { status: 400 },
      )
    }

    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A collaboration with the same invite token already exists' },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit trail
  await supabase.from('audit_events').insert({
    action: 'collaboration.created',
    actor_id: user.id,
    resource_type: 'collaboration',
    resource_id: collaboration.id,
    details: { grantee_email: grantee_email ?? null, grantee_user_id: resolvedGranteeUserId, scope, project_id, report_id: report_id ?? null },
  })

  // Send invitation email (non-blocking — failures don't break the response)
  try {
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'An FeasiAI user'
    const baseUrl = getEmailActionBaseUrl(request)
    const acceptUrl = `${baseUrl}/api/collaborations/${invite_token}/accept`
    const html = collaborationInviteEmail(inviterName, 'project', acceptUrl)
    if (grantee_email) {
      await sendEmail({ to: grantee_email, subject: "You've been invited to collaborate on FeasiAI", html })
    }
  } catch (emailErr) {
    console.error('Failed to send collaboration invite email:', emailErr)
  }

  return NextResponse.json({ ...collaboration, invite_token }, { status: 201 })
}
