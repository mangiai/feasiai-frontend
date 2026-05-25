'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  FEASIBILITY_ORCHESTRATOR_MODELS,
  MODEL_CATALOG,
  resolveOpenRouterSlug,
} from '@/lib/sa/model-catalog'
import {
  DEFAULT_FEASIBILITY_PIPELINE_CONFIG,
  DEFAULT_FEASIBILITY_PIPELINE_DESCRIPTION,
  DEFAULT_FEASIBILITY_PIPELINE_NAME,
} from '@/lib/sa/default-feasibility-pipeline'
import { cn } from '@/lib/utils'
import {
  CheckIcon,
  SaveIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  ChevronDownIcon,
  Settings2Icon,
  LayersIcon,
  SparklesIcon,
  ExternalLinkIcon,
} from 'lucide-react'

interface PipelineRow {
  id: string
  name: string
  description: string | null
  is_active: boolean
  config: PipelineConfig
  updated_at: string
}

type PipelineConfig = {
  provider?: string
  env?: Record<string, boolean | string>
  models?: Record<string, string>
}

const TASK_GROUPS = [
  {
    title: 'Orchestration',
    description: 'Main agent and vision workloads',
    tasks: ['VISION'] as const,
  },
  {
    title: 'RAG stack (Gemini API)',
    description: 'Vector index only — not routed through OpenRouter',
    tasks: ['RAG_EMBEDDING', 'RAG_RETRIEVAL', 'RAG_RERANKER', 'QUERY_EXPANSION'] as const,
  },
  {
    title: 'Validation & drafts',
    description: 'Pre-checks and draft generation',
    tasks: ['INPUT_VALIDATION', 'FEASIBILITY_PRECHECK', 'DRAFT_GENERATION'] as const,
  },
] as const

const FEATURE_FLAGS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'RAG_ENABLED', label: 'RAG enabled', hint: 'Master toggle for retrieval' },
  { key: 'RAG_RERANKER_ENABLED', label: 'Reranker', hint: 'Re-rank retrieved chunks' },
  { key: 'RAG_PRO_RERANKER', label: 'Pro reranker', hint: 'Use Pro-tier rerank model' },
  { key: 'SONNET_PREPROCESSING_ENABLED', label: 'Sonnet preprocess', hint: 'Sonnet validation pass' },
  { key: 'VALIDATION_TIER_B_ENABLED', label: 'Validation tier B', hint: 'OpenAI semantic audit' },
]

const MODEL_IDS = MODEL_CATALOG.map((m) => m.id)

const OPENROUTER_FLAGS: Array<{ key: string; label: string; hint: string; defaultValue?: boolean }> = [
  {
    key: 'OPENROUTER_USE_AUTO_ROUTER',
    label: 'Use OpenRouter auto router',
    hint: 'Routes to openrouter/auto (may hit Baidu etc.). Off = pinned Anthropic slug from orchestrator model.',
    defaultValue: false,
  },
  {
    key: 'OPENROUTER_ENABLE_FREE_FALLBACK',
    label: 'Billing fallback (Sonnet)',
    hint: 'On credit errors, retry with pinned anthropic/claude-sonnet-4 — not openrouter/free.',
    defaultValue: false,
  },
]

const DEFAULT_CONFIG: PipelineConfig = {
  ...DEFAULT_FEASIBILITY_PIPELINE_CONFIG,
  env: { ...DEFAULT_FEASIBILITY_PIPELINE_CONFIG.env },
  models: { ...DEFAULT_FEASIBILITY_PIPELINE_CONFIG.models },
}

