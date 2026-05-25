'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReportMarkdownViewer } from '@/components/report-markdown-viewer'
import {
  ReportVerificationDialog,
  type VerificationAction,
} from '@/components/report-verification-dialog'
import { Button } from '@/components/ui/button'
import { CheckCircleIcon, XCircleIcon, RotateCcwIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewContentProps {
  reportId: string
  artifacts: Record<string, unknown>
  flowType: string
  validationScore?: number
  verificationStatus: string
  projectAddress?: string | null
  projectName?: string | null
}

export function ReviewContent({
  reportId,
  artifacts,
  flowType,
  validationScore,
  verificationStatus,
  projectAddress,
  projectName,
}: ReviewContentProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<VerificationAction | null>(null)

  const isPending = verificationStatus === 'pending' || verificationStatus === 'in_progress'

  function openVerification(action: VerificationAction) {
    setDialogAction(action)
    setDialogOpen(true)
  }

  async function handleSaveEdits(updatedArtifacts: Record<string, unknown>) {
    for (const [key, newValue] of Object.entries(updatedArtifacts)) {
      const oldValue = artifacts[key]
      const oldStr = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue, null, 2)
      const newStr = typeof newValue === 'string' ? newValue : JSON.stringify(newValue, null, 2)
      if (oldStr !== newStr) {
        fetch(`/api/reports/${reportId}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section_path: key,
            original_content: oldStr || '',
            corrected_content: newStr || '',
            correction_type: 'other',
          }),
        }).catch(() => {})
      }
    }

    const res = await fetch(`/api/reports/${reportId}/content`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artifacts: updatedArtifacts }),
    })
    if (!res.ok) throw new Error('Failed to save edits')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {isPending && (
        <div className="rounded-xl border border-border/80 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Expert review decision</p>
              <p className="text-xs text-muted-foreground">
                Approve, request revisions, or reject after reviewing the report below.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              size="sm"
              className={cn(
                'h-10 w-full rounded-lg border-transparent',
                'bg-emerald-600 text-white hover:bg-emerald-500 dark:hover:bg-emerald-500',
              )}
              onClick={() => openVerification('approved')}
            >
              <CheckCircleIcon className="mr-1.5 h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-full rounded-lg border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
              onClick={() => openVerification('revisions_requested')}
            >
              <RotateCcwIcon className="mr-1.5 h-4 w-4" />
              Revisions
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-10 w-full rounded-lg"
              onClick={() => openVerification('rejected')}
            >
              <XCircleIcon className="mr-1.5 h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      )}

      <ReportMarkdownViewer
        artifacts={artifacts}
        flowType={flowType}
        validationScore={validationScore}
        editable={isPending}
        onSave={handleSaveEdits}
        projectAddress={projectAddress}
        projectName={projectName}
      />

      <ReportVerificationDialog
        reportId={reportId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
      />
    </div>
  )
}
