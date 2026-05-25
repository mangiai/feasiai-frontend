'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2Icon, RefreshCwIcon, HistoryIcon } from 'lucide-react'
import type { PreservedFeasibilityInput } from '@/lib/sa/preserved-feasibility-input'

type ReportVersionRow = {
  id: string
  version_number: number
  change_summary: string | null
  change_type: string | null
  created_at: string
}

type PipelineOutputRow = {
  id: string
  version: number
  agent_duration_ms: number | null
  created_at: string
  validation_status: string | null
  confidence_score: number | null
}

type RegenerateStatus = {
  project_status: string
  is_processing: boolean
  current_report_version: number
  preserved_inputs: PreservedFeasibilityInput
  report_versions: ReportVersionRow[]
  pipeline_outputs: PipelineOutputRow[]
}

function formatInputLabel(key: string): string {
  return key.replace(/_/g, ' ')
}

export function SAReportRegeneratePanel({
  reportId,
  reportType,
}: {
  reportId: string
  reportType: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<RegenerateStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/sa/reports/${reportId}/regenerate`, { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(typeof data?.error === 'string' ? data.error : 'Failed to load regeneration status')
        setStatus(null)
        return
      }
      const data = (await res.json()) as RegenerateStatus
      setStatus(data)
      setError(null)
    } catch {
      setError('Failed to load regeneration status')
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const wasProcessingRef = useRef(false)

  useEffect(() => {
    if (!status?.is_processing) return
    const timer = setInterval(() => {
      void loadStatus()
    }, 5000)
    return () => clearInterval(timer)
  }, [status?.is_processing, loadStatus])

  useEffect(() => {
    if (wasProcessingRef.current && status && !status.is_processing) {
      router.refresh()
    }
    wasProcessingRef.current = status?.is_processing ?? false
  }, [status?.is_processing, status, router])

  const handleRegenerate = async () => {
    setRegenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/sa/reports/${reportId}/regenerate`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Regeneration failed')
        return
      }
      await loadStatus()
      router.refresh()
    } catch {
      setError('Regeneration request failed')
    } finally {
      setRegenerating(false)
    }
  }

  if (reportType !== 'feasibility') return null

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCwIcon className="h-4 w-4 text-primary" />
              Regenerate feasibility
            </CardTitle>
            <CardDescription>
              Re-runs the pipeline with preserved project inputs. The current report is snapshotted as a version before the new output replaces it.
            </CardDescription>
          </div>
          {status?.is_processing && (
            <Badge variant="secondary" className="gap-1">
              <Loader2Icon className="h-3 w-3 animate-spin" />
              Processing
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Loading preserved inputs…
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            {error}
          </p>
        )}

        {status && (
          <>
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Preserved inputs (sent to pipeline)</p>
              <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
                {Object.entries(status.preserved_inputs).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="text-muted-foreground capitalize min-w-[7rem]">{formatInputLabel(key)}</dt>
                    <dd className="font-medium truncate">{String(value)}</dd>
                  </div>
                ))}
                {Object.keys(status.preserved_inputs).length === 0 && (
                  <p className="text-muted-foreground text-sm col-span-2">
                    No explicit inputs on file — pipeline will use address + ZIMAS only.
                  </p>
                )}
              </dl>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleRegenerate}
                disabled={regenerating || status.is_processing}
              >
                {regenerating ? (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="mr-2 h-4 w-4" />
                )}
                {regenerating ? 'Starting…' : 'Regenerate report'}
              </Button>
              <Button variant="outline" onClick={() => void loadStatus()} disabled={loading}>
                Refresh status
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <HistoryIcon className="h-3.5 w-3.5" />
                  Report versions (snapshots)
                </p>
                {status.report_versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No snapshots yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {status.report_versions.map((v) => (
                      <li key={v.id} className="rounded border px-2 py-1.5">
                        <span className="font-medium">v{v.version_number}</span>
                        <span className="text-muted-foreground"> — {v.change_summary || v.change_type || 'edit'}</span>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Pipeline output runs</p>
                {status.pipeline_outputs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No agent outputs yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {status.pipeline_outputs.map((o) => (
                      <li key={o.id} className="rounded border px-2 py-1.5">
                        <span className="font-medium">Output v{o.version}</span>
                        {o.confidence_score != null && (
                          <span className="text-muted-foreground"> — score {o.confidence_score}%</span>
                        )}
                        <span className="block text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleString()}
                          {o.agent_duration_ms != null && ` · ${Math.round(o.agent_duration_ms / 1000)}s`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Current report content version: v{status.current_report_version}. Project status: {status.project_status}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
