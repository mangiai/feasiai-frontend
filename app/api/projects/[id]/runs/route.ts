import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, getSupabaseForAuth } from '@/lib/api-auth'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import { assertLegacyProjectAccess, getAdminSupabase } from '@/lib/server/access-control'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const adminSupabase = getAdminSupabase()

    if (!auth.isApiKey) {
      const access = await assertLegacyProjectAccess({ userId: auth.userId!, projectId: id })
      if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status })
      }
    }

    const supabase = auth.isApiKey ? await getSupabaseForAuth(auth) : adminSupabase

    // Optional filter by flow_phase
    const { searchParams } = new URL(request.url)
    const flowPhase = searchParams.get('flow_phase')

    let query = supabase
      .schema(APP_DB_SCHEMA)
      .from('outputs')
      .select('id, flow_phase, version, agent_duration_ms, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (flowPhase) {
      query = query.eq('flow_phase', flowPhase)
    }

    const { data: outputs, error: outputsError } = await query

    if (outputsError) {
      console.error('Error fetching runs:', outputsError)
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
    }

    return NextResponse.json({
      project_id: id,
      total_runs: outputs?.length || 0,
      runs: outputs || [],
    })
  } catch (error) {
    console.error('Error fetching runs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
