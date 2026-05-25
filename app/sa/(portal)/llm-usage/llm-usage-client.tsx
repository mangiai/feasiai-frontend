'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { CalendarDaysIcon, CpuIcon, RefreshCw } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function formatUsd(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v ?? 0)
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`
}

function formatCompact(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v ?? 0)
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number.isFinite(n) ? n : 0)
}

function formatDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(parsed)
}

type UsageRangePreset = '7d' | 'month' | 'quarter' | 'custom'

type AppliedUsageRange =
  | { preset: Exclude<UsageRangePreset, 'custom'> }
  | { preset: 'custom'; from: string; to: string }

const RANGE_OPTIONS: Array<{ value: UsageRangePreset; label: string; description: string }> = [
  { value: '7d', label: 'Week', description: 'Last 7 days' },
  { value: 'month', label: 'Month', description: 'Last 30 days' },
  { value: 'quarter', label: 'Quarter', description: 'Last 90 days' },
  { value: 'custom', label: 'Custom', description: 'Choose dates' },
]

const RUNS_PAGE_SIZE = 25

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function defaultCustomRange() {
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 6)
  return { from: toDateInputValue(from), to: toDateInputValue(to) }
}

function buildUsageQuery(range: AppliedUsageRange) {
  const params = new URLSearchParams()
  params.set('range', range.preset)
  if (range.preset === 'custom') {
    params.set('from', range.from)
    params.set('to', range.to)
  }
  return params.toString()
}

function labelForRange(range: AppliedUsageRange) {
  switch (range.preset) {
    case '7d':
      return '7d'
    case 'month':
      return 'Month'
    case 'quarter':
      return 'Quarter'
    case 'custom':
      return `${range.from} to ${range.to}`
  }

  return '7d'
}

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(217 91% 60%)',
  'hsl(142 71% 45%)',
  'hsl(262 83% 58%)',
  'hsl(25 95% 53%)',
  'hsl(0 84% 60%)',
  'hsl(200 98% 39%)',
]

type SummaryResponse = {
  window: string
  range?: UsageRangePreset
  range_label?: string
  start_iso: string
  end_iso?: string
  totals: { input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number }
  by_stage: Record<string, { input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number; events: number }>
  by_model: Record<string, { input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number; events: number }>
  by_provider?: Record<string, { input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number; events: number }>
  timeline?: Array<{ date: string; input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number; events: number }>
}

type RunsResponse = {
  range?: UsageRangePreset
  range_label?: string
  start_iso?: string
  end_iso?: string
  total: number
  page?: number
  page_size?: number
  total_pages?: number
  runs: Array<{
    id: string
    project_id: string | null
    flow_type: string
    status: string
    started_at: string | null
    completed_at: string | null
    input_tokens: number
    output_tokens: number
    cost_usd: string | number
    metadata: Record<string, unknown>
    stage_breakdown: Record<string, { input_tokens: number; output_tokens: number; total_tokens: number; cost_usd: number; events: number }>
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

function topEntries<T extends { total_tokens: number; cost_usd: number }>(
  record: Record<string, T>,
  key: 'total_tokens' | 'cost_usd',
  n = 8,
) {
  return Object.entries(record)
    .sort((a, b) => (b[1]?.[key] ?? 0) - (a[1]?.[key] ?? 0))
    .slice(0, n)
}

export function LLMUsageClient(props: {
  initialSummary?: SummaryResponse | null
  initialRuns?: RunsResponse | null
  window?: '7d' | 'month' | 'quarter'
  pollMs?: number
}) {
  const pollMs = props.pollMs ?? 10_000
  const initialCustomRange = useMemo(() => defaultCustomRange(), [])

  const [summary, setSummary] = useState<SummaryResponse | null>(props.initialSummary ?? null)
  const [runs, setRuns] = useState<RunsResponse | null>(props.initialRuns ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [appliedRange, setAppliedRange] = useState<AppliedUsageRange>({ preset: props.window ?? '7d' })
  const [customFrom, setCustomFrom] = useState(initialCustomRange.from)
  const [customTo, setCustomTo] = useState(initialCustomRange.to)
  const [runPage, setRunPage] = useState(1)
  const lastUpdatedAtRef = useRef<number | null>(null)
  const requestSeqRef = useRef(0)
  const [, forceTick] = useState(0)

  const refresh = useCallback(async () => {
    if (appliedRange.preset === 'custom' && (!appliedRange.from || !appliedRange.to)) {
      setError('Choose both from and to dates before applying a custom range.')
      return
    }

    const requestSeq = requestSeqRef.current + 1
    requestSeqRef.current = requestSeq
    setIsRefreshing(true)
    try {
      const query = buildUsageQuery(appliedRange)
      const [nextSummary, nextRuns] = await Promise.all([
        fetchJson<SummaryResponse>(`/api/sa/usage/summary?${query}`),
        fetchJson<RunsResponse>(`/api/sa/usage/runs?limit=${RUNS_PAGE_SIZE}&page=${runPage}&${query}`),
      ])
      if (requestSeq !== requestSeqRef.current) return
      setSummary(nextSummary)
      setRuns(nextRuns)
      lastUpdatedAtRef.current = Date.now()
      setError(null)
    } catch (e) {
      if (requestSeq !== requestSeqRef.current) return
      setError(e instanceof Error ? e.message : 'Failed to refresh')
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [appliedRange, runPage])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => {
      refresh()
    }, pollMs)
    return () => window.clearInterval(id)
  }, [pollMs, refresh])

  useEffect(() => {
    const id = window.setInterval(() => forceTick((x) => x + 1), 1_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (runs?.total_pages && runPage > runs.total_pages) {
      setRunPage(runs.total_pages)
    }
  }, [runPage, runs?.total_pages])

  const lastUpdatedAgo = (() => {
    const t = lastUpdatedAtRef.current
    if (!t) return null
    return Math.max(0, Math.floor((Date.now() - t) / 1000))
  })()

  const topStages = topEntries(summary?.by_stage ?? {}, 'cost_usd', 10)
  const topModels = topEntries(summary?.by_model ?? {}, 'cost_usd', 10)
  const rangeLabel = summary?.range_label ?? labelForRange(appliedRange)
  const selectedPreset = appliedRange.preset
  const canApplyCustom = Boolean(customFrom && customTo && new Date(customFrom).getTime() <= new Date(customTo).getTime())
  const currentRunPage = runs?.page ?? runPage
  const totalRunPages = runs?.total_pages ?? 1
  const totalRuns = runs?.total ?? 0
  const firstRunIndex = totalRuns === 0 ? 0 : ((currentRunPage - 1) * (runs?.page_size ?? RUNS_PAGE_SIZE)) + 1
  const lastRunIndex = Math.min(totalRuns, firstRunIndex + (runs?.runs.length ?? 0) - 1)

  const stageChartData = useMemo(() => {
    return topStages.map(([name, v]) => ({
      name,
      cost_usd: v.cost_usd ?? 0,
      total_tokens: v.total_tokens ?? 0,
      input_tokens: v.input_tokens ?? 0,
      output_tokens: v.output_tokens ?? 0,
    }))
  }, [topStages])

  const modelChartData = useMemo(() => {
    return topModels.map(([name, v]) => ({
      name,
      cost_usd: v.cost_usd ?? 0,
      total_tokens: v.total_tokens ?? 0,
      input_tokens: v.input_tokens ?? 0,
      output_tokens: v.output_tokens ?? 0,
      events: v.events ?? 0,
    }))
  }, [topModels])

  const timelineData = useMemo(() => {
    return (summary?.timeline ?? []).map((d) => ({
      ...d,
      date_label: formatDateLabel(d.date),
    }))
  }, [summary?.timeline])

  const modelPieData = useMemo(() => {
    const total = modelChartData.reduce((sum, d) => sum + (Number(d.cost_usd) || 0), 0) || 0
    return modelChartData.map((d) => ({
      name: d.name,
      cost_usd: d.cost_usd,
      share: total > 0 ? d.cost_usd / total : 0,
    }))
  }, [modelChartData])

  const peakDay = useMemo(() => {
    return [...timelineData].sort((a, b) => (b.cost_usd ?? 0) - (a.cost_usd ?? 0))[0] ?? null
  }, [timelineData])

  const totalEvents = timelineData.reduce((sum, d) => sum + (Number(d.events) || 0), 0)
  const avgCostPerEvent = totalEvents > 0 ? (summary?.totals.cost_usd ?? 0) / totalEvents : 0

  const selectRange = (preset: UsageRangePreset) => {
    if (preset === 'custom') {
      if (!canApplyCustom) {
        setError('Choose a valid from and to date for the custom range.')
        return
      }
      setRunPage(1)
      setAppliedRange({ preset: 'custom', from: customFrom, to: customTo })
      return
    }

    setRunPage(1)
    setAppliedRange({ preset })
  }

  const applyCustomRange = () => {
    if (!canApplyCustom) {
      setError('Choose a valid from and to date for the custom range.')
      return
    }
    setRunPage(1)
    setAppliedRange({ preset: 'custom', from: customFrom, to: customTo })
  }

  return (
    <div className="space-y-6">
      <SAPageHeader
        title="LLM Usage"
        icon={CpuIcon}
        subtitle="Token and cost attribution by stage, model, and run (near-real-time)."
        actions={(
          <div className="flex items-center gap-2">
            {lastUpdatedAgo !== null ? (
              <span className="text-xs text-muted-foreground">Updated {lastUpdatedAgo}s ago</span>
            ) : null}
            <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        )}
      />

      {error ? (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unable to load usage data</CardTitle>
            <CardDescription className="text-destructive">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refresh} disabled={isRefreshing}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-primary/15 bg-gradient-to-r from-primary/5 via-background to-secondary/10">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full border border-primary/20 bg-primary/10 p-2 text-primary">
              <CalendarDaysIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Cost analysis range</p>
              <p className="text-xs text-muted-foreground">
                Applies to totals, charts, models, stages, and latest runs.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="grid grid-cols-2 gap-2 sm:flex">
              {RANGE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={selectedPreset === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => selectRange(option.value)}
                  className="justify-start sm:justify-center"
                  title={option.description}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-2 rounded-none border border-border bg-background/70 p-2 sm:flex-row sm:items-end">
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>From</span>
                <Input
                  type="date"
                  value={customFrom}
                  max={customTo || toDateInputValue(new Date())}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="min-w-36"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>To</span>
                <Input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={toDateInputValue(new Date())}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="min-w-36"
                />
              </label>
              <Button type="button" variant="secondary" size="sm" onClick={applyCustomRange} disabled={!canApplyCustom}>
                Apply dates
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Tokens ({rangeLabel})</CardTitle>
            <CardDescription>Input + output</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(summary?.totals.total_tokens ?? 0).toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Input Tokens ({rangeLabel})</CardTitle>
            <CardDescription>Prompt-side</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(summary?.totals.input_tokens ?? 0).toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Output Tokens ({rangeLabel})</CardTitle>
            <CardDescription>Completion-side</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(summary?.totals.output_tokens ?? 0).toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cost ({rangeLabel})</CardTitle>
            <CardDescription>From token_usage events</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            ${(summary?.totals.cost_usd ?? 0).toFixed(2)}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-primary/15">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Spend Pulse ({rangeLabel})</CardTitle>
              <CardDescription>Daily cost trend with token volume overlay</CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-none border border-border bg-muted/30 px-3 py-2">
                <p className="text-muted-foreground">Events</p>
                <p className="text-base font-semibold text-foreground">{totalEvents.toLocaleString()}</p>
              </div>
              <div className="rounded-none border border-border bg-muted/30 px-3 py-2">
                <p className="text-muted-foreground">Avg / event</p>
                <p className="text-base font-semibold text-foreground">{formatUsd(avgCostPerEvent)}</p>
              </div>
              <div className="rounded-none border border-border bg-muted/30 px-3 py-2">
                <p className="text-muted-foreground">Peak day</p>
                <p className="text-base font-semibold text-foreground">{peakDay ? formatUsd(peakDay.cost_usd) : '$0.00'}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {timelineData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.16} />
                  <XAxis dataKey="date_label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="cost"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => formatUsd(value)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="tokens"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => formatCompact(value)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'Cost') return [formatUsd(value), name]
                      return [Number(value ?? 0).toLocaleString(), name]
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                  />
                  <Area
                    yAxisId="cost"
                    type="monotone"
                    dataKey="cost_usd"
                    name="Cost"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#costGradient)"
                  />
                  <Line
                    yAxisId="tokens"
                    type="monotone"
                    dataKey="total_tokens"
                    name="Tokens"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No timeline data yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Stages ({rangeLabel})</CardTitle>
            <CardDescription>Highest cost stages</CardDescription>
          </CardHeader>
          <CardContent>
            {stageChartData.length > 0 ? (
              <div className="mb-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageChartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatUsd(v)} />
                    <Bar dataKey="cost_usd" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}
            {topStages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stage usage data yet.</p>
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
                    {topStages.map(([stage, v]) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Top Models ({rangeLabel})</CardTitle>
            <CardDescription>Input/output mix with cost share</CardDescription>
          </CardHeader>
          <CardContent>
            {modelChartData.length > 0 ? (
              <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelChartData} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => formatCompact(value)}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis dataKey="name" type="category" width={92} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value, name) => [
                          Number(value ?? 0).toLocaleString(),
                          name === 'input_tokens' ? 'Input tokens' : 'Output tokens',
                        ]}
                      />
                      <Bar dataKey="input_tokens" stackId="tokens" fill="hsl(var(--primary))" radius={[6, 0, 0, 6]} />
                      <Bar dataKey="output_tokens" stackId="tokens" fill="hsl(var(--secondary))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(v, _name, props) => {
                          const payload = (props as { payload?: { name?: unknown; share?: unknown } }).payload
                          const label = String(payload?.name ?? '')
                          const share = Number(payload?.share ?? 0)
                          return [`${formatUsd(v)} (${(share * 100).toFixed(1)}%)`, label]
                        }}
                      />
                      <Pie
                        data={modelPieData}
                        dataKey="cost_usd"
                        nameKey="name"
                        outerRadius={90}
                        innerRadius={52}
                        paddingAngle={2}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      >
                        {modelPieData.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
            {topModels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No model usage data yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Model</th>
                      <th className="px-4 py-3 text-left font-medium">Tokens</th>
                      <th className="px-4 py-3 text-left font-medium">Cost</th>
                      <th className="px-4 py-3 text-left font-medium">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topModels.map(([model, v]) => (
                      <tr key={model} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{model}</td>
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

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Latest Runs</CardTitle>
              <CardDescription>
                {totalRuns > 0
                  ? `Showing ${firstRunIndex.toLocaleString()}-${lastRunIndex.toLocaleString()} of ${totalRuns.toLocaleString()} runs`
                  : 'Per-run totals plus stage breakdown snapshot'}
              </CardDescription>
            </div>
            {totalRuns > 0 ? (
              <Badge variant="outline">
                Page {currentRunPage.toLocaleString()} of {totalRunPages.toLocaleString()}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!runs || runs.runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs found.</p>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Run</th>
                      <th className="px-4 py-3 text-left font-medium">Flow</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Tokens</th>
                      <th className="px-4 py-3 text-left font-medium">Cost</th>
                      <th className="px-4 py-3 text-left font-medium">Top stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.runs.map((r) => {
                      const stages = Object.entries(r.stage_breakdown || {})
                        .sort((a, b) => (b[1]?.cost_usd ?? 0) - (a[1]?.cost_usd ?? 0))
                      const topStage = stages[0]?.[0] || '—'
                      const costNumber = typeof r.cost_usd === 'string' ? Number(r.cost_usd) : Number(r.cost_usd || 0)
                      return (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs">
                            <Link href={`/sa/llm-usage/${r.id}`} className="hover:underline">
                              {r.id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-medium">{r.flow_type}</td>
                          <td className="px-4 py-3">
                            <Badge variant={r.status === 'completed' ? 'default' : 'outline'}>{r.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {(Number(r.input_tokens || 0) + Number(r.output_tokens || 0)).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">${costNumber.toFixed(4)}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{topStage}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 rounded-none border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {RUNS_PAGE_SIZE.toLocaleString()} per page
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRunPage(1)}
                    disabled={isRefreshing || currentRunPage <= 1}
                  >
                    First
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRunPage((page) => Math.max(1, page - 1))}
                    disabled={isRefreshing || currentRunPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="px-2 text-xs text-muted-foreground">
                    Page {currentRunPage.toLocaleString()} / {totalRunPages.toLocaleString()}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRunPage((page) => Math.min(totalRunPages, page + 1))}
                    disabled={isRefreshing || currentRunPage >= totalRunPages}
                  >
                    Next
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRunPage(totalRunPages)}
                    disabled={isRefreshing || currentRunPage >= totalRunPages}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

