import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CollaborationScope, ProjectCollaborationUpdate } from '@/types/database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the current user is the inviter
  const { data: existing } = await supabase
    .from('project_collaborations')
    .select('*')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 })
  }

  if (existing.invited_by !== user.id) {
    return NextResponse.json({ error: 'Only the inviter can update this collaboration' }, { status: 403 })
  }

  const body = await request.json()
  const updates: Pick<ProjectCollaborationUpdate, 'scope' | 'expires_at'> = {}

  if (body.scope) {
    if (!['view', 'comment', 'edit'].includes(body.scope)) {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
    }
    updates.scope = body.scope as CollaborationScope
  }

  if (body.expires_at) {
    updates.expires_at = String(body.expires_at)
  }

  const { data: updated, error } = await supabase
    .from('project_collaborations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit trail
  await supabase.from('audit_events').insert({
    action: 'collaboration.updated',
    actor_id: user.id,
    resource_type: 'collaboration',
    resource_id: id,
    details: JSON.parse(JSON.stringify({ updates })),
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the current user is the inviter
  const { data: existing } = await supabase
    .from('project_collaborations')
    .select('invited_by')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 })
  }

  if (existing.invited_by !== user.id) {
    return NextResponse.json({ error: 'Only the inviter can revoke this collaboration' }, { status: 403 })
  }

  const { error } = await supabase
    .from('project_collaborations')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit trail
  await supabase.from('audit_events').insert({
    action: 'collaboration.revoked',
    actor_id: user.id,
    resource_type: 'collaboration',
    resource_id: id,
    details: { revoked_at: new Date().toISOString() },
  })

  return NextResponse.json({ success: true })
}
