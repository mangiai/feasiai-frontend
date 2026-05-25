import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBillingEstimate, SUPPORTED_BILLING_FLOW_TYPES, type PricingTier } from '@/lib/pricing'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type')
  const pricingTier = request.nextUrl.searchParams.get('pricing_tier') === 'strategy'
    ? 'strategy' satisfies PricingTier
    : 'standard'
  const estimate = getBillingEstimate(type, pricingTier)

  if (!estimate) {
    return NextResponse.json(
      {
        error: `Invalid type. Supported values: ${SUPPORTED_BILLING_FLOW_TYPES.join(', ')}.`,
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    type: estimate.requestedType,
    normalizedType: estimate.flowType,
    pricingTier: estimate.pricingTier,
    creditsRequired: estimate.creditsRequired,
    estimatedCost: estimate.estimatedCost,
    priceUsdCents: estimate.priceUsdCents,
    label: estimate.label,
    description: estimate.description,
  })
}
