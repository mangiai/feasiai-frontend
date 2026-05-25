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

  const { data: feedback, error } = await adminSupabase
    .from('report_feedback')
    .select('*')
    .eq('report_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }

  return NextResponse.json({ feedback: feedback ?? [] })
}

export async function POST(
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
    collaborationScopes: ['comment', 'edit', 'verify'],
  })

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const body = await request.json()
  const {
    version_from,
    version_to,
    section_path,
    original_content,
    corrected_content,
    correction_type,
  } = body

  if (!section_path || !original_content || !corrected_content || !correction_type) {
    return NextResponse.json(
      { error: 'section_path, original_content, corrected_content, and correction_type are required' },
      { status: 400 }
    )
  }

  const { data: feedback, error } = await adminSupabase
    .from('report_feedback')
    .insert({
      report_id: id,
      corrected_by: user.id,
      version_from: version_from ?? 0,
      version_to: version_to ?? 0,
      section_path,
      original_content,
      corrected_content,
      correction_type,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }

  return NextResponse.json({ feedback }, { status: 201 })
}
