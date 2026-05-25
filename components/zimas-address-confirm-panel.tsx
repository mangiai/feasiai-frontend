'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExternalLinkIcon, Loader2Icon, MapPinIcon } from 'lucide-react'
import { isZimasHostUrl, parseAddressFromZimasUrl } from '@/lib/zimas-url'
import { cn } from '@/lib/utils'

export interface ZimasAddressConfirmPanelProps {
  currentAddress: string
  disabled?: boolean
  isLookingUp?: boolean
  onConfirmLookup: (address: string, zimasReferenceUrl?: string) => void
  className?: string
}

export function ZimasAddressConfirmPanel({
  currentAddress,
  disabled,
  isLookingUp,
  onConfirmLookup,
  className,
}: ZimasAddressConfirmPanelProps) {
  const [zimasUrl, setZimasUrl] = useState('')
  const [confirmAddress, setConfirmAddress] = useState(currentAddress)

  const parsedFromUrl = zimasUrl.trim() ? parseAddressFromZimasUrl(zimasUrl) : null
  const urlValid = !zimasUrl.trim() || isZimasHostUrl(zimasUrl)
  const addressToUse = (confirmAddress.trim() || parsedFromUrl || '').trim()

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-500/35 bg-amber-500/5 p-4 space-y-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <MapPinIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Confirm property in ZIMAS</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Feasibility requires a verified City of Los Angeles parcel. Search the address on{' '}
            <a
              href="https://zimas.lacity.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
            >
              ZIMAS
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
            , then paste the link (optional) and the address exactly as ZIMAS shows it.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="zimas-ref-url" className="text-xs">
          ZIMAS page link <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="zimas-ref-url"
          placeholder="https://zimas.lacity.org/…"
          value={zimasUrl}
          onChange={(e) => setZimasUrl(e.target.value)}
          disabled={disabled || isLookingUp}
          className="font-mono text-xs"
        />
        {!urlValid && (
          <p className="text-xs text-destructive">Link must be from zimas.lacity.org</p>
        )}
        {parsedFromUrl && (
          <p className="text-xs text-muted-foreground">
            Address from link: <span className="font-medium text-foreground">{parsedFromUrl}</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="zimas-confirm-address" className="text-xs">
          Address as shown in ZIMAS <span className="text-destructive">*</span>
        </Label>
        <Input
          id="zimas-confirm-address"
          placeholder="e.g. 1256 S ELDEN AVE, LOS ANGELES, CA 90006"
          value={confirmAddress}
          onChange={(e) => setConfirmAddress(e.target.value)}
          disabled={disabled || isLookingUp}
        />
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={disabled || isLookingUp || !urlValid || addressToUse.length < 8}
        onClick={() => onConfirmLookup(addressToUse, zimasUrl.trim() || undefined)}
      >
        {isLookingUp ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Verifying with ZIMAS…
          </>
        ) : (
          'Verify address with ZIMAS'
        )}
      </Button>
    </div>
  )
}
