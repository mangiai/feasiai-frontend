export interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number // USD cents
  priceDisplay: string
  description: string
  popular?: boolean
  features: string[]
}

export interface PlatformAccessPlan {
  id: string
  name: string
  monthlyPrice: number // USD cents
  priceDisplay: string
  description: string
  popular?: boolean
  features: string[]
}

export type PricingTier = 'standard' | 'strategy'

export interface BillableRunPricing {
  flowType: string
  tier: PricingTier
  credits: number
  priceUsdCents: number
  label: string
  description: string
}

export interface BillingEstimate {
  requestedType: SupportedBillingFlowType
  flowType: NormalizedBillableFlowType
  pricingTier: PricingTier
  creditsRequired: number
  estimatedCost: string
  priceUsdCents: number
  label: string
  description: string
}

export const DEFAULT_PLATFORM_PLAN_ID = 'growth_access'
export const DEFAULT_CREDIT_PACKAGE_ID = 'starter'

const CREDITS_PER_USD = 1

const BILLABLE_FLOW_TYPE_ALIASES = {
  feasibility: 'feasibility-analysis',
  corrections: 'corrections-analysis',
  city_review: 'city-review',
  'corrections-response': 'corrections-response',
  'feasibility-analysis': 'feasibility-analysis',
  'corrections-analysis': 'corrections-analysis',
  'city-review': 'city-review',
} as const

export type SupportedBillingFlowType = keyof typeof BILLABLE_FLOW_TYPE_ALIASES
export type NormalizedBillableFlowType = typeof BILLABLE_FLOW_TYPE_ALIASES[SupportedBillingFlowType]

export const SUPPORTED_BILLING_FLOW_TYPES = Object.keys(BILLABLE_FLOW_TYPE_ALIASES) as SupportedBillingFlowType[]

function usdCentsToCredits(priceUsdCents: number): number {
  return Math.round((priceUsdCents / 100) * CREDITS_PER_USD)
}