function formatTaskLabel(task: string) {
  return task.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatUpdated(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">{title}</p>
      {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
    </div>
  )
}

function pickInitialPipeline(rows: PipelineRow[]): PipelineRow | null {
  return (
    rows.find((p) => p.is_active) ??
    rows.find((p) => p.name === DEFAULT_FEASIBILITY_PIPELINE_NAME) ??
    rows[0] ??
    null
  )
}

export function ModelPipelineManager({ initialPipelines }: { initialPipelines: PipelineRow[] }) {
  const initial = pickInitialPipeline(initialPipelines)
  const [pipelines, setPipelines] = useState<PipelineRow[]>(initialPipelines)
  const [selectedId, setSelectedId] = useState<string>(initial?.id ?? 'new')
  const [name, setName] = useState(initial?.name ?? DEFAULT_FEASIBILITY_PIPELINE_NAME)
  const [description, setDescription] = useState(initial?.description ?? DEFAULT_FEASIBILITY_PIPELINE_DESCRIPTION)
  const [config, setConfig] = useState<PipelineConfig>(initial?.config ?? DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState(false)
  const [applying, setApplying] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'neutral'>('neutral')
  const [pipelineQuery, setPipelineQuery] = useState('')
  const [envOpen, setEnvOpen] = useState(false)

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => p.id === selectedId) ?? null,
    [pipelines, selectedId],
  )

  const filteredPipelines = useMemo(() => {
    const q = pipelineQuery.trim().toLowerCase()
    if (!q) return pipelines
    return pipelines.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
    )
  }, [pipelineQuery, pipelines])

  const activePipeline = useMemo(() => pipelines.find((p) => p.is_active) ?? null, [pipelines])
  const activeIsGroqLegacy = activePipeline?.name === 'default-groq' || activePipeline?.config?.provider === 'groq'

  function loadDefaultFeasibilityTemplate() {
    setSelectedId('new')
    setName(DEFAULT_FEASIBILITY_PIPELINE_NAME)
    setDescription(DEFAULT_FEASIBILITY_PIPELINE_DESCRIPTION)
    setConfig({
      ...DEFAULT_FEASIBILITY_PIPELINE_CONFIG,
      env: { ...DEFAULT_FEASIBILITY_PIPELINE_CONFIG.env },
      models: { ...DEFAULT_FEASIBILITY_PIPELINE_CONFIG.models },
    })
    setMessage('')
    setMessageTone('neutral')
  }

  function loadPipeline(id: string) {
    if (id === 'new') {
      loadDefaultFeasibilityTemplate()
      setMessage('')
      setMessageTone('neutral')
      return
    }

    const row = pipelines.find((p) => p.id === id)
    if (!row) return

    setSelectedId(row.id)
    setName(row.name)
    setDescription(row.description ?? '')
    setConfig(row.config ?? DEFAULT_CONFIG)
    setMessage('')
    setMessageTone('neutral')
  }

  function setStatus(text: string, tone: 'success' | 'error' | 'neutral' = 'neutral') {
    setMessage(text)
    setMessageTone(tone)
  }

  function updateEnv(key: string, value: boolean | string) {
    setConfig((prev) => ({
      ...prev,
      env: { ...(prev.env ?? {}), [key]: value },
    }))
  }

  function updateModel(task: string, model: string) {
    setConfig((prev) => ({
      ...prev,
      models: { ...(prev.models ?? {}), [task]: model },
    }))
  }

  async function refreshPipelines() {
    const res = await fetch('/api/sa/model-pipelines', { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) {
      setStatus(data?.error || 'Failed to refresh pipelines.', 'error')
      return
    }

    const rows = data?.pipelines ?? []
    setPipelines(rows)

    const keep = rows.find((r: PipelineRow) => r.id === selectedId)
    if (!keep) loadPipeline(rows[0]?.id ?? 'new')
    else setStatus('Pipeline list refreshed.', 'success')
  }

  async function savePipeline() {
    setSaving(true)
    setMessage('')

    const payload: Record<string, unknown> = {
      name,
      description,
      config,
      is_active: Boolean(selectedPipeline?.is_active),
    }
    if (selectedId !== 'new') payload.id = selectedId

    const res = await fetch('/api/sa/model-pipelines', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setStatus(data?.error || 'Failed to save pipeline.', 'error')
      return
    }

    setStatus('Pipeline saved successfully.', 'success')
    await refreshPipelines()
    if (data?.pipeline?.id) loadPipeline(data.pipeline.id)
  }

  async function activatePipeline() {
    if (selectedId === 'new') return
    setActivating(true)
    setMessage('')

    const res = await fetch('/api/sa/model-pipelines', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate', id: selectedId }),
    })
    const data = await res.json()
    setActivating(false)

    if (!res.ok) {
      setStatus(data?.error || 'Failed to activate pipeline.', 'error')
      return
    }

    setStatus('Pipeline activated — this profile is now the default.', 'success')
    await refreshPipelines()
    loadPipeline(selectedId)
  }

  async function applyToRuntime() {
    setApplying(true)
    setMessage('')

    const res = await fetch('/api/sa/model-pipelines/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    const data = await res.json()
    setApplying(false)

    if (!res.ok) {
      setStatus(data?.error || 'Failed to apply config to runtime.', 'error')
      return
    }

    setStatus('Config applied to runtime — inference routing updated immediately.', 'success')
  }

  async function bootstrapDefaultFeasibility() {
    setBootstrapping(true)
    setMessage('')
    const res = await fetch('/api/sa/model-pipelines/bootstrap', { method: 'POST' })
    const data = await res.json()
    setBootstrapping(false)

    if (!res.ok) {
      setStatus(data?.error || 'Failed to install default feasibility pipeline.', 'error')
      return
    }

    setStatus('default-feasibility installed, activated, and applied to runtime.', 'success')
    await refreshPipelines()
    if (data?.pipeline?.id) loadPipeline(data.pipeline.id)
    else {
      const row = pipelines.find((p) => p.name === DEFAULT_FEASIBILITY_PIPELINE_NAME)
      if (row) loadPipeline(row.id)
    }
  }

  const orchestratorModel = config.models?.ORCHESTRATOR ?? 'claude-sonnet-4-5'
  const resolvedOpenRouterSlug = resolveOpenRouterSlug(orchestratorModel)
  const openRouterAutoOverride = String(config.env?.OPENROUTER_MODEL_AUTO ?? '').trim()

  const envPreview = [
    '# RAG & validation',
    `RAG_ENABLED=${String(Boolean(config.env?.RAG_ENABLED))}`,
    `RAG_PROVIDER=${config.env?.RAG_PROVIDER ?? ''}`,
    `RAG_RERANKER_ENABLED=${String(Boolean(config.env?.RAG_RERANKER_ENABLED))}`,
    `RAG_PRO_RERANKER=${String(Boolean(config.env?.RAG_PRO_RERANKER))}`,
    `SONNET_PREPROCESSING_ENABLED=${String(Boolean(config.env?.SONNET_PREPROCESSING_ENABLED))}`,
    `VALIDATION_TIER_B_ENABLED=${String(Boolean(config.env?.VALIDATION_TIER_B_ENABLED))}`,
    '',
    '# Feasibility agent (Claude Code via OpenRouter)',
    `AGENT_ORCHESTRATOR_MODEL=${orchestratorModel}`,
    `OPENROUTER_USE_AUTO_ROUTER=${String(Boolean(config.env?.OPENROUTER_USE_AUTO_ROUTER))}`,
    `OPENROUTER_ENABLE_FREE_FALLBACK=${String(Boolean(config.env?.OPENROUTER_ENABLE_FREE_FALLBACK))}`,
    openRouterAutoOverride
      ? `OPENROUTER_MODEL_AUTO=${openRouterAutoOverride}`
      : `# OPENROUTER_MODEL_AUTO=(derived) → ${resolvedOpenRouterSlug}`,
    String(config.env?.OPENROUTER_MODEL_FREE ?? '').trim()
      ? `OPENROUTER_MODEL_FREE=${config.env?.OPENROUTER_MODEL_FREE}`
      : '# OPENROUTER_MODEL_FREE=(default Sonnet when fallback enabled)',
    '',
    '# Other task models',
    ...Object.entries(config.models ?? {})
      .filter(([k]) => k !== 'ORCHESTRATOR')
      .map(([k, v]) => `AGENT_${k}_MODEL=${v}`),
  ].join('\n')

  const isNew = selectedId === 'new'
  const isActive = Boolean(selectedPipeline?.is_active)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Pipeline list */}
        <aside className="space-y-3 xl:col-span-3">
          <div className="overflow-hidden rounded-lg border border-border/80 bg-muted/10">
            <div className="border-b border-border/70 bg-muted/25 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Pipelines</p>
                <Button type="button" size="sm" variant="outline" onClick={() => loadDefaultFeasibilityTemplate()}>
                  <PlusIcon className="mr-1 h-3.5 w-3.5" />
                  Feasibility
                </Button>
              </div>
              <div className="relative mt-2">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search pipelines..."
                  value={pipelineQuery}
                  onChange={(e) => setPipelineQuery(e.target.value)}
                  className="h-8 border-border/80 bg-background pl-8 text-xs"
                />
              </div>
            </div>

            <ul className="max-h-[min(420px,50vh)] divide-y divide-border overflow-y-auto">
              {filteredPipelines.map((p) => {
                const selected = selectedId === p.id
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => loadPipeline(p.id)}
                      className={cn(
                        'flex w-full flex-col gap-1 px-3 py-3 text-left transition-colors',
                        selected
                          ? 'border-l-[3px] border-l-secondary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent'
                          : 'border-l-[3px] border-l-transparent hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{p.name}</span>
                        {p.is_active ? (
                          <Badge className="shrink-0 border-secondary/30 bg-secondary/15 text-[10px] text-secondary">
                            Active
                          </Badge>
                        ) : null}
                      </div>
                      {p.description ? (
                        <span className="line-clamp-1 text-[11px] text-muted-foreground">{p.description}</span>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">Updated {formatUpdated(p.updated_at)}</span>
                    </button>
                  </li>
                )
              })}
              {filteredPipelines.length === 0 ? (
                <li className="px-3 py-8 text-center text-xs text-muted-foreground">No pipelines match search.</li>
              ) : null}
            </ul>

            <div className="border-t border-border/70 p-2">
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={refreshPipelines}>
                <RefreshCwIcon className="mr-1.5 h-3.5 w-3.5" />
                Refresh list
              </Button>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/sa/system">
              View in System settings
              <ExternalLinkIcon className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </aside>

        {/* Editor */}
        <div className="space-y-5 xl:col-span-9">
          <div className="flex flex-wrap items-center gap-2">
            {isNew ? <Badge variant="outline">Unsaved draft</Badge> : null}
            {isActive ? (
              <Badge className="border-secondary/30 bg-secondary/15 text-secondary">Active profile</Badge>
            ) : !isNew ? (
              <Badge variant="secondary">Inactive</Badge>
            ) : null}
            {config.provider ? (
              <Badge variant="outline" className="capitalize">
                Provider: {config.provider}
              </Badge>
            ) : null}
          </div>

          {activeIsGroqLegacy ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Active pipeline is Groq-first. Feasibility should use OpenRouter (Sonnet).
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Install <code className="text-[10px]">default-feasibility</code>, activate it, and push settings to the live server.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={bootstrapping}
                onClick={() => void bootstrapDefaultFeasibility()}
              >
                {bootstrapping ? 'Installing…' : 'Install default feasibility'}
              </Button>
            </div>
          ) : null}

          {/* Profile */}
          <section className="rounded-lg border border-border/80 bg-muted/10 p-4">
            <SectionHeader
              title="Profile"
              description="OpenRouter is the LLM gateway for feasibility. RAG embeddings use Gemini (separate API key)."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pipeline-name">Pipeline name</Label>
                <Input
                  id="pipeline-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-primary/15 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label>LLM gateway</Label>
                <Select
                  value={config.provider ?? 'openrouter'}
                  onValueChange={(v) => {
                    setConfig((prev) => ({ ...prev, provider: v }))
                    updateEnv('RAG_PROVIDER', v === 'openrouter' ? 'gemini' : v)
                  }}
                >
                  <SelectTrigger className="border-primary/15 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter (feasibility + Claude tasks)</SelectItem>
                    <SelectItem value="gemini">Gemini only (RAG-only legacy)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Server needs <code className="text-[10px]">OPENROUTER_API_KEY</code>. RAG uses{' '}
                  <code className="text-[10px]">GOOGLE_GEMINI_API_KEY</code>.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pipeline-desc">Description</Label>
                <Textarea
                  id="pipeline-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-primary/15 bg-background resize-none"
                  placeholder="What this pipeline is optimized for..."
                />
              </div>
            </div>
          </section>

          {/* Feasibility / OpenRouter */}
          <section className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <SectionHeader
              title="Feasibility agent (OpenRouter)"
              description="Controls the main feasibility Claude Code run. Use Sonnet + pinned Anthropic slug — avoid openrouter/auto in production."
            />
            <div className="mb-4 rounded-lg border border-border/70 bg-background/80 p-3">
              <Label className="text-xs text-muted-foreground">Orchestrator model</Label>
              <Select
                value={orchestratorModel}
                onValueChange={(v) => updateModel('ORCHESTRATOR', v)}
              >
                <SelectTrigger className="mt-1.5 border-primary/15 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEASIBILITY_ORCHESTRATOR_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label} ({m.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                OpenRouter slug:{' '}
                <span className="text-foreground">
                  {openRouterAutoOverride || resolvedOpenRouterSlug}
                </span>
                {openRouterAutoOverride ? ' (manual override)' : ' (auto from orchestrator)'}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {OPENROUTER_FLAGS.map(({ key, label, hint }) => {
                const checked = Boolean(config.env?.[key])
                return (
                  <label
                    key={key}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                      checked
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-border/80 bg-background hover:border-primary/20',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={(e) => updateEnv(key, e.target.checked)}
                    />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-[11px] text-muted-foreground">{hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="openrouter-model-auto">OPENROUTER_MODEL_AUTO (optional)</Label>
                <Input
                  id="openrouter-model-auto"
                  value={String(config.env?.OPENROUTER_MODEL_AUTO ?? '')}
                  onChange={(e) => updateEnv('OPENROUTER_MODEL_AUTO', e.target.value)}
                  placeholder={resolvedOpenRouterSlug}
                  className="font-mono text-xs border-primary/15 bg-background"
                />
                <p className="text-[10px] text-muted-foreground">Leave empty to derive from orchestrator model.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="openrouter-model-free">OPENROUTER_MODEL_FREE (optional)</Label>
                <Input
                  id="openrouter-model-free"
                  value={String(config.env?.OPENROUTER_MODEL_FREE ?? '')}
                  onChange={(e) => updateEnv('OPENROUTER_MODEL_FREE', e.target.value)}
                  placeholder="anthropic/claude-sonnet-4"
                  className="font-mono text-xs border-primary/15 bg-background"
                />
                <p className="text-[10px] text-muted-foreground">Only used when billing fallback is enabled.</p>
              </div>
            </div>
          </section>

          {/* Feature flags */}
          <section className="rounded-lg border border-border/80 bg-muted/10 p-4">
            <SectionHeader
              title="Feature flags"
              description="Runtime toggles applied when this pipeline is active or pushed to the server."
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_FLAGS.map(({ key, label, hint }) => {
                const checked = Boolean(config.env?.[key])
                return (
                  <label
                    key={key}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                      checked
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border/80 bg-background hover:border-primary/20',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={checked}
                      onChange={(e) => updateEnv(key, e.target.checked)}
                    />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-[11px] text-muted-foreground">{hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </section>

          {/* Task models */}
          <section className="rounded-lg border border-border/80 bg-muted/10 p-4">
            <SectionHeader
              title="Task model assignments"
              description="Map each agent task to a model ID from the catalog."
            />
            <div className="space-y-5">
              {TASK_GROUPS.map((group) => (
                <div key={group.title}>
                  <div className="mb-2 flex items-center gap-2">
                    <LayersIcon className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold text-foreground">{group.title}</p>
                    <span className="text-[11px] text-muted-foreground">— {group.description}</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.tasks.map((task) => (
                      <div
                        key={task}
                        className="rounded-lg border border-border/70 bg-background/80 px-3 py-2.5"
                      >
                        <Label className="text-[11px] text-muted-foreground">{formatTaskLabel(task)}</Label>
                        <Input
                          list="pipeline-model-catalog"
                          value={config.models?.[task] ?? ''}
                          onChange={(e) => updateModel(task, e.target.value)}
                          className="mt-1.5 h-9 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0"
                          placeholder="model-id"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <datalist id="pipeline-model-catalog">
              {MODEL_IDS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </section>

          {/* Env preview collapsible */}
          <Collapsible open={envOpen} onOpenChange={setEnvOpen}>
            <section className="overflow-hidden rounded-lg border border-border/80">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <Settings2Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Environment preview</span>
                    <span className="text-xs text-muted-foreground">Raw env vars for deployment</span>
                  </div>
                  <ChevronDownIcon
                    className={cn('h-4 w-4 text-muted-foreground transition-transform', envOpen && 'rotate-180')}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="max-h-64 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-foreground/90">
                  {envPreview}
                </pre>
              </CollapsibleContent>
            </section>
          </Collapsible>

          {/* Actions */}
          <div className="sticky bottom-0 z-10 -mx-1 rounded-lg border border-border/80 bg-card/95 px-4 py-3 shadow-[0_-8px_24px_-12px_hsl(var(--background)/0.8)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={savePipeline} disabled={saving || !name.trim()}>
                  <SaveIcon className="mr-1.5 h-4 w-4" />
                  {saving ? 'Saving…' : 'Save pipeline'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={activatePipeline}
                  disabled={activating || isNew}
                >
                  <CheckIcon className="mr-1.5 h-4 w-4" />
                  {activating ? 'Activating…' : 'Activate'}
                </Button>
                <Button
                  type="button"
                  className="bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-sm"
                  onClick={applyToRuntime}
                  disabled={applying}
                  title="Push config to the live server without restart (required for feasibility model changes)"
                >
                  <SparklesIcon className="mr-1.5 h-4 w-4" />
                  {applying ? 'Applying…' : 'Apply to runtime'}
                </Button>
              </div>
              {message ? (
                <p
                  className={cn(
                    'text-xs sm:text-right',
                    messageTone === 'success' && 'text-emerald-600 dark:text-emerald-400',
                    messageTone === 'error' && 'text-destructive',
                    messageTone === 'neutral' && 'text-muted-foreground',
                  )}
                >
                  {message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
