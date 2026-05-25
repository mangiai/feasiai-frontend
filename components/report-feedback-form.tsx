'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ReportFeedbackFormProps {
  reportId: string
}

const correctionTypes = [
  { value: 'factual' as const, label: 'Factual Error' },
  { value: 'missing_info' as const, label: 'Missing Information' },
  { value: 'formatting' as const, label: 'Formatting Issue' },
  { value: 'wrong_code' as const, label: 'Wrong Code Reference' },
  { value: 'citation' as const, label: 'Citation Issue' },
  { value: 'unclear' as const, label: 'Unclear Content' },
  { value: 'other' as const, label: 'Other' },
]

type CorrectionType = (typeof correctionTypes)[number]['value']

export function ReportFeedbackForm({ reportId }: ReportFeedbackFormProps) {
  const supabase = createClient()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [correctionType, setCorrectionType] = useState<CorrectionType | ''>('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')

    const form = e.currentTarget
    const sectionPath = (form.elements.namedItem('section') as HTMLInputElement).value
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value

    if (!correctionType || !description) {
      setStatus('error')
      return
    }

    // Get current user for corrected_by
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('error')
      return
    }

    const { error } = await supabase.from('report_feedback').insert({
      report_id: reportId,
      correction_type: correctionType,
      section_path: sectionPath || 'general',
      corrected_by: user.id,
      corrected_content: description,
      original_content: '',
      version_from: 1,
      version_to: 1,
    })

    if (error) {
      setStatus('error')
    } else {
      setStatus('sent')
      form.reset()
      setCorrectionType('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Correction Type</Label>
        <Select value={correctionType} onValueChange={(v) => setCorrectionType(v as CorrectionType)}>
          <SelectTrigger>
            <SelectValue placeholder="Select type…" />
          </SelectTrigger>
          <SelectContent>
            {correctionTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="section">Section (optional)</Label>
        <Input id="section" name="section" placeholder="e.g., Setback Analysis" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={4}
          placeholder="Describe the issue you found…"
        />
      </div>

      <Button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Submitting…' : 'Submit Feedback'}
      </Button>

      {status === 'sent' && (
        <p className="text-sm text-green-600">Feedback submitted. Thank you!</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-destructive">Failed to submit. Please fill all required fields and ensure you are logged in.</p>
      )}
    </form>
  )
}
