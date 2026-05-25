import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { asModelPipelineDb, type ModelPipelineConfigRow } from '@/lib/sa/model-pipeline-db'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, status: 401, message: 'Unauthorized', supabase: null, userId: null }
  }

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

export async function GET() {
  const auth = await assertSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const db = asModelPipelineDb(auth.supabase)
  const { data, error } = await db
    .from<ModelPipelineConfigRow>('model_pipeline_configs')
    .select('*')
    .order('is_active', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pipelines: data ?? [] })
}

export async function PUT(request: Request) {
  const auth = await assertSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json()
  const {
    id,
    name,
    description,
    config,
    is_active,
    action,
  } = body ?? {}

  const db = asModelPipelineDb(auth.supabase)

  if (action === 'activate') {
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Pipeline id is required for activation.' }, { status: 400 })
    }

    const deactivateRes = await db
      .from('model_pipeline_configs')
      .update({ is_active: false, updated_by: auth.userId })
      .neq('id', id)

    if (deactivateRes.error) {
      return NextResponse.json({ error: deactivateRes.error.message }, { status: 500 })
    }

    const activateRes = await db
      .from<ModelPipelineConfigRow>('model_pipeline_configs')
      .update({ is_active: true, updated_by: auth.userId })
      .eq('id', id)
      .select('*')
      .single()

    if (activateRes.error) {
      return NextResponse.json({ error: activateRes.error.message }, { status: 500 })
    }

    return NextResponse.json({ pipeline: activateRes.data })
  }

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Pipeline name is required.' }, { status: 400 })
  }

  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Pipeline config must be an object.' }, { status: 400 })
  }

  const payload = {
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() : null,
    config,
    is_active: Boolean(is_active),
    updated_by: auth.userId,
  }

  if (id && typeof id === 'string') {
    const { data, error } = await db
      .from<ModelPipelineConfigRow>('model_pipeline_configs')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pipeline: data })
  }

  const { data, error } = await db
    .from<ModelPipelineConfigRow>('model_pipeline_configs')
    .insert({
      ...payload,
      created_by: auth.userId,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pipeline: data }, { status: 201 })
}
