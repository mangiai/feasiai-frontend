'use client'

import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CoinsIcon } from 'lucide-react'

interface PaywallOverlayProps {
  isOpen: boolean
  onClose: () => void
  creditsNeeded: number
  currentCredits: number
}

export function PaywallOverlay({
  isOpen,
  onClose,
  creditsNeeded,
  currentCredits,
}: PaywallOverlayProps) {
  const deficit = creditsNeeded - currentCredits

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <CoinsIcon className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Insufficient Credits</DialogTitle>
          <DialogDescription className="text-center">
            You need <span className="font-semibold text-foreground">{deficit} more credit{deficit !== 1 ? 's' : ''}</span> to
            continue. You currently have{' '}
            <span className="font-semibold text-foreground">{currentCredits}</span> credit
            {currentCredits !== 1 ? 's' : ''}, but this action requires{' '}
            <span className="font-semibold text-foreground">{creditsNeeded}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full">
            <Link href="/settings/billing">Buy Credits</Link>
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
