'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ShieldCheckIcon, Loader2Icon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react'

interface VerificationFormProps {
  reportId: string
  onSubmit: () => void
  triggerLabel?: string
  disabled?: boolean
}

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export default function VerificationForm({
  reportId,
  onSubmit,
  triggerLabel = 'Request Verification',
  disabled = false,
}: VerificationFormProps) {
  const [open, setOpen] = useState(false)
  const [priority, setPriority] = useState<'standard' | 'expedited'>('standard')
  const [notes, setNotes] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [canFallbackToStandard, setCanFallbackToStandard] = useState(false)

  async function submitVerification(requestPriority: 'standard' | 'expedited') {
    setState('submitting')
    setErrorMsg('')
    setCanFallbackToStandard(false)

    try {
      const res = await fetch(`/api/reports/${reportId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: requestPriority, notes: notes.trim() || undefined }),
      })

      if (res.ok) {
        setState('success')
        setTimeout(() => {
          setOpen(false)
          setState('idle')
          setNotes('')
          setPriority('standard')
          onSubmit()
        }, 1500)
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || 'Failed to submit verification request')
        if (res.status === 402 && requestPriority === 'expedited') {
          setCanFallbackToStandard(true)
        }
        setState('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  async function handleSubmit() {
    await submitVerification(priority)
  }

  async function handleFallbackToStandard() {
    await submitVerification('standard')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <ShieldCheckIcon className="mr-1.5 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Report Verification</DialogTitle>
          <DialogDescription>
            Submit this report for expert verification. Choose your preferred turnaround time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Priority selection */}
          <div className="space-y-3">
            <Label>Review Priority</Label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex cursor-pointer flex-col rounded-lg border p-4 transition-colors ${
                  priority === 'standard'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value="standard"
                  checked={priority === 'standard'}
                  onChange={() => setPriority('standard')}
                  className="sr-only"
                />
                <span className="text-sm font-medium">Standard</span>
                <span className="mt-1 text-xs text-muted-foreground">Within 48 hours</span>
                <span className="mt-2 text-xs font-medium text-muted-foreground">Included</span>
              </label>
              <label
                className={`flex cursor-pointer flex-col rounded-lg border p-4 transition-colors ${
                  priority === 'expedited'
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value="expedited"
                  checked={priority === 'expedited'}
                  onChange={() => setPriority('expedited')}
                  className="sr-only"
                />
                <span className="text-sm font-medium">Expedited</span>
                <span className="mt-1 text-xs text-muted-foreground">Within 24 hours</span>
                <span className="mt-2 text-xs font-medium text-amber-500">+5 credits</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="verify-notes">Additional Notes (optional)</Label>
            <Textarea
              id="verify-notes"
              placeholder="Any specific areas to review, special requirements…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Feedback messages */}
          {state === 'success' && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircleIcon className="h-4 w-4" />
              Verification request submitted!
            </div>
          )}
          {state === 'error' && (
            <div className="space-y-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircleIcon className="h-4 w-4" />
                {errorMsg}
              </div>
              {canFallbackToStandard && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFallbackToStandard}
                >
                  Submit as Standard Instead
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={state === 'submitting'}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={state === 'submitting' || state === 'success'}>
            {state === 'submitting' ? (
              <>
                <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
