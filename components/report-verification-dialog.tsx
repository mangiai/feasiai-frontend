'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { reportFontClassName } from '@/lib/report-fonts'
import { useToast } from '@/components/toast'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  RotateCcwIcon,
  XCircleIcon,
  type LucideIcon,
} from 'lucide-react'

export type VerificationAction = 'approved' | 'rejected' | 'revisions_requested'

const ACTION_META: Record<
  VerificationAction,
  {
    title: string
    description: string
    confirmLabel: string
    notesLabel: string
    notesPlaceholder: string
    notesRequired: boolean
    icon: LucideIcon
    accent: string
    iconBg: string
    confirmClass: string
  }
> = {
  approved: {
    title: 'Approve report',
    description: 'Confirm this report passes expert verification. Notes are optional but help the team track context.',
    confirmLabel: 'Confirm approval',
    notesLabel: 'Review notes',
    notesPlaceholder: 'Optional — e.g. verified against ZIMAS, setbacks confirmed…',
    notesRequired: false,
    icon: CheckCircle2Icon,
    accent: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/15 ring-emerald-500/30',
    confirmClass:
      'bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 border-transparent',
  },
  revisions_requested: {
    title: 'Request revisions',
    description: 'Send this report back for corrections. Describe what must change before it can be approved.',
    confirmLabel: 'Request revisions',
    notesLabel: 'Revision instructions',
    notesPlaceholder: 'Required — list sections, numbers, or data that need correction…',
    notesRequired: true,
    icon: RotateCcwIcon,
    accent: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/15 ring-amber-500/30',
    confirmClass:
      'bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500 border-transparent',
  },
  rejected: {
    title: 'Reject report',
    description: 'Reject this report when it cannot pass verification as submitted. A clear reason is required.',
    confirmLabel: 'Confirm rejection',
    notesLabel: 'Rejection reason',
    notesPlaceholder: 'Required — explain why this report is rejected…',
    notesRequired: true,
    icon: XCircleIcon,
    accent: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500/15 ring-red-500/30',
    confirmClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent',
  },
}

export interface ReportVerificationDialogProps {
  reportId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  action: VerificationAction | null
}

export function ReportVerificationDialog({
  reportId,
  open,
  onOpenChange,
  action,
}: ReportVerificationDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = action ? ACTION_META[action] : null
  const Icon = meta?.icon ?? CheckCircle2Icon
  const notesTrimmed = notes.trim()
  const canSubmit = meta && (!meta.notesRequired || notesTrimmed.length > 0)

  useEffect(() => {
    if (open) {
      setNotes('')
      setError(null)
    }
  }, [open, action])

  async function handleSubmit() {
    if (!action || !canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/${reportId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notesTrimmed || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Could not save your review decision.'
        setError(msg)
        toast(msg, 'error')
        return
      }
      onOpenChange(false)
      toast(
        action === 'approved'
          ? 'Report approved'
          : action === 'rejected'
            ? 'Report rejected'
            : 'Revisions requested',
        'success',
      )
      router.refresh()
    } catch {
      const msg = 'Network error — try again.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg',
          reportFontClassName,
        )}
        showCloseButton
      >
        {meta && (
          <>
            <div
              className={cn(
                'border-b px-6 pt-6 pb-5',
                action === 'approved' && 'bg-emerald-500/5',
                action === 'revisions_requested' && 'bg-amber-500/5',
                action === 'rejected' && 'bg-destructive/5',
              )}
            >
              <DialogHeader className="gap-4 p-0 text-left">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1',
                      meta.iconBg,
                    )}
                  >
                    <Icon className={cn('h-5 w-5', meta.accent)} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                    <DialogTitle className="font-[family-name:var(--font-report-display)] text-xl tracking-wide">
                      {meta.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed">
                      {meta.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <DialogBody className="space-y-4 pt-5 pb-2">
              <div className="space-y-2">
                <Label htmlFor="verification-notes" className="text-sm font-medium">
                  {meta.notesLabel}
                  {meta.notesRequired ? (
                    <span className="text-destructive"> *</span>
                  ) : (
                    <span className="font-normal text-muted-foreground"> (optional)</span>
                  )}
                </Label>
                <Textarea
                  id="verification-notes"
                  placeholder={meta.notesPlaceholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  className="min-h-[120px] resize-y rounded-lg border-border/80 bg-muted/20 px-3 py-2.5 text-sm leading-relaxed focus-visible:ring-2"
                  aria-invalid={meta.notesRequired && !notesTrimmed && notes.length > 0}
                />
                <p className="text-xs text-muted-foreground">
                  {meta.notesRequired
                    ? 'At least one sentence is required before submitting.'
                    : 'Visible to the project team after you confirm.'}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </DialogBody>

            <DialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-w-[5.5rem] rounded-lg"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={cn('min-w-[9rem] rounded-lg shadow-sm', meta.confirmClass)}
                onClick={handleSubmit}
                disabled={loading || !canSubmit}
              >
                {loading ? (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="mr-2 h-4 w-4" />
                )}
                {meta.confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
