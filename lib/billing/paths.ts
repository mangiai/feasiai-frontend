export interface BillingIntent {
  subscribePlanId?: string
  packageId?: string
}

export function buildBillingSettingsPath(intent: BillingIntent = {}): string {
  const params = new URLSearchParams()

  if (intent.subscribePlanId) {
    params.set('subscribePlan', intent.subscribePlanId)
  }

  if (intent.packageId) {
    params.set('buyCredits', intent.packageId)
  }

  const query = params.toString()
  return query ? `/settings/billing?${query}` : '/settings/billing'
}

export function buildSignupPathForBillingIntent(intent: BillingIntent = {}): string {
  return `/signup?redirect=${encodeURIComponent(buildBillingSettingsPath(intent))}`
}

export function buildLoginPathForBillingIntent(intent: BillingIntent = {}): string {
  return `/login?redirect=${encodeURIComponent(buildBillingSettingsPath(intent))}`
}