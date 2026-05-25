'use client'

import { useMemo, useState } from 'react'
import { ReviewerReportEditor } from '@/components/reviewer/reviewer-report-editor'
import { ReviewerVerifyActions } from '@/components/reviewer/reviewer-verify-actions'

export function ReviewerReportClient({
  reportId,
  initialArtifacts,
  flowType,
  validationScore,
  verificationStatus,
}: {
  reportId: string
  initialArtifacts: Record<string, unknown>
  flowType: string
  validationScore?: number
  verificationStatus: string
}) {
  const [artifacts, setArtifacts] = useState<Record<string, unknown>>(initialArtifacts)

  const effectiveValidationScore = useMemo(() => {
    if (typeof validationScore === 'number') return validationScore
    const score = artifacts && typeof artifacts === 'object' && 'validation_score' in artifacts
      ? (artifacts as { validation_score?: unknown }).validation_score
      : undefined
    return typeof score === 'number' ? score : undefined
  }, [artifacts, validationScore])

  return (
    <div className="space-y-6">
      <ReviewerVerifyActions reportId={reportId} verificationStatus={verificationStatus} />

      <ReviewerReportEditor
        artifacts={artifacts}
        flowType={flowType}
        validationScore={effectiveValidationScore}
        onSave={async (nextArtifacts) => {
          const res = await fetch(`/api/reports/${reportId}/content`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artifacts: nextArtifacts }),
          })
          if (!res.ok) throw new Error('Failed to save edits')
          setArtifacts(nextArtifacts)
        }}
      />
    </div>
  )
}

