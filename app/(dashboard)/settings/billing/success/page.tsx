'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2Icon, CoinsIcon, CreditCardIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/hooks/use-workspace'
import { PLATFORM_ACCESS_PLANS } from '@/lib/pricing'

export default function BillingSuccessPage() {
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace()
  const [balance, setBalance] = useState<number | null>(null)
  const [planType, setPlanType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchaseType, setPurchaseType] = useState<'credits' | 'subscription'>('credits')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const type = new URLSearchParams(window.location.search).get('type')
    setPurchaseType(type === 'subscription' ? 'subscription' : 'credits')
  }, [])

  useEffect(() => {
    if (workspaceLoading) return

    if (!currentWorkspace) {
      setLoading(false)
      return
    }

    async function verify() {
      setLoading(true)
      try {
        const res = await fetch(`/api/workspaces/${currentWorkspace!.id}/billing`)
        if (res.ok) {
          const data = await res.json()
          setBalance(data.billing?.credit_balance ?? null)
          setPlanType(data.billing?.plan_type ?? null)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, [currentWorkspace, workspaceLoading])

  const activePlanName = PLATFORM_ACCESS_PLANS.find((plan) => plan.id === planType)?.name ?? null

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <CheckCircle2Icon className="w-12 h-12 text-green-500" />
          </div>
          <CardTitle className="text-xl">
            {purchaseType === 'subscription' ? 'Subscription Active!' : 'Payment Successful!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {purchaseType === 'subscription'
              ? 'Your workspace subscription is active and ready to use.'
              : 'Credits have been added to your workspace account.'}
          </p>
          {purchaseType === 'subscription' && activePlanName ? (
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              <CreditCardIcon className="w-5 h-5 text-primary" />
              <span>{activePlanName}</span>
            </div>
          ) : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">
              {purchaseType === 'subscription' ? 'Syncing subscription details...' : 'Verifying balance...'}
            </p>
          ) : balance !== null ? (
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              <CoinsIcon className="w-5 h-5 text-amber-500" />
              <span>{balance.toLocaleString()} credits</span>
            </div>
          ) : !currentWorkspace ? (
            <p className="text-sm text-muted-foreground">Open billing settings to finish syncing your workspace billing state.</p>
          ) : null}
          <Button asChild className="w-full">
            <Link href="/settings/billing">Go to Billing Settings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
