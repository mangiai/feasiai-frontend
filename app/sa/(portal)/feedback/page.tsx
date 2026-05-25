'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MessageSquareIcon,
  InboxIcon,
  ZapIcon,
  CheckCircleIcon,
  Loader2Icon,
  ArrowRightIcon,
  FilterIcon,
} from 'lucide-react'

type FeedbackRow = {
  id: string
  report_id: string
  correction_type: string
  section_path: string
  original_content: string
  corrected_content: string
  city: string | null
  flow_type: string | null
  applied_to_pipeline: boolean
  applied_at: string | null
  created_at: string
  corrected_by: string
}

const typeColors: Record<string, string> = {
  factual: 'destructive',
  missing_info: 'secondary',
  formatting: 'outline',
  wrong_code: 'destructive',
  citation: 'secondary',
  unclear: 'outline',
  other: 'outline',
}

const FLOW_LABELS: Record<string, string> = {
  feasibility: 'Feasibility',
  city_review: 'City Review',
  corrections: 'Corrections',
}

const PAGE_SIZE = 25

export default function SAFeedbackPage() {
  const supabase = createClient()
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'unapplied' | 'applied' | 'all'>('unapplied')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<string | null>(null)
  const [diffDialog, setDiffDialog] = useState<FeedbackRow | null>(null)

  const load = useCallback(async () => {
    let query = supabase
      .from('report_feedback')
      .select('id, report_id, correction_type, section_path, original_content, corrected_content, city, flow_type, applied_to_pipeline, applied_at, created_at, corrected_by')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filterType !== 'all') {
      query = query.eq('correction_type', filterType as any)
    }
    if (filterStatus === 'unapplied') {
      query = query.eq('applied_to_pipeline', false)
    } else if (filterStatus === 'applied') {
      query = query.eq('applied_to_pipeline', true)
    }

    const { data } = await query
    const items = (data as unknown as FeedbackRow[]) ?? []
    setFeedback(prev => page === 0 ? items : [...prev, ...items])
    setHasMore(items.length === PAGE_SIZE)
    setLoading(false)
  }, [filterType, filterStatus, supabase, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(0) }, [filterType, filterStatus])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    const unapplied = feedback.filter((f) => !f.applied_to_pipeline)
    if (selected.size === unapplied.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(unapplied.map((f) => f.id)))
    }
  }

  async function handleApplyToSkill() {
    if (selected.size === 0) return
    setApplying(true)
    setApplyResult(null)

    try {
      const res = await fetch('/api/sa/feedback/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackIds: Array.from(selected) }),
      })

      if (res.ok) {
        const data = await res.json()
        setApplyResult(`✅ Applied ${data.applied} correction(s) to ${data.skillName}`)
        setSelected(new Set())
        await load()
      } else {
        const err = await res.json().catch(() => ({}))
        setApplyResult(`❌ Failed: ${err.error || 'Unknown error'}`)
      }
    } catch {
      setApplyResult('❌ Failed to connect to server')
    } finally {
      setApplying(false)
    }
  }

  const types = ['all', 'factual', 'missing_info', 'formatting', 'wrong_code', 'citation', 'unclear', 'other']
  const unappliedCount = feedback.filter((f) => !f.applied_to_pipeline).length

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="Feedback Backlog"
        icon={MessageSquareIcon}
        subtitle="Review corrections and apply selected updates to skill knowledge."
        badge={<Badge variant="secondary">{unappliedCount} unapplied</Badge>}
        actions={
          selected.size > 0 ? (
            <Button onClick={handleApplyToSkill} disabled={applying}>
              {applying ? (
                <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <ZapIcon className="mr-1.5 h-4 w-4" />
              )}
              Apply {selected.size} to Skill ({applying ? 'Processing…' : 'Trigger Update'})
            </Button>
          ) : null
        }
      />

      {/* Result banner */}
      {applyResult && (
        <div className={`p-3 rounded-lg text-sm ${applyResult.startsWith('✅') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
          {applyResult}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FilterIcon className="h-3.5 w-3.5" /> Type:
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filterType === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'all' ? 'All' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">Status:</div>
        {(['unapplied', 'applied', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filterStatus === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : feedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <InboxIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-1">No feedback entries</h2>
            <p className="text-sm text-muted-foreground">
              Report corrections will appear here as users and reviewers submit edits.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Feedback Entries</CardTitle>
            <CardDescription>
              Select entries and click &quot;Apply to Skill&quot; to update agent knowledge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-3 w-10">
                      <Checkbox
                        checked={selected.size > 0 && selected.size === unappliedCount}
                        onCheckedChange={selectAll}
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Flow</th>
                    <th className="text-left px-4 py-3 font-medium">Section</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((f) => (
                    <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-3">
                        {!f.applied_to_pipeline && (
                          <Checkbox
                            checked={selected.has(f.id)}
                            onCheckedChange={() => toggleSelect(f.id)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(typeColors[f.correction_type] as any) || 'outline'}>
                          {f.correction_type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {FLOW_LABELS[f.flow_type || ''] || f.flow_type || '—'}
                        {f.city && <span className="block text-xs">{f.city}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {f.section_path?.replace(/[._-]/g, ' ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {f.applied_to_pipeline ? (
                          <Badge variant="default">
                            <CheckCircleIcon className="mr-1 h-3 w-3" />
                            Applied
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(f.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDiffDialog(f)}
                        >
                          View Diff
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={loading}>
            Load More
          </Button>
        </div>
      )}

      {/* Diff Dialog */}
      <Dialog open={!!diffDialog} onOpenChange={() => setDiffDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Correction: {diffDialog?.section_path?.replace(/[._-]/g, ' ')}
            </DialogTitle>
            <DialogDescription>
              {diffDialog?.correction_type?.replace('_', ' ')} correction
              {diffDialog?.city && ` — ${diffDialog.city}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                ❌ Original
              </h4>
              <pre className="text-xs bg-red-50 dark:bg-red-900/10 p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-auto border border-red-200 dark:border-red-800">
                {diffDialog?.original_content || 'No original content'}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                ✅ Corrected
              </h4>
              <pre className="text-xs bg-green-50 dark:bg-green-900/10 p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-auto border border-green-200 dark:border-green-800">
                {diffDialog?.corrected_content || 'No corrected content'}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiffDialog(null)}>Close</Button>
            {diffDialog && !diffDialog.applied_to_pipeline && (
              <Button
                onClick={() => {
                  setSelected(new Set([diffDialog.id]))
                  setDiffDialog(null)
                }}
              >
                <ArrowRightIcon className="mr-1 h-3.5 w-3.5" />
                Select for Apply
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
