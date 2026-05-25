import type { AuthResult } from '@/lib/api-auth'

/**
 * Headers for Next.js → Express proxy calls.
 * Uses the user's Supabase JWT when present; falls back to AIENTITLE_API_KEY
 * with X-User-Id so the backend can authorize trusted server-side proxies.
 */
export function buildBackendAuthHeaders(auth: AuthResult): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Prefer trusted server proxy (API key + user id). Express accepts this in zimas/generate
  // routes. Forwarding the browser JWT alone often 401s in local dev when the session
  // cookie is present but the access token is stale or not attached to the API route.
  const apiKey = process.env.AIENTITLE_API_KEY?.trim()
  if (apiKey && auth.userId) {
    headers.Authorization = `Bearer ${apiKey}`
    headers['X-User-Id'] = auth.userId
    return headers
  }

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`
    return headers
  }

  return headers
}
