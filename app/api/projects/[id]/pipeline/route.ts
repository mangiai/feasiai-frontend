import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBillableRunPricing, type PricingTier } from '@/lib/pricing'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: runs, error } = await supabase
    .from('pipeline_runs')
    .select('*, pipeline_messages(id, role, content, agent_name, phase, created_at)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
  }

  return NextResponse.json({ runs: runs ?? [] })
}

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

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { data: billing } = await supabase
    .from('billing_accounts')
    .select('id, credit_balance')
    .eq('workspace_id', project.workspace_id)
    .single()

  const body = await request.json().catch(() => ({}))
  const pricingTier = body?.pricing_tier === 'strategy' ? 'strategy' satisfies PricingTier : 'standard'
  const pricing = getBillableRunPricing(project.flow_type, pricingTier)
  const estimatedCredits = pricing.credits

  const useFreeModels = !billing || billing.credit_balance < estimatedCredits

  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .insert({
      project_id: id,
      flow_type: project.flow_type,
      status: 'queued',
      credits_estimated: estimatedCredits,
      triggered_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
  }

  // Deduct credits atomically to avoid race conditions on concurrent runs.
  const projectLabel =
    (project as Record<string, unknown>).project_name as string
    || (project as Record<string, unknown>).name as string
    || (project as Record<string, unknown>).project_address as string
    || id

  if (!useFreeModels && billing) {
    const { data: newBalance, error: deductErr } = await supabase.rpc('deduct_credits', {
      p_billing_account_id: billing.id,
      p_amount: estimatedCredits,
      p_workspace_id: project.workspace_id,
      p_description: `${pricing.description} for project ${projectLabel}`,
      p_created_by: user.id,
      p_reference_id: run.id,
      p_reference_type: 'pipeline_run',
    })

    if (deductErr) {
      await supabase.from('pipeline_runs').delete().eq('id', run.id)
      return NextResponse.json({ error: 'Credit deduction failed' }, { status: 500 })
    }

    if (newBalance === -1) {
      await supabase.from('pipeline_runs').delete().eq('id', run.id)
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'Not enough credits',
            details: {
              required: estimatedCredits,
              available: billing.credit_balance,
              pricing_tier: pricing.tier,
              price_usd_cents: pricing.priceUsdCents,
            },
          },
        },
        { status: 402 }
      )
    }
  }

  await supabase
    .from('projects')
    .update({
      status: 'processing',
      generation_tier: useFreeModels ? 'free' : 'standard',
      ...(useFreeModels ? { credits_used: 0 } : {}),
    })
    .eq('id', id)

  return NextResponse.json({ run, use_free_models: useFreeModels }, { status: 201 })
}
