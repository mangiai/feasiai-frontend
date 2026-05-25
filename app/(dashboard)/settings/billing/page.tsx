'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/hooks/use-workspace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpIcon, ArrowDownIcon, CoinsIcon, ZapIcon, ShoppingCartIcon, CreditCardIcon } from 'lucide-react'
import { CREDIT_PACKAGES, PLATFORM_ACCESS_PLANS, getBillableRunPricing } from '@/lib/pricing'

interface LedgerEntry {
  id: string
  transaction_type: string
  amount: number
  running_balance: number
  description: string | null
  created_at: string
}

const PAGE_SIZE = 25

export default function BillingSettingsPage() {
  const { currentWorkspace, creditBalance } = useWorkspace()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const handledIntentRef = useRef<string | null>(null)

  const standardFeasibilityPricing = getBillableRunPricing('feasibility-analysis')
  const strategyPricing = getBillableRunPricing('feasibility-analysis', 'strategy')

  useEffect(() => {
    if (!currentWorkspace) return

    async function load() {
      setLoading(true)
      const res = await fetch(
        `/api/workspaces/${currentWorkspace!.id}/billing?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
      )
      if (res.ok) {
        const data = await res.json()
        const items = data.ledger || []
        setLedger(prev => page === 0 ? items : [...prev, ...items])
        setHasMore(items.length === PAGE_SIZE)
      }
      setLoading(false)
    }
    load()
  }, [currentWorkspace, page])

  const handleBuy = useCallback(async (packageId: string) => {
    if (!currentWorkspace) return false

    setCheckoutError(null)
    setBuyingId(packageId)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace.id, package_id: packageId }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
        return true
      } else {
        setCheckoutError(typeof data.error === 'string' ? data.error : 'Unable to start Stripe checkout')
      }
    } catch (err) {
      console.error('Checkout request failed:', err)
      setCheckoutError('Checkout request failed. Please try again.')
    } finally {
      setBuyingId(null)
    }

    return false
  }, [currentWorkspace])

  const handleSubscribe = useCallback(async (planId: string) => {
    if (!currentWorkspace) return false

    setCheckoutError(null)
    setSubscribingPlanId(planId)

    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace.id, plan_id: planId }),
      })

      const data = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
        return true
      }

      setCheckoutError(typeof data.error === 'string' ? data.error : 'Unable to start subscription checkout')
    } catch (err) {
      console.error('Subscription checkout request failed:', err)
      setCheckoutError('Subscription checkout request failed. Please try again.')
    } finally {
      setSubscribingPlanId(null)
    }

    return false
  }, [currentWorkspace])

  async function handleManagePayment() {
    if (!currentWorkspace) return
    setCheckoutError(null)
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace.id }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        setCheckoutError(typeof data.error === 'string' ? data.error : 'Unable to open the Stripe billing portal')
      }
    } catch (err) {
      console.error('Portal request failed:', err)
      setCheckoutError('Billing portal request failed. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    if (!currentWorkspace) return

    const subscribePlan = searchParams.get('subscribePlan')
    const buyCredits = searchParams.get('buyCredits')

    if (!subscribePlan && !buyCredits) return

    const intentKey = `${currentWorkspace.id}:${subscribePlan ?? ''}:${buyCredits ?? ''}`
    if (handledIntentRef.current === intentKey) return

    handledIntentRef.current = intentKey

    const validPlanIds = new Set(PLATFORM_ACCESS_PLANS.map((plan) => plan.id))
    const validPackageIds = new Set(CREDIT_PACKAGES.map((pkg) => pkg.id))

    void (async () => {
      if (subscribePlan && validPlanIds.has(subscribePlan)) {
        const redirected = await handleSubscribe(subscribePlan)
        if (!redirected) router.replace('/settings/billing')
        return
      }

      if (buyCredits && validPackageIds.has(buyCredits)) {
        const redirected = await handleBuy(buyCredits)
        if (!redirected) router.replace('/settings/billing')
        return
      }

      router.replace('/settings/billing')
    })()
  }, [currentWorkspace, handleBuy, handleSubscribe, router, searchParams])

  return (
    <div className="space-y-6">
      {checkoutError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{checkoutError}</p>
          </CardContent>
        </Card>
      )}

      {/* Credit Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CoinsIcon className="w-5 h-5 text-amber-500" />
            Credit Balance
          </CardTitle>
          <CardDescription>Credits are used to run AI analysis pipelines on your projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{creditBalance.toLocaleString()}</span>
            <span className="text-muted-foreground">credits</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Standard AI feasibility reports deduct {standardFeasibilityPricing.credits} credits ({standardFeasibilityPricing.label}).
            Strategy-grade feasibility + entitlement reports deduct {strategyPricing.credits} credits ({strategyPricing.label}).
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleManagePayment}
            disabled={portalLoading}
          >
            <CreditCardIcon className="w-4 h-4 mr-2" />
            {portalLoading ? 'Redirecting…' : 'Manage Payment Methods'}
          </Button>
        </CardContent>
      </Card>

      {/* Platform Access */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Access Plans</CardTitle>
          <CardDescription>
            Monthly platform access is separate from report usage so software access and report production can scale independently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {PLATFORM_ACCESS_PLANS.map(plan => (
              <Card key={plan.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {plan.popular && <Badge>Recommended</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-2xl font-bold">{plan.priceDisplay}</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {plan.features.map(feature => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => void handleSubscribe(plan.id)}
                    disabled={subscribingPlanId !== null || buyingId !== null || !currentWorkspace}
                  >
                    {subscribingPlanId === plan.id ? 'Redirecting…' : 'Start Subscription'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Buy Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="w-5 h-5" />
            Buy Credits
          </CardTitle>
          <CardDescription>Choose a credit package that fits your needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CREDIT_PACKAGES.map(pkg => (
              <Card key={pkg.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  <CardDescription>{pkg.credits} credits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-2xl font-bold">{pkg.priceDisplay}</p>
                  <Button
                    className="w-full"
                    onClick={() => void handleBuy(pkg.id)}
                    disabled={buyingId !== null || subscribingPlanId !== null || !currentWorkspace}
                  >
                    {buyingId === pkg.id ? 'Redirecting…' : 'Buy Now'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ZapIcon className="w-5 h-5" />
            Usage Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">Hybrid Pricing</Badge>
            <span className="text-sm text-muted-foreground">Monthly platform access + per-report credits</span>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Use standard report credits for AI feasibility work, and reserve higher-credit packs for consulting-grade strategy deliverables.
          </p>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent credit usage and additions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="divide-y">
              {ledger.map(entry => (
                <div key={entry.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {entry.amount > 0 ? (
                      <ArrowUpIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownIcon className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {entry.transaction_type.replace(/_/g, ' ')}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-muted-foreground">{entry.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${entry.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.amount > 0 ? '+' : ''}{entry.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={loading}>
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
