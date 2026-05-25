import { NextRequest, NextResponse } from 'next/server'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import { assertSuperAdmin } from '../_auth'
import { parseUsageRange } from '../_range'

type AgentRunRow = {
  id: string
  project_id: string | null
  user_id: string | null
  workspace_id: string | null
  flow_type: string
  status: string
  started_at: string | null
  completed_at: string | null
  input_tokens: number | null
  output_tokens: number | null
  cost_usd: number | string | null
  metadata: Record<string, unknown> | null
}

type TokenUsagePayload = {
  stage?: string
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  cost_usd?: number
}

type OrchEventRow = {
  run_id: string | null
  payload: unknown
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.floor(parsed), 1), max)
}

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const range = parseUsageRange(searchParams)
  if (!range.ok) {
    return NextResponse.json({ error: range.message }, { status: 400 })
  }

  const status = searchParams.get('status')
  const limit = parsePositiveInt(searchParams.get('limit'), 50, 100)
  const page = parsePositiveInt(searchParams.get('page'), 1, 100_000)
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = auth.adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('agent_runs')
    .select('id, project_id, user_id, workspace_id, flow_type, status, started_at, completed_at, input_tokens, output_tokens, cost_usd, metadata', { count: 'exact' })
    .gte('created_at', range.startIso)
    .lte('created_at', range.endIso)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: runs, error, count } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const typedRuns = (runs ?? []) as AgentRunRow[]
  const runIds = typedRuns.map((r) => r.id).filter(Boolean)

  // Fetch token_usage events for just these runs and roll them up by stage.
  const { data: events } = runIds.length
    ? await auth.adminSupabase
      .schema(APP_DB_SCHEMA)
      .from('orchestration_events')
      .select('run_id, payload')
      .eq('event_type', 'token_usage')
      .in('run_id', runIds)
      .gte('ts', range.startIso)
      .lte('ts', range.endIso)
      .order('seq', { ascending: true })
    : { data: [] as OrchEventRow[] }

  const stageByRun: Record<string, Record<string, { input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number; events: number }>> = {}
  for (const ev of ((events ?? []) as OrchEventRow[])) {
    const runId = String(ev.run_id ?? '')
    if (!runId) continue
    const p = (ev.payload || {}) as TokenUsagePayload
    const stage = String(p.stage || 'unknown')
    const input = Number(p.input_tokens || 0)
    const output = Number(p.output_tokens || 0)
    const total = Number(p.total_tokens || (input + output) || 0)
    const cost = Number(p.cost_usd || 0)

    stageByRun[runId] = stageByRun[runId] || {}
    stageByRun[runId][stage] = stageByRun[runId][stage] || { input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0, events: 0 }
    stageByRun[runId][stage].input_tokens += input
    stageByRun[runId][stage].output_tokens += output
    stageByRun[runId][stage].total_tokens += total
    stageByRun[runId][stage].cost_usd += cost
    stageByRun[runId][stage].events += 1
  }

  return NextResponse.json({
    range: range.preset,
    range_label: range.label,
    start_iso: range.startIso,
    end_iso: range.endIso,
    total: count ?? typedRuns.length,
    page,
    page_size: limit,
    total_pages: Math.max(1, Math.ceil((count ?? typedRuns.length) / limit)),
    runs: typedRuns.map((r) => ({
      ...r,
      stage_breakdown: stageByRun[String(r.id)] || {},
    })),
  })
}

