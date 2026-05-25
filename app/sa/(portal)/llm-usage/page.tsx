import { LLMUsageClient } from './llm-usage-client'

export default async function LLMUsagePage() {
  // NOTE: This is a server component; avoid relative `fetch('/api/...')` here,
  // which can throw in some runtimes. The client component already polls.
  return <LLMUsageClient window="7d" pollMs={10_000} />
}

