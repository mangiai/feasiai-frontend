import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/server/access-control'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: memberships, error } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role, workspaces(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 })
  }

  const workspaces = memberships?.map((m: Record<string, unknown>) => ({
    ...(m.workspaces as Record<string, unknown>),
    role: m.role,
  })) ?? []

  return NextResponse.json(workspaces)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const body = await request.json()
  const { name, type } = body

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
  }

  const workspaceType = type === 'team' ? 'team' : 'personal'
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // Service role: RLS blocks user-scoped inserts here (billing trigger + first membership).
  // Session is still verified above; created_by / membership are tied to this user only.
  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .insert({
      name: name.trim(),
      slug: `${slug}-${Date.now().toString(36)}`,
      type: workspaceType,
      created_by: user.id,
    })
    .select()
    .single()

  if (wsError) {
    console.error('[api/workspaces] insert workspace:', wsError)
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
  }

  // Add creator as owner member
  const { error: memError } = await admin
    .from('workspace_memberships')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memError) {
    console.error('[api/workspaces] insert membership:', memError)
    await admin.from('workspaces').delete().eq('id', workspace.id)
    return NextResponse.json({ error: 'Failed to set up workspace membership' }, { status: 500 })
  }

  return NextResponse.json(workspace, { status: 201 })
}
