'use client'

import { useState } from 'react'
import type { ComponentProps } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildBillingSettingsPath, buildSignupPathForBillingIntent, type BillingIntent } from '@/lib/billing/paths'

type PricingActionButtonProps = BillingIntent & {
  label: string
  className?: string
  size?: ComponentProps<typeof Button>['size']
  variant?: ComponentProps<typeof Button>['variant']
}

export function PricingActionButton({
  label,
  className,
  size = 'default',
  variant = 'default',
  subscribePlanId,
  packageId,
}: PricingActionButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)

    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const intent = { subscribePlanId, packageId }

      if (data.session) {
        router.push(buildBillingSettingsPath(intent))
      } else {
        router.push(buildSignupPathForBillingIntent(intent))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn('w-full', className)}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : null}
      {label}
    </Button>
  )
}