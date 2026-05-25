import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { APP_DB_SCHEMA } from '@/lib/app-schema'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Projects live in the app schema
  const { data: project } = await supabase
    .schema(APP_DB_SCHEMA)
    .from('projects')
    .select('id, user_id, status')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const PROCESSING_STATUSES = ['processing', 'processing-phase1', 'processing-phase2', 'processing-feasibility']
  if (!PROCESSING_STATUSES.includes(project.status)) {
    return NextResponse.json(
      { error: 'Project is not currently processing' },
      { status: 409 }
    )
  }

  // Set status to paused; keep resume_params so the user can resume later.
  const updatedAt = new Date().toISOString()
  const { error: pauseError } = await supabase
    .schema(APP_DB_SCHEMA)
    .from('projects')
    .update({ status: 'paused', updated_at: updatedAt })
    .eq('id', id)

  if (pauseError) {
    return NextResponse.json({ error: 'Failed to pause project' }, { status: 500 })
  }

  const { error: mirrorError } = await supabase
    .from('projects')
    .update({ status: 'paused', current_phase: 'paused', updated_at: updatedAt })
    .eq('id', id)

  if (mirrorError) {
    console.warn('[pause] Failed to mirror paused status into public.projects', mirrorError)
  }

  return NextResponse.json({ status: 'paused', project_id: id })
}
