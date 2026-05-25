import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getSupabaseForAuth } from '@/lib/api-auth'
import { APP_DB_SCHEMA } from '@/lib/app-schema'

const CANCELLABLE_STATUSES = [
  'processing',
  'processing-phase1',
  'processing-phase2',
  'processing-feasibility',
  'awaiting-answers',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await getSupabaseForAuth(auth)

    // Fetch project to validate ownership and status
    const { data: project, error: projectError } = await supabase
      .schema(APP_DB_SCHEMA)
      .from('projects')
      .select('id, status, user_id, is_demo')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Browser auth: check ownership (demo projects are accessible to all)
    if (!auth.isApiKey && project.user_id !== auth.userId && !project.is_demo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow cancelling projects that are in a processing state
    if (!CANCELLABLE_STATUSES.includes(project.status)) {
      return NextResponse.json(
        { error: `Cannot cancel project in '${project.status}' state` },
        { status: 409 }
      )
    }

    const updatedAt = new Date().toISOString()

    // Update status to failed with cancellation message
    const { error: updateError } = await supabase
      .schema(APP_DB_SCHEMA)
      .from('projects')
      .update({
        status: 'failed',
        error_message: 'Cancelled by user',
        updated_at: updatedAt,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Failed to cancel project:', updateError)
      return NextResponse.json({ error: 'Failed to cancel project' }, { status: 500 })
    }

    // Cancel any active pipeline runs (public schema)
    const { data: run } = await supabase
      .from('pipeline_runs')
      .update({ status: 'cancelled', completed_at: updatedAt })
      .eq('project_id', id)
      .in('status', ['running', 'paused_manual', 'queued'])
      .select()
      .single()

    // Mirror the legacy cancellation semantics into public.projects without losing the cancellation reason.
    const { error: mirrorError } = await supabase
      .from('projects')
      .update({ status: 'failed', current_phase: 'cancelled', updated_at: updatedAt })
      .eq('id', id)

    if (mirrorError) {
      console.warn('[cancel] Failed to mirror cancelled status into public.projects', mirrorError)
    }

    return NextResponse.json({ success: true, status: 'cancelled', run: run ?? null })
  } catch (error) {
    console.error('Error cancelling project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
