'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { ArrowLeftIcon, CpuIcon } from 'lucide-react'

type TokenUsagePayload = {
  stage?: string
  provider?: string
  model?: string
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  cost_usd?: number
  metadata?: Record<string, unknown>
}

type RunDetailResponse = {
  run: {
    id: string
    flow_type: string
    status: string
    started_at: string | null
    completed_at: string | null
    input_tokens: number | null
    output_tokens: number | null
    cost_usd: number | string | null
    metadata: Record<string, unknown> | null
  }
  events: Array<{
    id: string
    run_id: string
    seq: number
    event_type: string
    ts: string
    payload: unknown
  }>
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Failed to fetch ${path}`)
  }
  return (await res.json()) as T
}

function asNumber(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0
  return Number.isFinite(n) ? n : 0
}

export default function LLMUsageRunDetailPage() {
  const params = useParams<{ runId: string }>()
  const runId = params?.runId

  const [data, setData] = useState<RunDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    if (!runId) return
    setLoading(true)
    fetchJson<RunDetailResponse>(`/api/sa/usage/runs/${runId}`)
      .then((res) => {
        if (!mounted) return
        setData(res)
        setError(null)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load run')
        setData(null)
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [runId])

  const stageBreakdown = useMemo(() => {
    const buckets: Record<string, { input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number; events: number }> = {}
    for (const ev of data?.events ?? []) {
      if (ev.event_type !== 'token_usage') continue
      const p = (ev.payload || {}) as TokenUsagePayload
      const stage = String(p.stage || 'unknown')
      const input = asNumber(p.input_tokens)
      const output = asNumber(p.output_tokens)
      const total = asNumber(p.total_tokens || (input + output))
      const cost = asNumber(p.cost_usd)
      buckets[stage] = buckets[stage] || { input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0, events: 0 }
      buckets[stage].input_tokens += input
      buckets[stage].output_tokens += output
      buckets[stage].total_tokens += total
      buckets[stage].cost_usd += cost
      buckets[stage].events += 1
    }
    return Object.entries(buckets).sort((a, b) => (b[1].cost_usd || 0) - (a[1].cost_usd || 0))
  }, [data])

  const run = data?.run
  const costNumber = asNumber(run?.cost_usd)

  return (
    <div className="space-y-6">
      <SAPageHeader
        title="LLM Usage — Run Detail"
        icon={CpuIcon}
        subtitle={run ? `Run ${run.id.slice(0, 8)} • ${run.flow_type}` : 'Loading…'}
        actions={(
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/sa/llm-usage">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        )}
      />

      {loading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Fetching run events…</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-sm">Unable to load run</CardTitle>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {run ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Run</CardTitle>
              <CardDescription>Lifecycle metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{run.id}</span>
                <Badge variant={run.status === 'completed' ? 'default' : 'outline'}>{run.status}</Badge>
                <Badge variant="secondary">{run.flow_type}</Badge>
              </div>
              <div className="text-muted-foreground">
                Started: {run.started_at ?? '—'}<br />
                Completed: {run.completed_at ?? '—'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Totals</CardTitle>
              <CardDescription>From `agent_runs`</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Tokens: {(asNumber(run.input_tokens) + asNumber(run.output_tokens)).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Cost: ${costNumber.toFixed(4)}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Stage breakdown</CardTitle>
          <CardDescription>Aggregated from `token_usage` events for this run</CardDescription>
        </CardHeader>
        <CardContent>
          {stageBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No token usage events found for this run.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Stage</th>
                    <th className="px-4 py-3 text-left font-medium">Tokens</th>
                    <th className="px-4 py-3 text-left font-medium">Cost</th>
                    <th className="px-4 py-3 text-left font-medium">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {stageBreakdown.map(([stage, v]) => (
                    <tr key={stage} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{stage}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.total_tokens.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">${v.cost_usd.toFixed(4)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{v.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

