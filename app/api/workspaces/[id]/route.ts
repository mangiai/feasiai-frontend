import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/server/access-control'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Only workspace owners can delete a workspace
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json({ error: 'Only workspace owners can delete workspaces' }, { status: 403 })
  }

  let admin
  try {
    admin = getAdminSupabase()
  } catch {
    return NextResponse.json(
      { error: 'Server misconfiguration: Supabase service role is not set' },
      { status: 503 },
    )
  }

  const nowIso = new Date().toISOString()

  // Soft-delete workspace and deactivate memberships so it disappears from the UI immediately.
  const { error: wsError } = await admin
    .from('workspaces')
    .update({ deleted_at: nowIso, deleted_by: user.id })
    .eq('id', id)
    .is('deleted_at', null)

  if (wsError) {
    console.error('[api/workspaces/:id] soft delete workspace:', wsError)
    return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 })
  }

  const { error: memError } = await admin
    .from('workspace_memberships')
    .update({ is_active: false })
    .eq('workspace_id', id)
    .eq('is_active', true)

  if (memError) {
    console.error('[api/workspaces/:id] deactivate memberships:', memError)
    // Keep delete successful even if memberships update fails; RLS should hide deleted workspace anyway.
  }

  return NextResponse.json({ success: true })
}

