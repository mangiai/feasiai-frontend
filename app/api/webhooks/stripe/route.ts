import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  getStripe,
  CREDIT_PACKAGES,
  getPlatformPlanByStripePriceId,
} from '@/lib/stripe'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
  'past_due',
  'unpaid',
])

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

function getSubscriptionId(subscription: string | Stripe.Subscription | null): string | null {
  if (!subscription) return null
  return typeof subscription === 'string' ? subscription : subscription.id
}

function getSubscriptionPlanId(subscription: Stripe.Subscription): string | null {
  return subscription.metadata?.plan_id
    || getPlatformPlanByStripePriceId(subscription.items.data[0]?.price.id)?.id
    || null
}

async function insertBillingAudit(
  client: SupabaseClient,
  input: {
    action: string
    actorId: string | null
    workspaceId: string | null
    resourceId: string | null
    details: Record<string, unknown>
  },
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- audit_events row shape
    const { error } = await (client as any).from('audit_events').insert({
      action: input.action,
      actor_id: input.actorId,
      workspace_id: input.workspaceId,
      resource_type: 'stripe_event',
      resource_id: input.resourceId,
      details: input.details,
    })
    if (error) console.warn('[stripe] audit insert:', error.message)
  } catch (e) {
    console.warn('[stripe] audit insert failed', e)
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe webhook not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.' },
      { status: 501 }
    )
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  async function resolveCreatedByUserId(workspaceId: string, metadataUserId?: string | null) {
    if (metadataUserId) {
      return metadataUserId
    }

    const { data: ownerMembership } = await supabase
      .from('workspace_memberships')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    return ownerMembership?.user_id ?? null
  }

  async function updateSubscriptionBillingAccount(params: {
    workspaceId?: string | null
    customerId?: string | null
    subscriptionId?: string | null
    planId?: string | null
    status?: Stripe.Subscription.Status | 'canceled'
  }) {
    const nextPlanType = params.status && ACTIVE_SUBSCRIPTION_STATUSES.has(params.status as Stripe.Subscription.Status) && params.planId
      ? params.planId
      : 'free'

    const payload = {
      stripe_customer_id: params.customerId ?? null,
      stripe_subscription_id:
        params.status && ACTIVE_SUBSCRIPTION_STATUSES.has(params.status as Stripe.Subscription.Status)
          ? params.subscriptionId ?? null
          : null,
      plan_type: nextPlanType,
    }

    if (params.workspaceId) {
      return supabase.from('billing_accounts').update(payload).eq('workspace_id', params.workspaceId)
    }

    if (params.subscriptionId) {
      const result = await supabase.from('billing_accounts').update(payload).eq('stripe_subscription_id', params.subscriptionId)
      if (!result.error) return result
    }

    if (params.customerId) {
      return supabase.from('billing_accounts').update(payload).eq('stripe_customer_id', params.customerId)
    }

    return { error: null }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const mode = session.mode

    if (mode === 'subscription') {
      const workspaceId = session.metadata?.workspace_id
      const planId = session.metadata?.plan_id

      if (!workspaceId || !planId) {
        console.error('Missing subscription metadata in checkout session:', session.id)
        return NextResponse.json({ error: 'Missing subscription metadata' }, { status: 400 })
      }

      const { error: subscriptionSyncError } = await updateSubscriptionBillingAccount({
        workspaceId,
        customerId: typeof session.customer === 'string' ? session.customer : null,
        subscriptionId: getSubscriptionId(session.subscription),
        planId,
        status: 'active',
      })

      if (subscriptionSyncError) {
        console.error('Failed to sync subscription checkout session:', subscriptionSyncError)
        return NextResponse.json({ error: 'Subscription sync failed' }, { status: 500 })
      }

      await insertBillingAudit(supabase, {
        action: 'billing.stripe.checkout_subscription',
        actorId: session.metadata?.user_id ?? null,
        workspaceId: workspaceId,
        resourceId: session.id,
        details: {
          stripe_event: event.type,
          plan_id: planId,
          subscription_id: getSubscriptionId(session.subscription),
        },
      })

      return NextResponse.json({ received: true })
    }

    const workspaceId = session.metadata?.workspace_id
    const packageId = session.metadata?.package_id
    const metadataUserId = session.metadata?.user_id

    if (!workspaceId || !packageId) {
      console.error('Missing metadata in checkout session:', session.id)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId)
    if (!pkg) {
      console.error('Unknown package_id in webhook:', packageId)
      return NextResponse.json({ error: 'Unknown package' }, { status: 400 })
    }

    try {
      const { data: existingLedger } = await supabase
        .from('credit_ledger')
        .select('id')
        .eq('reference_type', 'stripe_checkout')
        .eq('reference_id', session.id)
        .maybeSingle()

      if (existingLedger) {
        return NextResponse.json({ received: true, idempotent: true })
      }

      // Get billing account
      const { data: billing, error: billingError } = await supabase
        .from('billing_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single()

      if (billingError || !billing) {
        console.error('Billing account not found for workspace:', workspaceId)
        return NextResponse.json({ error: 'Billing account not found' }, { status: 404 })
      }

      const newBalance = billing.credit_balance + pkg.credits
      const createdByUserId = await resolveCreatedByUserId(workspaceId, metadataUserId)

      if (!createdByUserId) {
        console.error('Unable to resolve auth user for Stripe credit purchase:', session.id)
        return NextResponse.json({ error: 'Unable to resolve purchaser user id' }, { status: 500 })
      }

      // Insert ledger entry
      const { error: ledgerInsertError } = await supabase.from('credit_ledger').insert({
        workspace_id: workspaceId,
        amount: pkg.credits,
        balance_after: newBalance,
        transaction_type: 'purchase',
        description: `Purchased ${pkg.name} package (${pkg.credits} credits)`,
        created_by: createdByUserId,
        reference_id: session.id,
        reference_type: 'stripe_checkout',
      })

      if (ledgerInsertError?.code === '23505') {
        return NextResponse.json({ received: true, idempotent: true })
      }

      if (ledgerInsertError) {
        throw ledgerInsertError
      }

      // Update balance
      const { error: billingUpdateError } = await supabase
        .from('billing_accounts')
        .update({ credit_balance: newBalance })
        .eq('id', billing.id)

      if (billingUpdateError) {
        throw billingUpdateError
      }

      await insertBillingAudit(supabase, {
        action: 'billing.stripe.checkout_credits',
        actorId: createdByUserId,
        workspaceId,
        resourceId: session.id,
        details: {
          stripe_event: event.type,
          package_id: packageId,
          credits: pkg.credits,
          balance_after: newBalance,
        },
      })

      // Referral bonus: credit the referrer if this buyer was referred
      try {
        const refCode = session.metadata?.referral_code
        if (refCode) {
          const { data: refLink } = await supabase
            .from('referral_links')
            .select('id, created_by')
            .eq('code', refCode)
            .single()

          if (refLink) {
            // Check if this is the first purchase for this workspace (only reward once)
            const { count: priorPurchases } = await supabase
              .from('credit_ledger')
              .select('*', { count: 'exact', head: true })
              .eq('workspace_id', workspaceId)
              .eq('transaction_type', 'purchase')

            const isFirstPurchase = (priorPurchases ?? 0) <= 1 // 1 because we just inserted above

            if (isFirstPurchase) {
              const REFERRAL_BONUS = 5

              // Record referral event
              await supabase.from('referral_events').insert({
                referral_link_id: refLink.id,
                event_type: 'first_purchase' as const,
                metadata: { workspace_id: workspaceId, credit_amount: REFERRAL_BONUS },
              })

              // Find referrer's workspace and credit them
              const { data: referrerMembership } = await supabase
                .from('workspace_memberships')
                .select('workspace_id')
                .eq('user_id', refLink.created_by)
                .eq('role', 'owner')
                .limit(1)
                .single()

              if (referrerMembership) {
                const { data: referrerBilling } = await supabase
                  .from('billing_accounts')
                  .select('id, credit_balance')
                  .eq('workspace_id', referrerMembership.workspace_id)
                  .single()

                if (referrerBilling) {
                  const referrerNewBalance = referrerBilling.credit_balance + REFERRAL_BONUS

                  await supabase.from('credit_ledger').insert({
                    workspace_id: referrerMembership.workspace_id,
                    amount: REFERRAL_BONUS,
                    balance_after: referrerNewBalance,
                    transaction_type: 'bonus',
                    description: `Referral bonus — referred user made first purchase`,
                    created_by: refLink.created_by,
                    reference_id: refLink.id,
                    reference_type: 'referral',
                  })

                  await supabase
                    .from('billing_accounts')
                    .update({ credit_balance: referrerNewBalance })
                    .eq('id', referrerBilling.id)
                }
              }
            }
          }
        }
      } catch (refErr) {
        console.error('Referral bonus processing failed (non-blocking):', refErr)
      }
    } catch (err) {
      console.error('Error processing checkout webhook:', err)
      return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
  }

  if (
    event.type === 'customer.subscription.created'
    || event.type === 'customer.subscription.updated'
    || event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status

    const { error: subscriptionUpdateError } = await updateSubscriptionBillingAccount({
      workspaceId: subscription.metadata?.workspace_id,
      customerId: getCustomerId(subscription.customer),
      subscriptionId: subscription.id,
      planId: getSubscriptionPlanId(subscription),
      status,
    })

    if (subscriptionUpdateError) {
      console.error('Failed to sync subscription state:', subscriptionUpdateError)
      return NextResponse.json({ error: 'Subscription webhook processing failed' }, { status: 500 })
    }

    await insertBillingAudit(supabase, {
      action: 'billing.stripe.subscription_sync',
      actorId: subscription.metadata?.user_id ?? null,
      workspaceId: subscription.metadata?.workspace_id ?? null,
      resourceId: subscription.id,
      details: {
        stripe_event: event.type,
        status,
        plan_id: getSubscriptionPlanId(subscription),
      },
    })
  }

  return NextResponse.json({ received: true })
}
