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

  const { data: comments, error } = await adminSupabase
    .from('report_comments')
    .select('*')
    .eq('report_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }

  return NextResponse.json({ comments: comments ?? [] })
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
  const { content, anchor_id, anchor_text, parent_id } = body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const { data: comment, error } = await adminSupabase
    .from('report_comments')
    .insert({
      report_id: id,
      created_by: user.id,
      content: content.trim(),
      anchor_id: anchor_id ?? null,
      anchor_text: anchor_text ?? null,
      parent_id: parent_id ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }

  return NextResponse.json({ comment }, { status: 201 })
}
