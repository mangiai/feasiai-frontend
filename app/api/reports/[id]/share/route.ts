import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { assertReportAccess, getAdminSupabase } from '@/lib/server/access-control'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
    .select('is_public, public_token')
    .eq('id', id)
    .single()

  if (error || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  return NextResponse.json({
    is_shared: !!report.public_token,
    share_token: report.public_token,
    is_public: report.is_public,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  // Check report exists and belongs to user's workspace
  const { data: report, error: fetchErr } = await adminSupabase
    .from('reports')
    .select('id, public_token')
    .eq('id', id)
    .single()

  if (fetchErr || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // If already shared, return the existing token
  if (report.public_token) {
    return NextResponse.json({
      is_shared: true,
      share_token: report.public_token,
    })
  }

  const token = randomUUID()

  const { error: updateErr } = await adminSupabase
    .from('reports')
    .update({ public_token: token, is_public: true })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }

  return NextResponse.json({ is_shared: true, share_token: token })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const { error } = await adminSupabase
    .from('reports')
    .update({ public_token: null, is_public: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to unshare report' }, { status: 500 })
  }

  return NextResponse.json({ is_shared: false, share_token: null })
}
