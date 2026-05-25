/**
 * Canonical default pipeline for production feasibility runs.
 * OpenRouter carries all Claude/agent traffic; Gemini is used only for RAG embeddings.
 */
export const DEFAULT_FEASIBILITY_PIPELINE_NAME = 'default-feasibility'

export const DEFAULT_FEASIBILITY_PIPELINE_CONFIG = {
  provider: 'openrouter',
  env: {
    RAG_ENABLED: true,
    RAG_PROVIDER: 'gemini',
    RAG_RERANKER_ENABLED: true,
    RAG_PRO_RERANKER: false,
    SONNET_PREPROCESSING_ENABLED: true,
    VALIDATION_TIER_B_ENABLED: false,
    OPENROUTER_USE_AUTO_ROUTER: false,
    OPENROUTER_ENABLE_FREE_FALLBACK: false,
    OPENROUTER_MODEL_AUTO: '',
    OPENROUTER_MODEL_FREE: '',
  },
  models: {
    ORCHESTRATOR: 'claude-sonnet-4-5',
    VISION: 'claude-sonnet-4-5',
    RAG_EMBEDDING: 'gemini-embedding-001',
    RAG_RETRIEVAL: 'gemini-2.5-flash',
    RAG_RERANKER: 'gemini-2.5-flash',
    INPUT_VALIDATION: 'claude-sonnet-4-5',
    FEASIBILITY_PRECHECK: 'claude-sonnet-4-5',
    DRAFT_GENERATION: 'claude-sonnet-4-5',
    QUERY_EXPANSION: 'gemini-2.5-flash',
  },
} as const

export const DEFAULT_FEASIBILITY_PIPELINE_DESCRIPTION =
  'Default feasibility pipeline — Claude agent via OpenRouter (pinned Sonnet). RAG uses Gemini embeddings only.'
