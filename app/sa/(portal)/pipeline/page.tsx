'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { ActivityIcon, PauseIcon, PlayIcon, XIcon, RotateCcwIcon, Loader2Icon } from 'lucide-react'
import type { PipelineStatus } from '@/types/database'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PipelineRunRow {
  id: string
  flow_type: string
  status: PipelineStatus
  credits_consumed: number | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  projects: {
    name: string
    city: string | null
    workspace_id: string
  } | null
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'secondary',
  running: 'default',
  paused: 'secondary',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'secondary',
}

const STATUS_DOT: Record<string, string> = {
  queued: 'bg-gray-400',
  running: 'bg-blue-500',
  paused: 'bg-yellow-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-400',
}

const ALL_STATUSES = ['all', 'queued', 'running', 'paused', 'completed', 'failed', 'cancelled'] as const

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '—'
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const seconds = Math.round((e - s) / 1000)
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function PipelineActions({
  runId,
  projectId,
  status,
  onActionComplete,
}: {
  runId: string
  projectId: string
  status: PipelineStatus
  onActionComplete: () => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function performAction(action: 'pause' | 'resume' | 'cancel' | 'retry') {
    setLoading(action)
    try {
      await fetch(`/api/projects/${projectId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId }),
      })
      onActionComplete()
    } finally {
      setLoading(null)
    }
  }

  const canPause = status === 'running'
  const canResume = status === 'paused_credits' || status === 'paused_manual'
  const canCancel = status === 'running' || status === 'paused_credits' || status === 'paused_manual'
  const canRetry = status === 'failed'

  if (!canPause && !canResume && !canCancel && !canRetry) {
    return <span className="text-muted-foreground text-xs">—</span>
  }

  return (
    <div className="flex gap-1">
      {canPause && (
        <Button size="sm" variant="outline" disabled={!!loading} onClick={() => performAction('pause')}>
          {loading === 'pause' ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PauseIcon className="h-3.5 w-3.5" />}
        </Button>
      )}
      {canResume && (
        <Button size="sm" variant="outline" disabled={!!loading} onClick={() => performAction('resume')}>
          {loading === 'resume' ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PlayIcon className="h-3.5 w-3.5" />}
        </Button>
      )}
      {canCancel && (
        <>
          <Button size="sm" variant="destructive" disabled={!!loading} onClick={() => setConfirmCancel(true)}>
            {loading === 'cancel' ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <XIcon className="h-3.5 w-3.5" />}
          </Button>
          <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Pipeline Run?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will cancel the pipeline run. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Running</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setConfirmCancel(false); performAction('cancel') }}>
                  Cancel Run
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      {canRetry && (
        <Button size="sm" variant="outline" disabled={!!loading} onClick={() => performAction('retry')}>
          {loading === 'retry' ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <RotateCcwIcon className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  )
}

export default function SAPipelinePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [runs, setRuns] = useState<PipelineRunRow[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    supabase
      .from('pipeline_runs')
      .select('*, projects(name, city, workspace_id)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setRuns((data as PipelineRunRow[]) || [])
        setLoading(false)
      })
  }, [supabase])

  const statusCounts = runs.reduce<Record<string, number>>((acc, r) => {
    const s = r.status || 'unknown'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const filtered = statusFilter === 'all'
    ? runs
    : runs.filter((r) => r.status === statusFilter)

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="Pipeline Queue"
        icon={ActivityIcon}
        subtitle="Live pipeline operations and run controls."
        badge={<Badge variant="secondary">{runs.length} recent runs</Badge>}
      />

      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            className={statusFilter !== s ? 'border-border text-muted-foreground hover:text-foreground' : ''}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'all' ? ` (${runs.length})` : statusCounts[s] ? ` (${statusCounts[s]})` : ''}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Pipeline Runs</CardTitle>
          <CardDescription>Monitor pipeline runs across all workspaces.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Project</th>
                    <th className="text-left px-4 py-3 font-medium">City</th>
                    <th className="text-left px-4 py-3 font-medium">Flow Type</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Credits</th>
                    <th className="text-left px-4 py-3 font-medium">Started</th>
                    <th className="text-left px-4 py-3 font-medium">Duration</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{r.projects?.name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.projects?.city || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{r.flow_type || '—'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            (STATUS_COLORS[r.status || ''] as 'secondary' | 'default' | 'destructive') || 'secondary'
                          }
                          className="gap-1.5"
                        >
                          <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[r.status || ''] || 'bg-gray-400'}`} />
                          {r.status || 'unknown'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{r.credits_consumed ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.started_at ? new Date(r.started_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDuration(r.started_at, r.completed_at)}
                      </td>
                      <td className="px-4 py-3">
                        <PipelineActions
                          runId={r.id}
                          projectId={r.projects?.workspace_id || ''}
                          status={r.status}
                          onActionComplete={() => {
                            supabase
                              .from('pipeline_runs')
                              .select('*, projects(name, city, workspace_id)')
                              .order('created_at', { ascending: false })
                              .limit(50)
                              .then(({ data }) => setRuns((data as PipelineRunRow[]) || []))
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No pipeline runs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
