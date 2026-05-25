import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

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
  const { workspace_id } = body

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  // Verify workspace membership with admin role
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only workspace owners/admins can manage billing' }, { status: 403 })
  }

  try {
    const { data: billing } = await supabase
      .from('billing_accounts')
      .select('stripe_customer_id')
      .eq('workspace_id', workspace_id)
      .single()

    if (!billing?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please make a purchase first.' },
        { status: 400 }
      )
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${request.nextUrl.origin}/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
