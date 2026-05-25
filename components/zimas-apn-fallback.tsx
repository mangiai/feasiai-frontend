'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2Icon, MapPinIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeApnInput } from '@/lib/zimas-search-address'

export interface ZimasApnFallbackProps {
  disabled?: boolean
  isLookingUp?: boolean
  onLookupByApn: (apn: string) => void
  className?: string
  /** When true, omit outer card chrome (for use inside FeasibilityAccordion). */
  embedded?: boolean
}

export function ZimasApnFallback({
  disabled,
  isLookingUp,
  onLookupByApn,
  className,
  embedded,
}: ZimasApnFallbackProps) {
  const [apn, setApn] = useState('')
  const digits = normalizeApnInput(apn)

  return (
    <div
      className={cn(
        embedded ? 'space-y-3' : 'rounded-xl border border-amber-500/35 bg-amber-500/5 p-4 space-y-3',
        className,
      )}
    >
      {!embedded && (
        <div className="flex items-start gap-3">
          <MapPinIcon className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Look up by Assessor Parcel Number (APN)</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The street-address lookup did not find or verify this parcel on ZIMAS. Enter the 10-digit APN
              from ZIMAS → Search → Assessor Parcel Number (same flow as zimas.lacity.org).
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="zimas-apn" className="text-xs">
          Assessor Parcel No. (APN) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="zimas-apn"
          placeholder="e.g. 5306015055"
          value={apn}
          onChange={(e) => setApn(e.target.value)}
          disabled={disabled || isLookingUp}
          className="font-mono text-sm"
          inputMode="numeric"
        />
        {apn.trim() && digits.length < 8 && (
          <p className="text-xs text-muted-foreground">APN is usually 10 digits for Los Angeles parcels.</p>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={disabled || isLookingUp || digits.length < 8}
        onClick={() => onLookupByApn(digits)}
      >
        {isLookingUp ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            Looking up APN…
          </>
        ) : (
          'Look up by APN'
        )}
      </Button>
    </div>
  )
}
