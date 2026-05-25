export type ModelProviderId = 'anthropic' | 'google' | 'groq' | 'openai' | 'openrouter'

export type ModelCatalogEntry = {
  id: string
  provider: ModelProviderId
  label: string
  tier: 'frontier' | 'balanced' | 'fast' | 'embedding' | 'router'
}

/** Canonical model IDs used across agent-config and SA pipeline UI */
export const MODEL_CATALOG: ModelCatalogEntry[] = [
  { id: 'claude-opus-4-6', provider: 'anthropic', label: 'Claude Opus 4.6', tier: 'frontier' },
  { id: 'claude-sonnet-4-5', provider: 'anthropic', label: 'Claude Sonnet 4.5', tier: 'balanced' },
  { id: 'claude-haiku-4-5', provider: 'anthropic', label: 'Claude Haiku 4.5', tier: 'fast' },
  { id: 'claude-opus-4-5', provider: 'anthropic', label: 'Claude Opus 4.5', tier: 'frontier' },
  { id: 'gemini-2.5-flash', provider: 'google', label: 'Gemini 2.5 Flash', tier: 'fast' },
  { id: 'gemini-2.5-pro', provider: 'google', label: 'Gemini 2.5 Pro', tier: 'balanced' },
  { id: 'gemini-embedding-001', provider: 'google', label: 'Gemini Embedding 001', tier: 'embedding' },
  { id: 'llama-3.1-8b-instant', provider: 'groq', label: 'Llama 3.1 8B Instant', tier: 'fast' },
  { id: 'llama-3.3-70b-versatile', provider: 'groq', label: 'Llama 3.3 70B Versatile', tier: 'balanced' },
  { id: 'nomic-embed-text-v1_5', provider: 'groq', label: 'Nomic Embed Text v1.5', tier: 'embedding' },
  { id: 'openrouter/auto', provider: 'openrouter', label: 'OpenRouter Auto', tier: 'router' },
  { id: 'openrouter/free', provider: 'openrouter', label: 'OpenRouter Free', tier: 'router' },
  { id: 'o4-mini', provider: 'openai', label: 'OpenAI o4-mini', tier: 'fast' },
]

export const PROVIDER_LABELS: Record<ModelProviderId, string> = {
  anthropic: 'Anthropic',
  google: 'Google',
  groq: 'Groq',
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
}

/** Mirrors server anthropic-routing INTERNAL_TO_OPENROUTER — for SA pipeline preview only */
export const OPENROUTER_ANTHROPIC_SLUGS: Record<string, string> = {
  'claude-opus-4-6': 'anthropic/claude-opus-4.6',
  'claude-opus-4-5': 'anthropic/claude-opus-4',
  'claude-sonnet-4-5': 'anthropic/claude-sonnet-4',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4.5',
}

export function resolveOpenRouterSlug(modelId: string): string {
  const trimmed = modelId.trim()
  if (!trimmed) return OPENROUTER_ANTHROPIC_SLUGS['claude-sonnet-4-5']!
  if (trimmed.includes('/')) return trimmed
  return OPENROUTER_ANTHROPIC_SLUGS[trimmed] ?? OPENROUTER_ANTHROPIC_SLUGS['claude-sonnet-4-5']!
}

/** Anthropic models recommended for feasibility orchestrator (agent + tools) */
export const FEASIBILITY_ORCHESTRATOR_MODELS = MODEL_CATALOG.filter(
  (m) => m.provider === 'anthropic' && m.tier !== 'embedding',
)

export function buildRegistryRows(activeModels: Record<string, string> | undefined) {
  const taskByModel = new Map<string, string[]>()
  if (activeModels) {
    for (const [task, modelId] of Object.entries(activeModels)) {
      const list = taskByModel.get(modelId) ?? []
      list.push(task.replace(/_/g, ' '))
      taskByModel.set(modelId, list)
    }
  }

  const catalogIds = new Set(MODEL_CATALOG.map((m) => m.id))
  const extraIds = [...taskByModel.keys()].filter((id) => !catalogIds.has(id))

  const rowsFromCatalog = MODEL_CATALOG.map((entry) => ({
    modelId: entry.id,
    label: entry.label,
    provider: PROVIDER_LABELS[entry.provider],
    providerId: entry.provider,
    tier: entry.tier,
    tasks: taskByModel.get(entry.id) ?? [],
    status: (taskByModel.has(entry.id) ? 'active' : 'available') as 'active' | 'available',
  }))

  const extraRows = extraIds.map((id) => ({
    modelId: id,
    label: id,
    provider: 'Custom',
    providerId: 'anthropic' as ModelProviderId,
    tier: 'balanced' as const,
    tasks: taskByModel.get(id) ?? [],
    status: 'active' as const,
  }))

  return [...rowsFromCatalog, ...extraRows].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    return a.modelId.localeCompare(b.modelId)
  })
}
