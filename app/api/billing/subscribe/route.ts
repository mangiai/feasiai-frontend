import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe, getPlatformPlanById } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
      { status: 501 },
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { workspace_id, plan_id } = body

  if (!workspace_id || !plan_id) {
    return NextResponse.json({ error: 'workspace_id and plan_id are required' }, { status: 400 })
  }

  const plan = getPlatformPlanById(plan_id)
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan_id' }, { status: 400 })
  }

  if (!plan.stripePriceId) {
    return NextResponse.json({ error: 'Stripe price is not configured for this plan' }, { status: 501 })
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only workspace owners/admins can manage subscriptions' }, { status: 403 })
  }

  try {
    const { data: billing, error: billingError } = await supabase
      .from('billing_accounts')
      .select('*')
      .eq('workspace_id', workspace_id)
      .single()

    if (billingError || !billing) {
      return NextResponse.json({ error: 'Billing account not found' }, { status: 404 })
    }

    let stripeCustomerId = billing.stripe_customer_id

    if (stripeCustomerId && billing.stripe_subscription_id && billing.plan_type && billing.plan_type !== 'free') {
      const portalSession = await getStripe().billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${request.nextUrl.origin}/settings/billing`,
      })

      return NextResponse.json({
        url: portalSession.url,
        source: 'billing_portal',
      })
    }

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        metadata: { workspace_id, user_id: user.id },
        email: user.email,
      })

      stripeCustomerId = customer.id

      await supabase
        .from('billing_accounts')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', billing.id)
    }

    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      metadata: {
        workspace_id,
        plan_id: plan.id,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          workspace_id,
          plan_id: plan.id,
          user_id: user.id,
        },
      },
      success_url: `${request.nextUrl.origin}/settings/billing/success?type=subscription`,
      cancel_url: `${request.nextUrl.origin}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe subscription checkout error:', err)
    return NextResponse.json({ error: 'Failed to create subscription checkout session' }, { status: 500 })
  }
}