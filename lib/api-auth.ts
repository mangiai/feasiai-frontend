import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

export interface AuthResult {
  authenticated: boolean
  userId: string | null
  isApiKey: boolean
  accessToken?: string
}

/**
 * Dual-auth: checks Bearer token (API key) first, then Supabase cookie session.
 * If a Bearer header is present but the key is wrong, fails immediately (no fallthrough).
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const apiKey = process.env.AIENTITLE_API_KEY
    if (apiKey && token === apiKey) {
      console.warn('[api-auth] API key authentication used — no user attribution available')
      return { authenticated: true, userId: null, isApiKey: true }
    }
    return { authenticated: false, userId: null, isApiKey: false }
  }

  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.warn('[api-auth] getUser failed:', userError.message)
    }
    if (user) {
      return {
        authenticated: true,
        userId: user.id,
        isApiKey: false,
        accessToken: session?.access_token,
      }
    }
  } catch (err) {
    console.error('[api-auth] Session auth failed:', err instanceof Error ? err.message : err)
  }

  return { authenticated: false, userId: null, isApiKey: false }
}

/**
 * Returns a Supabase client appropriate for the auth method.
 * API key → service-role client (bypasses RLS). Browser → cookie-based client.
 */
export async function getSupabaseForAuth(auth: AuthResult): Promise<SupabaseClient> {
  if (auth.isApiKey) {
    return createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return await createClient() as unknown as SupabaseClient
}
