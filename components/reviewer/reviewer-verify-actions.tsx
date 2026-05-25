'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  ReportVerificationDialog,
  type VerificationAction,
} from '@/components/report-verification-dialog'
import { CheckCircleIcon, RotateCcwIcon, XCircleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReviewerVerifyActions({
  reportId,
  verificationStatus,
}: {
  reportId: string
  verificationStatus: string
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<VerificationAction | null>(null)

  const isPending = verificationStatus === 'pending' || verificationStatus === 'in_progress'

  function openVerification(action: VerificationAction) {
    setDialogAction(action)
    setDialogOpen(true)
  }

  if (!isPending) return null

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/25 p-4">
        <span className="mr-auto text-sm font-medium text-muted-foreground">Reviewer decision</span>
        <Button
          size="sm"
          className={cn(
            'rounded-lg border-transparent',
            'bg-emerald-600 text-white hover:bg-emerald-500',
          )}
          onClick={() => openVerification('approved')}
        >
          <CheckCircleIcon className="mr-1 h-3.5 w-3.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
          onClick={() => openVerification('revisions_requested')}
        >
          <RotateCcwIcon className="mr-1 h-3.5 w-3.5" />
          Revisions
        </Button>
        <Button size="sm" variant="destructive" className="rounded-lg" onClick={() => openVerification('rejected')}>
          <XCircleIcon className="mr-1 h-3.5 w-3.5" />
          Reject
        </Button>
      </div>

      <ReportVerificationDialog
        reportId={reportId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
      />
    </>
  )
}
