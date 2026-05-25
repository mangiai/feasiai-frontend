import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { buildBackendAuthHeaders } from '@/lib/backend-auth-headers'
import { getServerBaseUrl, SERVER_URL_ERROR_HINT } from '@/lib/http/server-base'
import { getBillableRunPricing, type PricingTier } from '@/lib/pricing'
import { assertLegacyProjectAccess, getAdminSupabase } from '@/lib/server/access-control'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const backendHeaders = buildBackendAuthHeaders(auth)
    if (!backendHeaders.Authorization) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired — refresh the page or sign in again',
          code: 'SESSION_EXPIRED',
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const pricingTier = body?.pricing_tier === 'strategy' ? 'strategy' satisfies PricingTier : 'standard'
    const { project_id, user_id, flow_type, zone, lot_size, toc_tier, chip_tier, lot_width, lot_depth,
      existing_building_year, existing_units, rso_units, existing_parking,
      hazard_zones, transit_proximity, specific_plan, existing_building_plan, rso_replacement_policy } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const adminSupabase = getAdminSupabase()

    let useFreeModels = false
    let workspaceId: string | null = null

    // For browser auth: verify project access. Low FeasiAI credits → free models (no 402).
    // API key auth skips ownership and billing checks (trusted automation only).
    if (!auth.isApiKey) {
      const access = await assertLegacyProjectAccess({
        userId: auth.userId!,
        projectId: project_id,
        workspaceRoles: ['owner', 'admin', 'member'],
      })

      if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status })
      }

      workspaceId = access.publicProject.workspace_id

      if (flow_type !== 'corrections-response') {
        const pricing = getBillableRunPricing(flow_type, pricingTier)
        const { data: billing } = await adminSupabase
          .from('billing_accounts')
          .select('id, credit_balance')
          .eq('workspace_id', access.publicProject.workspace_id)
          .single()

        if (!billing || billing.credit_balance < pricing.credits) {
          useFreeModels = true
        }
      }
    }

    const serverBaseUrl = getServerBaseUrl()

    if (!serverBaseUrl) {
      return NextResponse.json({
        success: false,
        error: `Server not configured: ${SERVER_URL_ERROR_HINT}`,
      }, { status: 500 })
    }

    try {
      const controller = new AbortController()
      // The backend responds immediately with {status:'processing'} then runs async.
      // 120s allows for slow cold starts or heavy pre-processing before the initial response.
      const timeoutId = setTimeout(() => controller.abort(), 120_000)

      // API key path: use user_id from request body
      // Browser path: use authenticated user's ID
      const effectiveUserId = auth.isApiKey
        ? (user_id || '00000000-0000-0000-0000-000000000000')
        : auth.userId

      // Build feasibility payload, stripping null values to avoid Zod rejection
      const feasibilityFields = flow_type === 'feasibility-analysis'
        ? Object.fromEntries(
            Object.entries({
              zone, lot_size, toc_tier, chip_tier, lot_width, lot_depth,
              existing_building_year, existing_units, rso_units, existing_parking,
              hazard_zones, transit_proximity, specific_plan, existing_building_plan, rso_replacement_policy,
            }).filter(([, v]) => v != null),
          )
        : {}

      const response = await fetch(`${serverBaseUrl}/generate`, {
        method: 'POST',
        headers: backendHeaders,
        body: JSON.stringify({
          project_id,
          user_id: effectiveUserId,
          flow_type,
          use_free_models: useFreeModels,
          ...feasibilityFields,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Backend server error:', response.status, errorData)
        return NextResponse.json({
          success: false,
          error: errorData.error || `Server error: ${response.status}`,
        }, { status: response.status })
      }

      const data = await response.json()

      if (!auth.isApiKey && flow_type !== 'corrections-response' && !useFreeModels && workspaceId) {
        const access = await assertLegacyProjectAccess({
          userId: auth.userId!,
          projectId: project_id,
          workspaceRoles: ['owner', 'admin', 'member'],
        })

        if (access.ok) {
          const pricing = getBillableRunPricing(flow_type, pricingTier)
          const estimatedCredits = pricing.credits
          const { data: billing } = await adminSupabase
            .from('billing_accounts')
            .select('id')
            .eq('workspace_id', access.publicProject.workspace_id)
            .single()

          if (billing) {
            const projectLabel = access.publicProject.name || access.legacyProject.project_name || project_id
            const { data: newBalance, error: deductErr } = await adminSupabase.rpc('deduct_credits', {
              p_billing_account_id: billing.id,
              p_amount: estimatedCredits,
              p_workspace_id: access.publicProject.workspace_id,
              p_description: `${pricing.description} for project ${projectLabel}`,
              p_created_by: auth.userId!,
              p_reference_id: project_id,
              p_reference_type: 'project_generation',
            })

            if (deductErr) {
              console.error('Credit deduction failed after generation start:', deductErr)
            } else if (newBalance !== -1) {
              await adminSupabase
                .from('projects')
                .update({
                  status: 'processing',
                  credits_used: estimatedCredits,
                  generation_tier: 'standard',
                })
                .eq('id', access.publicProject.id)
            }
          }
        }
      } else if (useFreeModels) {
        await adminSupabase
          .from('projects')
          .update({ generation_tier: 'free', credits_used: 0 })
          .eq('id', project_id)
      }

      return NextResponse.json({
        success: true,
        message: data.message || 'Generation started',
        use_free_models: useFreeModels,
      })
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'Request timed out - the server may be starting up. Please try again.',
        }, { status: 504 })
      }
      console.error('Failed to reach backend server:', fetchError)
      return NextResponse.json({
        success: false,
        error: `Failed to connect to generation server: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
      }, { status: 502 })
    }
  } catch (error) {
    console.error('Error in generate route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
