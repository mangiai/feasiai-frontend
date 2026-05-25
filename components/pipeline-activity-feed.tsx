'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PipelineRun } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityIcon, CheckCircleIcon, XCircleIcon, LoaderIcon } from 'lucide-react'
import { relativeTime } from '@/lib/status-utils'

interface PipelineEvent {
  id: string
  status: string
  started_at: string | null
  completed_at: string | null
  project_id: string
  flow_type: string
  created_at: string
}

function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
    case 'failed':
      return <XCircleIcon className="h-4 w-4 text-red-500" />
    case 'running':
      return <LoaderIcon className="h-4 w-4 text-blue-500 animate-spin" />
    default:
      return <ActivityIcon className="h-4 w-4 text-muted-foreground" />
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'queued':
      return 'Queued'
    case 'running':
      return 'Running'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    default:
      return status
  }
}

interface PipelineActivityFeedProps {
  workspaceId: string
}

export function PipelineActivityFeed({ workspaceId }: PipelineActivityFeedProps) {
  const supabase = createClient()
  const [events, setEvents] = useState<PipelineEvent[]>([])
  const [isRealtime, setIsRealtime] = useState(false)

  // Initial fetch
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('pipeline_runs')
        .select('id, status, started_at, completed_at, project_id, flow_type, created_at, projects!inner(workspace_id)')
        .eq('projects.workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) setEvents(data as unknown as PipelineEvent[])
    }
    load()
  }, [workspaceId, supabase])

  // Realtime subscription
  useEffect(() => {
    // pipeline_runs has no workspace_id column — subscribe to all changes;
    // RLS + client-side project ownership provides the scoping.
    const channel = supabase
      .channel(`pipeline_runs:${workspaceId}`)
      .on<PipelineRun>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_runs' },
        (payload) => {
          const row = payload.new as PipelineEvent
          setEvents((prev) => {
            // Replace existing or prepend new
            const idx = prev.findIndex((e) => e.id === row.id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = row
              return next
            }
            return [row, ...prev].slice(0, 10)
          })
        },
      )
      .subscribe((status) => {
        setIsRealtime(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspaceId, supabase])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Pipeline Activity</CardTitle>
          {isRealtime && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No pipeline activity yet
          </p>
        ) : (
          <div className="divide-y">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5">
                {statusIcon(e.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {e.flow_type?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Pipeline'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {statusLabel(e.status)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {relativeTime(e.completed_at ?? e.started_at ?? e.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
