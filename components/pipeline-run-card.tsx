'use client'

import { useState } from 'react'
import { PipelineStatusBadge } from '@/components/pipeline-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  PauseIcon,
  PlayIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CoinsIcon,
} from 'lucide-react'
import type { PipelineRun, PipelineMessage, PipelineStatus } from '@/types/database'

type RunWithMessages = PipelineRun & {
  pipeline_messages?: PipelineMessage[]
}

interface PipelineRunCardProps {
  run: RunWithMessages
  onPause?: (runId: string) => void
  onResume?: (runId: string) => void
  onCancel?: (runId: string) => void
}

const PROGRESS_MAP: Record<PipelineStatus, number> = {
  queued: 0,
  running: 50,
  awaiting_input: 40,
  paused_credits: 50,
  paused_manual: 50,
  completed: 100,
  failed: 100,
  cancelled: 100,
}

function relativeTime(date: string | null): string {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function PipelineRunCard({ run, onPause, onResume, onCancel }: PipelineRunCardProps) {
  const [expanded, setExpanded] = useState(false)
  const progress = PROGRESS_MAP[run.status] ?? 0
  const messages = run.pipeline_messages ?? []
  const isRunning = run.status === 'running'
  const isPaused = run.status === 'paused_manual' || run.status === 'paused_credits'
  const canCancel = isRunning || isPaused

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <PipelineStatusBadge status={run.status} />
            <span className="text-sm font-medium capitalize truncate">
              {run.flow_type?.replace('_', ' ')}
            </span>
            <span className="text-xs text-muted-foreground">
              {relativeTime(run.started_at ?? run.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CoinsIcon className="w-3.5 h-3.5" />
              <span className="tabular-nums">
                {run.credits_consumed ?? 0}/{run.credits_estimated ?? '—'}
              </span>
            </div>
            {isRunning && onPause && (
              <Button variant="ghost" size="sm" onClick={() => onPause(run.id)}>
                <PauseIcon className="w-3.5 h-3.5" />
              </Button>
            )}
            {isPaused && onResume && (
              <Button variant="ghost" size="sm" onClick={() => onResume(run.id)}>
                <PlayIcon className="w-3.5 h-3.5" />
              </Button>
            )}
            {canCancel && onCancel && (
              <Button variant="ghost" size="sm" onClick={() => onCancel(run.id)}>
                <XIcon className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {messages.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUpIcon className="w-3.5 h-3.5" />
              ) : (
                <ChevronDownIcon className="w-3.5 h-3.5" />
              )}
              {messages.length} message{messages.length !== 1 && 's'}
            </button>

            {expanded && (
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-md border px-3 py-2 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-medium">
                        {msg.agent_name ?? msg.role}
                        {msg.phase && (
                          <span className="ml-1.5 text-muted-foreground/70">
                            · {msg.phase}
                          </span>
                        )}
                      </span>
                      <span>{relativeTime(msg.created_at)}</span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
