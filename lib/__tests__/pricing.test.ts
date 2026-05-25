import { describe, expect, it } from 'vitest'

import {
  COST_PER_REPORT,
  CREDIT_PACKAGES,
  DEFAULT_CREDIT_PACKAGE_ID,
  DEFAULT_PLATFORM_PLAN_ID,
  PLATFORM_ACCESS_PLANS,
  SUPPORTED_BILLING_FLOW_TYPES,
  getBillingEstimate,
  getBillableRunPricing,
  resolveBillableFlowType,
} from '../pricing'

describe('pricing edge cases', () => {
  it('keeps default IDs aligned with real plans and packages', () => {
    expect(PLATFORM_ACCESS_PLANS.some((plan) => plan.id === DEFAULT_PLATFORM_PLAN_ID)).toBe(true)
    expect(CREDIT_PACKAGES.some((pkg) => pkg.id === DEFAULT_CREDIT_PACKAGE_ID)).toBe(true)
  })

  it('keeps platform access plan IDs unique', () => {
    const ids = PLATFORM_ACCESS_PLANS.map((plan) => plan.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(CREDIT_PACKAGES.map((pkg) => [pkg.id, pkg.price, pkg.credits]))(
    'maps %s package price (%i cents) to matching credits (%i)',
    (_id, priceUsdCents, credits) => {
      expect(credits).toBe(priceUsdCents / 100)
    },
  )

  it.each([
    ['feasibility', 'feasibility-analysis'],
    ['feasibility-analysis', 'feasibility-analysis'],
    ['corrections', 'corrections-analysis'],
    ['corrections-analysis', 'corrections-analysis'],
    ['city_review', 'city-review'],
    ['city-review', 'city-review'],
    ['corrections-response', 'corrections-response'],
  ] as const)('resolves %s to %s', (input, expected) => {
    expect(resolveBillableFlowType(input)).toBe(expected)
  })

  it.each([undefined, null, '', 'something-else'])('rejects unsupported flow %j', (input) => {
    expect(resolveBillableFlowType(input as string | null | undefined)).toBeUndefined()
    expect(getBillingEstimate(input as string | null | undefined)).toBeUndefined()
  })

  it('falls back unknown billable flows to standard feasibility pricing', () => {
    expect(getBillableRunPricing('mystery-flow')).toMatchObject({
      flowType: 'feasibility-analysis',
      tier: 'standard',
      credits: 325,
      priceUsdCents: 32_500,
    })
  })

  it('prices standard feasibility reports consistently', () => {
    expect(getBillableRunPricing('feasibility-analysis')).toMatchObject({
      flowType: 'feasibility-analysis',
      tier: 'standard',
      credits: 325,
      priceUsdCents: 32_500,
      label: '325 credits ($325)',
    })
  })

  it('prices strategy feasibility reports at the higher consulting tier', () => {
    expect(getBillableRunPricing('feasibility-analysis', 'strategy')).toMatchObject({
      flowType: 'feasibility-analysis',
      tier: 'strategy',
      credits: 1250,
      priceUsdCents: 125_000,
      label: '1250 credits ($1,250)',
    })
  })

  it('ignores strategy tier for non-feasibility billable runs', () => {
    expect(getBillableRunPricing('corrections-analysis', 'strategy')).toMatchObject({
      flowType: 'corrections-analysis',
      tier: 'standard',
      credits: 325,
      priceUsdCents: 32_500,
    })
  })

  it('treats contractor response follow-up as included', () => {
    expect(getBillableRunPricing('corrections-response', 'strategy')).toMatchObject({
      flowType: 'corrections-response',
      tier: 'standard',
      credits: 0,
      priceUsdCents: 0,
      label: 'Included follow-up',
    })
  })

  it.each(['feasibility-analysis', 'corrections-analysis', 'city-review'] as const)(
    'keeps COST_PER_REPORT in sync for %s',
    (flowType) => {
      const pricing = getBillableRunPricing(flowType)
      expect(COST_PER_REPORT[flowType]).toEqual({
        credits: pricing.credits,
        label: pricing.label,
      })
    },
  )

  it('publishes supported billing types that include aliases and canonical ids', () => {
    expect(SUPPORTED_BILLING_FLOW_TYPES).toEqual([
      'feasibility',
      'corrections',
      'city_review',
      'corrections-response',
      'feasibility-analysis',
      'corrections-analysis',
      'city-review',
    ])
  })

  it('builds a feasibility estimate from shared pricing data instead of stale constants', () => {
    expect(getBillingEstimate('feasibility')).toEqual({
      requestedType: 'feasibility',
      flowType: 'feasibility-analysis',
      pricingTier: 'standard',
      creditsRequired: 325,
      estimatedCost: '$325',
      priceUsdCents: 32_500,
      label: '325 credits ($325)',
      description: 'Standard AI feasibility report',
    })
  })

  it('supports strategy-tier estimate requests for feasibility', () => {
    expect(getBillingEstimate('feasibility-analysis', 'strategy')).toEqual({
      requestedType: 'feasibility-analysis',
      flowType: 'feasibility-analysis',
      pricingTier: 'strategy',
      creditsRequired: 1250,
      estimatedCost: '$1,250',
      priceUsdCents: 125_000,
      label: '1250 credits ($1,250)',
      description: 'AI-powered feasibility + entitlement strategy report priced against consulting-grade deliverables.',
    })
  })

  it('returns included cost wording for bundled follow-up work', () => {
    expect(getBillingEstimate('corrections-response')).toEqual({
      requestedType: 'corrections-response',
      flowType: 'corrections-response',
      pricingTier: 'standard',
      creditsRequired: 0,
      estimatedCost: 'Included',
      priceUsdCents: 0,
      label: 'Included follow-up',
      description: 'Phase 2 contractor response follow-up is included in the originating report fee.',
    })
  })
})