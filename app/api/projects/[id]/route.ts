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

    const { data: project, error: projectError } = await supabase
      .schema(APP_DB_SCHEMA)
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch recent messages (last 50, chronological)
    const { data: messages } = await supabase
      .schema(APP_DB_SCHEMA)
      .from('messages')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Fetch latest output — exclude internal metadata (raw_artifacts, validation internals, cost)
    const { data: outputs } = await supabase
      .schema(APP_DB_SCHEMA)
      .from('outputs')
      .select('id, project_id, flow_phase, version, corrections_letter_md, corrections_letter_pdf_path, review_checklist_json, corrections_analysis_json, contractor_questions_json, response_letter_md, response_letter_pdf_path, professional_scope_md, corrections_report_md, feasibility_report_md, strategy_comparison_json, executive_summary_md, plan_analysis_json, agent_duration_ms, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)

    // Fetch contractor answers
    const { data: answers } = await supabase
      .schema(APP_DB_SCHEMA)
      .from('contractor_answers')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true })

    // Fetch files
    const { data: files } = await supabase
      .schema(APP_DB_SCHEMA)
      .from('files')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true })

    // Filter out internal system messages (pipeline step markers, model names, cost data)
    const INTERNAL_MSG_PATTERNS = /^\[LOCAL \d|^\[PHASE:|^Completed in .* turns|^Processing outputs|^Processing complete|model:|cost:/i
    const safeMessages = (messages || [])
      .filter((m: Record<string, unknown>) =>
        m.role !== 'system' || (typeof m.content === 'string' && !INTERNAL_MSG_PATTERNS.test(m.content))
      )
      .reverse()

    return NextResponse.json({
      project,
      files: files || [],
      messages: safeMessages,
      latest_output: outputs?.[0] || null,
      contractor_answers: answers || [],
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
