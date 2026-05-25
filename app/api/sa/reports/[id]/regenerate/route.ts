import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import { getServerBaseUrl, SERVER_URL_ERROR_HINT } from '@/lib/http/server-base'
import {
  loadPreservedFeasibilityInput,
  preservedInputToGenerateBody,
} from '@/lib/sa/preserved-feasibility-input'

const PROCESSING_STATUSES = new Set([
  'processing',
  'processing-phase1',
  'processing-phase2',
  'processing-feasibility',
  'awaiting-answers',
  'paused',
])

async function assertSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, status: 401, message: 'Unauthorized', userId: null, accessToken: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'super_admin') {
    return { ok: false as const, status: 403, message: 'Forbidden', userId: null, accessToken: null }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return {
    ok: true as const,
    userId: user.id,
    accessToken: session?.access_token ?? null,
    adminSupabase: (await import('@/lib/server/access-control')).getAdminSupabase(),
  }
}

async function loadReportContext(reportId: string, adminSupabase: ReturnType<typeof import('@/lib/server/access-control').getAdminSupabase>) {
  const { data: report, error } = await adminSupabase
    .from('reports')
    .select('id, project_id, report_type, title, content, current_version, verification_status')
    .eq('id', reportId)
    .single()

  if (error || !report) return null

  const [{ data: legacy }, { data: pub }] = await Promise.all([
    adminSupabase
      .schema(APP_DB_SCHEMA)
      .from('projects')
      .select('id, user_id, status, project_address, city')
      .eq('id', report.project_id)
      .maybeSingle(),
    adminSupabase
      .from('projects')
      .select('id, created_by, status, address, city')
      .eq('id', report.project_id)
      .maybeSingle(),
  ])

  if (!legacy || !pub) return null

  return { report, legacy, pub }
}

/** GET — regeneration status, preserved inputs, version history */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await assertSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { id: reportId } = await params
  const ctx = await loadReportContext(reportId, auth.adminSupabase)
  if (!ctx) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const preservedInputs = await loadPreservedFeasibilityInput(auth.adminSupabase, ctx.report.project_id)

  const [{ data: versions }, { data: outputs }] = await Promise.all([
    auth.adminSupabase
      .from('report_versions')
      .select('id, version_number, change_summary, change_type, created_at, created_by')
      .eq('report_id', reportId)
      .order('version_number', { ascending: false }),
    auth.adminSupabase
      .schema(APP_DB_SCHEMA)
      .from('outputs')
      .select('id, version, agent_duration_ms, created_at, validation_status, confidence_score')
      .eq('project_id', ctx.report.project_id)
      .eq('flow_phase', 'feasibility')
      .order('version', { ascending: false }),
  ])

  const projectStatus = ctx.legacy.status ?? ctx.pub.status
  const isProcessing = PROCESSING_STATUSES.has(String(projectStatus))

  return NextResponse.json({
    report_id: reportId,
    project_id: ctx.report.project_id,
    project_status: projectStatus,
    is_processing: isProcessing,
    current_report_version: ctx.report.current_version,
    preserved_inputs: preservedInputs,
    report_versions: versions ?? [],
    pipeline_outputs: outputs ?? [],
  })
}

/** POST — snapshot current report, then re-run feasibility with preserved inputs */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await assertSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (!auth.accessToken) {
    return NextResponse.json({ error: 'Missing session token' }, { status: 401 })
  }

  const { id: reportId } = await params
  const ctx = await loadReportContext(reportId, auth.adminSupabase)
  if (!ctx) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (ctx.report.report_type !== 'feasibility') {
    return NextResponse.json({ error: 'Only feasibility reports can be regenerated' }, { status: 400 })
  }

  const projectStatus = String(ctx.legacy.status ?? '')
  if (PROCESSING_STATUSES.has(projectStatus)) {
    return NextResponse.json(
      { error: `Project is already running (status: ${projectStatus})` },
      { status: 409 },
    )
  }

  const preservedInputs = await loadPreservedFeasibilityInput(auth.adminSupabase, ctx.report.project_id)
  const runAsUserId = ctx.legacy.user_id || ctx.pub.created_by

  // Snapshot current report content before overwriting
  const { error: versionErr } = await auth.adminSupabase.from('report_versions').insert({
    report_id: reportId,
    version_number: ctx.report.current_version,
    content: ctx.report.content,
    change_summary: `Before pipeline regeneration (v${ctx.report.current_version})`,
    change_type: 'pipeline_regeneration',
    created_by: auth.userId,
  })

  if (versionErr && versionErr.code !== '23505') {
    return NextResponse.json(
      { error: `Failed to snapshot report version: ${versionErr.message}` },
      { status: 500 },
    )
  }

  const resumePayload = preservedInputToGenerateBody(
    ctx.report.project_id,
    runAsUserId,
    preservedInputs,
    reportId,
  )

  await auth.adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('projects')
    .update({
      resume_params: resumePayload,
      status: 'ready',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ctx.report.project_id)

  await auth.adminSupabase
    .from('reports')
    .update({
      verification_status: 'pending',
      status: 'in_review',
      verified_at: null,
      verified_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  const serverBaseUrl = getServerBaseUrl()
  if (!serverBaseUrl) {
    return NextResponse.json({ error: SERVER_URL_ERROR_HINT }, { status: 500 })
  }

  const adminSecret = process.env.ADMIN_SECRET
  const generateRes = await fetch(`${serverBaseUrl}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
      ...(adminSecret ? { 'x-admin-secret': adminSecret } : {}),
    },
    body: JSON.stringify(resumePayload),
  })

  if (!generateRes.ok) {
    const errBody = await generateRes.json().catch(() => ({}))
    return NextResponse.json(
      {
        error: typeof errBody?.error === 'string' ? errBody.error : `Generation server error (${generateRes.status})`,
      },
      { status: generateRes.status >= 500 ? 502 : generateRes.status },
    )
  }

  await auth.adminSupabase.from('audit_events').insert({
    action: 'sa.report_regenerate',
    actor_id: auth.userId,
    resource_type: 'report',
    resource_id: reportId,
    details: {
      project_id: ctx.report.project_id,
      preserved_inputs: preservedInputs,
      run_as_user_id: runAsUserId,
    },
  })

  return NextResponse.json({
    success: true,
    message: 'Feasibility regeneration started',
    report_id: reportId,
    project_id: ctx.report.project_id,
    preserved_inputs: preservedInputs,
  })
}
