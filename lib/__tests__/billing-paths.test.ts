import { describe, expect, it } from 'vitest'

import {
  buildBillingSettingsPath,
  buildLoginPathForBillingIntent,
  buildSignupPathForBillingIntent,
} from '../billing/paths'

describe('billing intent path helpers', () => {
  it('returns the bare billing settings path when no intent is provided', () => {
    expect(buildBillingSettingsPath()).toBe('/settings/billing')
  })

  it('adds only the subscription query parameter when subscribing', () => {
    expect(buildBillingSettingsPath({ subscribePlanId: 'growth_access' })).toBe(
      '/settings/billing?subscribePlan=growth_access',
    )
  })

  it('adds only the credit package query parameter when buying credits', () => {
    expect(buildBillingSettingsPath({ packageId: 'starter' })).toBe(
      '/settings/billing?buyCredits=starter',
    )
  })

  it('keeps query parameter ordering deterministic when both intents are present', () => {
    expect(
      buildBillingSettingsPath({ subscribePlanId: 'starter_access', packageId: 'business' }),
    ).toBe('/settings/billing?subscribePlan=starter_access&buyCredits=business')
  })

  it('ignores empty billing intent values', () => {
    expect(
      buildBillingSettingsPath({ subscribePlanId: '', packageId: '' }),
    ).toBe('/settings/billing')
  })

  it('encodes nested billing intent redirects for signup', () => {
    expect(
      buildSignupPathForBillingIntent({ subscribePlanId: 'growth_access', packageId: 'starter' }),
    ).toBe(
      '/signup?redirect=%2Fsettings%2Fbilling%3FsubscribePlan%3Dgrowth_access%26buyCredits%3Dstarter',
    )
  })

  it('encodes nested billing intent redirects for login', () => {
    expect(
      buildLoginPathForBillingIntent({ packageId: 'enterprise' }),
    ).toBe('/login?redirect=%2Fsettings%2Fbilling%3FbuyCredits%3Denterprise')
  })
})