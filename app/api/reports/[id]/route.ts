import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertReportAccess, getAdminSupabase } from '@/lib/server/access-control'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = getAdminSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await assertReportAccess({ userId: user.id, reportId: id })
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { data: report, error } = await adminSupabase
    .from('reports')
    .select('*, projects:project_id(id, name, address, city, state, status), report_versions(id, version_number, change_summary, created_at, created_by)')
    .eq('id', id)
    .single()

  if (error || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // If user is not staff, hide unapproved reports completely.
  if (!access.systemRole && report.verification_status !== 'verified') {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const { report_versions, projects, ...reportData } = report as Record<string, unknown>
  const canEdit = Boolean(
    access.systemRole === 'super_admin' ||
    access.systemRole === 'reviewer' ||
    access.systemRole === 'expert' ||
    ['owner', 'admin', 'member'].includes(access.membershipRole ?? '') ||
    ['edit', 'verify'].includes(access.collaborationScope ?? ''),
  )

  return NextResponse.json({
    report: reportData,
    project: projects ?? null,
    versions: report_versions ?? [],
    can_edit: canEdit,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = getAdminSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await assertReportAccess({
    userId: user.id,
    reportId: id,
    workspaceRoles: ['owner', 'admin', 'member'],
    collaborationScopes: ['edit', 'verify'],
    allowStaff: true,
    requiredStaffRoles: ['super_admin', 'expert'],
  })

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const body = await request.json()
  const { content, title, status } = body

  // Fetch current report to get the current version
  const { data: existing, error: fetchError } = await adminSupabase
    .from('reports')
    .select('current_version, verification_status')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const nextVersion = existing.current_version + 1
  const shouldResetVerification =
    existing.verification_status === 'verified' &&
    (content !== undefined || title !== undefined)

  // Build update payload with only provided fields
  const updates: Record<string, unknown> = {
    current_version: nextVersion,
    updated_at: new Date().toISOString(),
  }
  if (content !== undefined) updates.content = content
  if (title !== undefined) updates.title = title
  if (status !== undefined) updates.status = status
  if (shouldResetVerification) {
    updates.verification_status = 'pending'
    updates.verified_at = null
    updates.verified_by = null
    updates.verification_notes = null
  }

  const { data: report, error: updateError } = await adminSupabase
    .from('reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }

  // Create a version entry
  const changeParts: string[] = []
  if (title !== undefined) changeParts.push('Updated title')
  if (content !== undefined) changeParts.push('Updated content')
  if (status !== undefined) changeParts.push(`Status changed to ${status}`)
  if (shouldResetVerification) changeParts.push('Verification reset to pending')
  const changeSummary = changeParts.join('; ') || 'Updated report'

  await adminSupabase.from('report_versions').insert({
    report_id: id,
    version_number: nextVersion,
    change_summary: changeSummary,
    created_by: user.id,
    content: content ?? report.content ?? {},
  })

  return NextResponse.json({ report })
}