function formatUsd(priceUsdCents: number): string {
  return `$${(priceUsdCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function resolveBillableFlowType(flowType: string | null | undefined): NormalizedBillableFlowType | undefined {
  if (!flowType) {
    return undefined
  }

  return BILLABLE_FLOW_TYPE_ALIASES[flowType as SupportedBillingFlowType]
}

function normalizeFlowType(flowType: string): NormalizedBillableFlowType {
  return resolveBillableFlowType(flowType) ?? 'feasibility-analysis'
}

const STANDARD_AI_REPORT_PRICE_USD_CENTS = 32_500
const STRATEGY_REPORT_PRICE_USD_CENTS = 125_000

export const PLATFORM_ACCESS_PLANS: PlatformAccessPlan[] = [
  {
    id: 'starter_access',
    name: 'Starter Access',
    monthlyPrice: 14_900,
    priceDisplay: '$149/mo',
    description: 'Platform access for solo operators and small firms.',
    features: ['Workspace access', 'Project tracking', 'Team collaboration', 'Per-report billing sold separately'],
  },
  {
    id: 'growth_access',
    name: 'Growth Access',
    monthlyPrice: 19_900,
    priceDisplay: '$199/mo',
    description: 'Platform access for growing teams that need more throughput.',
    popular: true,
    features: ['Everything in Starter', 'Priority support', 'Higher usage limits', 'Per-report billing sold separately'],
  },
]

export function getBillableRunPricing(flowType: string, pricingTier: PricingTier = 'standard'): BillableRunPricing {
  const normalizedFlowType = normalizeFlowType(flowType)

  if (normalizedFlowType === 'corrections-response') {
    return {
      flowType: normalizedFlowType,
      tier: 'standard',
      credits: 0,
      priceUsdCents: 0,
      label: 'Included follow-up',
      description: 'Phase 2 contractor response follow-up is included in the originating report fee.',
    }
  }

  if (normalizedFlowType === 'feasibility-analysis' && pricingTier === 'strategy') {
    return {
      flowType: normalizedFlowType,
      tier: pricingTier,
      credits: usdCentsToCredits(STRATEGY_REPORT_PRICE_USD_CENTS),
      priceUsdCents: STRATEGY_REPORT_PRICE_USD_CENTS,
      label: `${usdCentsToCredits(STRATEGY_REPORT_PRICE_USD_CENTS)} credits (${formatUsd(STRATEGY_REPORT_PRICE_USD_CENTS)})`,
      description: 'AI-powered feasibility + entitlement strategy report priced against consulting-grade deliverables.',
    }
  }

  return {
    flowType: normalizedFlowType,
    tier: 'standard',
    credits: usdCentsToCredits(STANDARD_AI_REPORT_PRICE_USD_CENTS),
    priceUsdCents: STANDARD_AI_REPORT_PRICE_USD_CENTS,
    label: `${usdCentsToCredits(STANDARD_AI_REPORT_PRICE_USD_CENTS)} credits (${formatUsd(STANDARD_AI_REPORT_PRICE_USD_CENTS)})`,
    description: normalizedFlowType === 'feasibility-analysis'
      ? 'Standard AI feasibility report'
      : 'Standard AI analysis report',
  }
}

export function getBillingEstimate(
  flowType: string | null | undefined,
  pricingTier: PricingTier = 'standard',
): BillingEstimate | undefined {
  const resolvedFlowType = resolveBillableFlowType(flowType)

  if (!resolvedFlowType || !flowType) {
    return undefined
  }

  const pricing = getBillableRunPricing(resolvedFlowType, pricingTier)

  return {
    requestedType: flowType as SupportedBillingFlowType,
    flowType: pricing.flowType as NormalizedBillableFlowType,
    pricingTier: pricing.tier,
    creditsRequired: pricing.credits,
    estimatedCost: pricing.priceUsdCents === 0 ? 'Included' : formatUsd(pricing.priceUsdCents),
    priceUsdCents: pricing.priceUsdCents,
    label: pricing.label,
    description: pricing.description,
  }
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Single Report Pack',
    credits: 325,
    price: 32500,
    priceDisplay: '$325',
    description: 'Covers one standard AI feasibility report',
    features: ['325 report credits', 'Covers ~1 standard AI report', 'Platform subscription sold separately'],
  },
  {
    id: 'professional',
    name: 'Two Report Pack',
    credits: 650,
    price: 65000,
    priceDisplay: '$650',
    description: 'Best for teams running feasibility work regularly',
    features: ['650 report credits', 'Covers ~2 standard AI reports', 'Platform subscription sold separately'],
  },
  {
    id: 'business',
    name: 'Strategy Report Pack',
    credits: 1250,
    price: 125000,
    priceDisplay: '$1,250',
    description: 'Built for consulting-grade feasibility + entitlement strategy work',
    popular: true,
    features: ['1,250 report credits', 'Covers ~1 strategy report', 'Platform subscription sold separately'],
  },
  {
    id: 'enterprise',
    name: 'Growth Report Pack',
    credits: 2500,
    price: 250000,
    priceDisplay: '$2,500',
    description: 'For firms batching multiple reports each month',
    features: ['2,500 report credits', 'Covers ~7 standard AI reports', 'Platform subscription sold separately'],
  },
  {
    id: 'unlimited',
    name: 'Studio Report Pack',
    credits: 5000,
    price: 500000,
    priceDisplay: '$5,000',
    description: 'For teams with ongoing deal volume and repeated feasibility cycles',
    features: ['5,000 report credits', 'Covers ~15 standard AI reports', 'Platform subscription sold separately'],
  },
]

export const COST_PER_REPORT: Record<string, { credits: number; label: string }> = {
  'feasibility-analysis': (() => {
    const pricing = getBillableRunPricing('feasibility-analysis')
    return { credits: pricing.credits, label: pricing.label }
  })(),
  'corrections-analysis': (() => {
    const pricing = getBillableRunPricing('corrections-analysis')
    return { credits: pricing.credits, label: pricing.label }
  })(),
  'city-review': (() => {
    const pricing = getBillableRunPricing('city-review')
    return { credits: pricing.credits, label: pricing.label }
  })(),
}
