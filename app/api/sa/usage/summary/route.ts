import { NextRequest, NextResponse } from 'next/server'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import { assertSuperAdmin } from '../_auth'
import { parseUsageRange } from '../_range'

type TokenUsagePayload = {
  stage?: string
  provider?: string
  model?: string
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  cost_usd?: number
  metadata?: Record<string, unknown>
}

type OrchEventRow = {
  ts: string
  payload: unknown
}

type UsageAggregate = {
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  events: number
}

function createAggregate(): UsageAggregate {
  return { input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0, events: 0 }
}

function buildDailyBuckets(startIso: string, endIso: string) {
  const buckets: Record<string, UsageAggregate> = {}
  const cursor = new Date(startIso)
  cursor.setUTCHours(0, 0, 0, 0)
  const end = new Date(endIso)
  end.setUTCHours(0, 0, 0, 0)

  for (let guard = 0; cursor.getTime() <= end.getTime() && guard < 371; guard += 1) {
    buckets[cursor.toISOString().slice(0, 10)] = createAggregate()
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return buckets
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

  // Pull token_usage events in the window. Keep an upper bound to avoid runaway payloads.
  const { data: events, error } = await auth.adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('orchestration_events')
    .select('run_id, ts, payload')
    .eq('event_type', 'token_usage')
    .gte('ts', range.startIso)
    .lte('ts', range.endIso)
    .order('ts', { ascending: false })
    .limit(50000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const totals = {
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    cost_usd: 0,
  }

  const byStage: Record<string, typeof totals & { events: number }> = {}
  const byModel: Record<string, typeof totals & { events: number }> = {}
  const byProvider: Record<string, typeof totals & { events: number }> = {}
  const timeline = buildDailyBuckets(range.startIso, range.endIso)

  for (const ev of (events ?? []) as OrchEventRow[]) {
    const p = (ev.payload as TokenUsagePayload) || {}
    const stage = (p.stage || 'unknown').toString()
    const model = (p.model || 'unknown').toString()
    const provider = (p.provider || 'unknown').toString()

    const input = Number(p.input_tokens || 0)
    const output = Number(p.output_tokens || 0)
    const total = Number(p.total_tokens || (input + output) || 0)
    const cost = Number(p.cost_usd || 0)

    totals.input_tokens += input
    totals.output_tokens += output
    totals.total_tokens += total
    totals.cost_usd += cost

    const add = (bucket: Record<string, typeof totals & { events: number }>, key: string) => {
      bucket[key] = bucket[key] || { input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0, events: 0 }
      bucket[key].input_tokens += input
      bucket[key].output_tokens += output
      bucket[key].total_tokens += total
      bucket[key].cost_usd += cost
      bucket[key].events += 1
    }

    add(byStage, stage)
    add(byModel, model)
    add(byProvider, provider)

    const bucketKey = typeof ev.ts === 'string' ? ev.ts.slice(0, 10) : ''
    if (bucketKey && timeline[bucketKey]) {
      timeline[bucketKey].input_tokens += input
      timeline[bucketKey].output_tokens += output
      timeline[bucketKey].total_tokens += total
      timeline[bucketKey].cost_usd += cost
      timeline[bucketKey].events += 1
    }
  }

  return NextResponse.json({
    window: range.label,
    range: range.preset,
    range_label: range.label,
    start_iso: range.startIso,
    end_iso: range.endIso,
    totals,
    by_stage: byStage,
    by_model: byModel,
    by_provider: byProvider,
    timeline: Object.entries(timeline).map(([date, values]) => ({ date, ...values })),
    note: 'Aggregated from orchestration_events(event_type=token_usage).',
  })
}

