import { afterEach, describe, expect, it, vi } from 'vitest'

const STRIPE_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_STARTER',
  'STRIPE_PRICE_PROFESSIONAL',
  'STRIPE_PRICE_BUSINESS',
  'STRIPE_PRICE_ENTERPRISE',
  'STRIPE_PRICE_UNLIMITED',
  'STRIPE_PRICE_PLATFORM_STARTER',
  'STRIPE_PRICE_PLATFORM_GROWTH',
] as const

const ORIGINAL_ENV = Object.fromEntries(
  STRIPE_ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof STRIPE_ENV_KEYS)[number], string | undefined>

function restoreStripeEnv() {
  for (const key of STRIPE_ENV_KEYS) {
    const original = ORIGINAL_ENV[key]
    if (original === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = original
    }
  }
}

async function importStripeModule() {
  vi.resetModules()
  return import('../stripe')
}

afterEach(() => {
  restoreStripeEnv()
  vi.resetModules()
})

describe('stripe billing helpers', () => {
  it('throws a clear error when Stripe secret key is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const stripeModule = await importStripeModule()

    expect(() => stripeModule.getStripe()).toThrowError('STRIPE_SECRET_KEY is not set')
  })

  it('caches the Stripe client per module instance', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_cached'
    const stripeModule = await importStripeModule()

    expect(stripeModule.getStripe()).toBe(stripeModule.getStripe())
  })

  it('maps credit package Stripe price IDs from environment variables at import time', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_prices'
    process.env.STRIPE_PRICE_STARTER = 'price_starter'
    process.env.STRIPE_PRICE_PROFESSIONAL = 'price_professional'
    process.env.STRIPE_PRICE_BUSINESS = 'price_business'
    process.env.STRIPE_PRICE_ENTERPRISE = 'price_enterprise'
    process.env.STRIPE_PRICE_UNLIMITED = 'price_unlimited'

    const stripeModule = await importStripeModule()

    expect(stripeModule.CREDIT_PACKAGES.map((pkg) => [pkg.id, pkg.stripePriceId])).toEqual([
      ['starter', 'price_starter'],
      ['professional', 'price_professional'],
      ['business', 'price_business'],
      ['enterprise', 'price_enterprise'],
      ['unlimited', 'price_unlimited'],
    ])
  })

  it('maps platform subscription price IDs from environment variables at import time', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_plans'
    process.env.STRIPE_PRICE_PLATFORM_STARTER = 'price_platform_starter'
    process.env.STRIPE_PRICE_PLATFORM_GROWTH = 'price_platform_growth'

    const stripeModule = await importStripeModule()

    expect(stripeModule.PLATFORM_SUBSCRIPTION_PLANS.map((plan) => [plan.id, plan.stripePriceId])).toEqual([
      ['starter_access', 'price_platform_starter'],
      ['growth_access', 'price_platform_growth'],
    ])
  })

  it('resolves credit packages by Stripe price id and ignores empty inputs', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_lookup'
    process.env.STRIPE_PRICE_STARTER = 'price_starter'
    const stripeModule = await importStripeModule()

    expect(stripeModule.getCreditPackageByStripePriceId('price_starter')?.id).toBe('starter')
    expect(stripeModule.getCreditPackageByStripePriceId('missing')).toBeUndefined()
    expect(stripeModule.getCreditPackageByStripePriceId(undefined)).toBeUndefined()
    expect(stripeModule.getCreditPackageByStripePriceId(null)).toBeUndefined()
  })

  it('resolves platform plans by id and by Stripe price id', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_plan_lookup'
    process.env.STRIPE_PRICE_PLATFORM_GROWTH = 'price_platform_growth'
    const stripeModule = await importStripeModule()

    expect(stripeModule.getPlatformPlanById('growth_access')?.id).toBe('growth_access')
    expect(stripeModule.getPlatformPlanById('missing')).toBeUndefined()
    expect(stripeModule.getPlatformPlanByStripePriceId('price_platform_growth')?.id).toBe('growth_access')
    expect(stripeModule.getPlatformPlanByStripePriceId(undefined)).toBeUndefined()
    expect(stripeModule.getPlatformPlanByStripePriceId('missing')).toBeUndefined()
  })
})