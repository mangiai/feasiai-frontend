import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getStripe, CREDIT_PACKAGES } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
      { status: 501 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { workspace_id, package_id } = body

  if (!workspace_id || !package_id) {
    return NextResponse.json({ error: 'workspace_id and package_id are required' }, { status: 400 })
  }

  const pkg = CREDIT_PACKAGES.find(p => p.id === package_id)
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package_id' }, { status: 400 })
  }

  if (!pkg.stripePriceId) {
    return NextResponse.json({ error: 'Stripe price is not configured for this package' }, { status: 501 })
  }

  // Verify workspace membership
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only workspace owners/admins can purchase credits' }, { status: 403 })
  }

  try {
    // Get or create billing account
    const { data: billing, error: billingError } = await supabase
      .from('billing_accounts')
      .select('*')
      .eq('workspace_id', workspace_id)
      .single()

    if (billingError || !billing) {
      return NextResponse.json({ error: 'Billing account not found' }, { status: 404 })
    }

    let stripeCustomerId = billing.stripe_customer_id

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

    // Read referral cookie if present
    const cookieStore = await cookies()
    const referralCode = cookieStore.get('pf_ref')?.value ?? undefined

    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'payment',
      line_items: [
        {
          price: pkg.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        workspace_id,
        package_id: pkg.id,
        user_id: user.id,
        ...(referralCode ? { referral_code: referralCode } : {}),
      },
      success_url: `${request.nextUrl.origin}/settings/billing/success`,
      cancel_url: `${request.nextUrl.origin}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
