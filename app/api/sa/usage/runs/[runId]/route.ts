import { NextRequest, NextResponse } from 'next/server'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import { assertSuperAdmin } from '../../_auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const auth = await assertSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { runId } = await params
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 })
  }

  const { data: run, error: runErr } = await auth.adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle()

  if (runErr) {
    return NextResponse.json({ error: runErr.message }, { status: 500 })
  }
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  const { data: events, error: evErr } = await auth.adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('orchestration_events')
    .select('*')
    .eq('run_id', runId)
    .order('seq', { ascending: true })

  if (evErr) {
    return NextResponse.json({ error: evErr.message }, { status: 500 })
  }

  return NextResponse.json({
    run,
    events: events ?? [],
  })
}

