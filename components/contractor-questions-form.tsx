'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2Icon, SendIcon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react'
import { useToast } from '@/components/toast'
import type { LegacyContractorAnswer as ContractorAnswer } from '@/types/database'
import { APP_DB_SCHEMA } from '@/lib/app-schema'

interface ContractorQuestionsFormProps {
  projectId: string
  userId: string
}

export function ContractorQuestionsForm({ projectId, userId }: ContractorQuestionsFormProps) {
  const [questions, setQuestions] = useState<ContractorAnswer[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()

  useEffect(() => {
    supabase
      .schema(APP_DB_SCHEMA)
      .from('contractor_answers')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError('Failed to load questions.')
          setLoading(false)
          return
        }
        if (data) {
          setQuestions(data as ContractorAnswer[])
          const existing: Record<string, string> = {}
          data.forEach((q: ContractorAnswer) => {
            if (q.answer_text) existing[q.id] = q.answer_text
          })
          setAnswers(existing)
        }
        setLoading(false)
      }, () => {
        setError('Failed to load questions. Please try again.')
        setLoading(false)
      })
  }, [projectId, supabase])

  const handleSubmit = async () => {
    // Validate at least one answer is non-empty
    const hasAnswer = Object.values(answers).some(v => v.trim().length > 0)
    if (!hasAnswer) {
      setError('Please answer at least one question before submitting.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      // Update each answer
      for (const q of questions) {
        const value = answers[q.id]
        if (value) {
          await supabase
            .schema(APP_DB_SCHEMA)
            .from('contractor_answers')
            .update({ answer_text: value, is_answered: true })
            .eq('id', q.id)
        }
      }

      // Trigger Phase 2
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          user_id: userId,
          flow_type: 'corrections-response',
        }),
      })
      if (!res.ok) {
        throw new Error('Failed to trigger generation')
      }
      setSubmitted(true)
      toast('Answers submitted! Generating response…', 'success')
    } catch (err) {
      console.error('Submit failed:', err)
      setError('Failed to submit answers. Please try again.')
      toast('Failed to submit answers', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-[0_8px_32px_rgba(28,25,23,0.08)] border-border/50">
        <CardContent className="p-6 space-y-8">
          {questions.map((q, index) => (
            <div key={q.id} className="space-y-3">
              <Label className="text-base font-body font-semibold text-foreground">
                <span className="text-primary mr-2">{index + 1}.</span>
                {q.question_text}
              </Label>
              {q.context && (
                <p className="text-sm text-muted-foreground font-body">{q.context}</p>
              )}

              {q.question_type === 'text' && (
                <Textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Your answer..."
                  className="font-body"
                  rows={3}
                />
              )}

              {(q.question_type === 'number' || q.question_type === 'measurement') && (
                <Input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={q.question_type === 'measurement' ? 'e.g., 12 ft' : 'Enter a number'}
                  className="font-body max-w-xs"
                />
              )}

              {q.question_type === 'choice' && q.options && (
                <div className="space-y-2">
                  {(q.options as string[]).map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        value={option}
                        checked={answers[q.id] === option}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: option }))}
                        className="w-4 h-4 text-primary"
                      />
                      <span className="text-sm font-body text-foreground">{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircleIcon className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {submitted && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
          <CheckCircle2Icon className="w-4 h-4 text-success shrink-0" />
          <p className="text-sm text-foreground">Answers submitted successfully! Generating your response…</p>
        </div>
      )}

      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={submitting || submitted}
          className="rounded-full px-10 py-6 text-lg font-bold font-body
                     hover:shadow-[0_0_20px_rgba(45,106,79,0.15)]"
          size="lg"
        >
          {submitting ? (
            <Loader2Icon className="w-5 h-5 animate-spin" />
          ) : (
            <SendIcon className="w-5 h-5" />
          )}
          {submitting ? 'Submitting...' : 'Submit & Generate Response'}
        </Button>
      </div>
    </div>
  )
}
