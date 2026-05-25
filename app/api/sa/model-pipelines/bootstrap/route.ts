import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerBaseUrl, SERVER_URL_ERROR_HINT } from '@/lib/http/server-base'
import {
  DEFAULT_FEASIBILITY_PIPELINE_CONFIG,
  DEFAULT_FEASIBILITY_PIPELINE_DESCRIPTION,
  DEFAULT_FEASIBILITY_PIPELINE_NAME,
} from '@/lib/sa/default-feasibility-pipeline'
import { asModelPipelineDb, type ModelPipelineConfigRow } from '@/lib/sa/model-pipeline-db'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, message: 'Unauthorized', supabase: null, userId: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'super_admin') {
    return { ok: false as const, status: 403, message: 'Forbidden', supabase: null, userId: null }
  }

  return { ok: true as const, supabase, userId: user.id }
}

export async function POST() {
  const auth = await assertSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET is not configured — cannot push to runtime' },
      { status: 503 },
    )
  }

  const db = asModelPipelineDb(auth.supabase)
  const config = {
    ...DEFAULT_FEASIBILITY_PIPELINE_CONFIG,
    env: { ...DEFAULT_FEASIBILITY_PIPELINE_CONFIG.env },
    models: { ...DEFAULT_FEASIBILITY_PIPELINE_CONFIG.models },
  }

  await db
    .from('model_pipeline_configs')
    .update({ is_active: false })
    .eq('is_active', true)

  const { data: existing } = await db
    .from<Pick<ModelPipelineConfigRow, 'id'>>('model_pipeline_configs')
    .select('id')
    .eq('name', DEFAULT_FEASIBILITY_PIPELINE_NAME)
    .maybeSingle()

  let pipelineId: string
  let pipelineRow: ModelPipelineConfigRow | null = null

  if (existing?.id) {
    const updateRes = await db
      .from<ModelPipelineConfigRow>('model_pipeline_configs')
      .update({
        description: DEFAULT_FEASIBILITY_PIPELINE_DESCRIPTION,
        config,
        is_active: true,
        updated_by: auth.userId,
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (updateRes.error) {
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 })
    }
    pipelineRow = updateRes.data
    pipelineId = String(updateRes.data?.id ?? existing.id)
  } else {
    const insertRes = await db
      .from<ModelPipelineConfigRow>('model_pipeline_configs')
      .insert({
        name: DEFAULT_FEASIBILITY_PIPELINE_NAME,
        description: DEFAULT_FEASIBILITY_PIPELINE_DESCRIPTION,
        config,
        is_active: true,
        created_by: auth.userId,
        updated_by: auth.userId,
      })
      .select('*')
      .single()

    if (insertRes.error) {
      return NextResponse.json({ error: insertRes.error.message }, { status: 500 })
    }
    pipelineRow = insertRes.data
    pipelineId = String(insertRes.data?.id ?? '')
  }

  await db
    .from('model_pipeline_configs')
    .update({ is_active: false })
    .eq('name', 'default-groq')

  const serverBase = getServerBaseUrl()
  if (!serverBase) {
    return NextResponse.json(
      {
        error: `Pipeline saved but server not configured (${SERVER_URL_ERROR_HINT})`,
        pipeline: { id: pipelineId, name: DEFAULT_FEASIBILITY_PIPELINE_NAME },
      },
      { status: 502 },
    )
  }

  const applyRes = await fetch(`${serverBase}/admin/apply-pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': adminSecret,
    },
    body: JSON.stringify({ config }),
  })

  const applyData = await applyRes.json().catch(() => ({}))
  if (!applyRes.ok) {
    return NextResponse.json(
      {
        error: applyData?.error ?? 'Pipeline activated in DB but runtime apply failed',
        pipeline: { id: pipelineId, name: DEFAULT_FEASIBILITY_PIPELINE_NAME },
      },
      { status: applyRes.status },
    )
  }

  return NextResponse.json({
    ok: true,
    pipeline: pipelineRow ?? { id: pipelineId, name: DEFAULT_FEASIBILITY_PIPELINE_NAME, config },
    runtime: applyData,
  })
}
