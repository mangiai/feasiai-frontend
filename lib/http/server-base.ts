const DEFAULT_LOCAL_SERVER_URL = 'http://localhost:8080'

function normalizeServerBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '')
}

export function getServerBaseCandidates(options?: {
  includePublicFallback?: boolean
  includeDevFallback?: boolean
}): string[] {
  const includePublicFallback = options?.includePublicFallback ?? true
  const includeDevFallback = options?.includeDevFallback ?? true

  const candidates = [
    process.env.SERVER_URL,
    process.env.BACKEND_URL,
    includePublicFallback ? process.env.NEXT_PUBLIC_SERVER_URL : undefined,
  ].filter((value): value is string => Boolean(value && value.trim().length > 0))

  if (includeDevFallback && process.env.NODE_ENV !== 'production') {
    candidates.push(DEFAULT_LOCAL_SERVER_URL)
  }

  return Array.from(new Set(candidates.map(normalizeServerBaseUrl)))
}

export function getServerBaseUrl(options?: {
  includePublicFallback?: boolean
  includeDevFallback?: boolean
}): string {
  return getServerBaseCandidates(options)[0] ?? ''
}

export const SERVER_URL_ERROR_HINT = 'set SERVER_URL or NEXT_PUBLIC_SERVER_URL'