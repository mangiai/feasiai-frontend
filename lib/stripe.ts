import Stripe from 'stripe'
import {
  CREDIT_PACKAGES as BASE_CREDIT_PACKAGES,
  PLATFORM_ACCESS_PLANS as BASE_PLATFORM_ACCESS_PLANS,
} from './pricing'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
      typescript: true,
    })
  }
  return _stripe
}

const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL,
  business: process.env.STRIPE_PRICE_BUSINESS,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  unlimited: process.env.STRIPE_PRICE_UNLIMITED,
} as const

export const CREDIT_PACKAGES = BASE_CREDIT_PACKAGES.map((pkg) => ({
  ...pkg,
  stripePriceId: STRIPE_PRICE_IDS[pkg.id as keyof typeof STRIPE_PRICE_IDS],
}))

const PLATFORM_PRICE_IDS = {
  starter_access: process.env.STRIPE_PRICE_PLATFORM_STARTER,
  growth_access: process.env.STRIPE_PRICE_PLATFORM_GROWTH,
} as const

export const PLATFORM_SUBSCRIPTION_PLANS = BASE_PLATFORM_ACCESS_PLANS.map((plan) => ({
  ...plan,
  stripePriceId: PLATFORM_PRICE_IDS[plan.id as keyof typeof PLATFORM_PRICE_IDS],
}))

export function getCreditPackageByStripePriceId(priceId: string | null | undefined) {
  if (!priceId) return undefined
  return CREDIT_PACKAGES.find((pkg) => pkg.stripePriceId === priceId)
}

export function getPlatformPlanById(planId: string | null | undefined) {
  if (!planId) return undefined
  return PLATFORM_SUBSCRIPTION_PLANS.find((plan) => plan.id === planId)
}

export function getPlatformPlanByStripePriceId(priceId: string | null | undefined) {
  if (!priceId) return undefined
  return PLATFORM_SUBSCRIPTION_PLANS.find((plan) => plan.stripePriceId === priceId)
}
