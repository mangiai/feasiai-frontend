import { buildAuthCallbackUrl, sanitizeRedirectPath } from '@/lib/auth/redirects'

type GoogleOAuthClient = {
  auth: {
    signInWithOAuth: (input: {
      provider: 'google'
      options: {
        redirectTo: string
        scopes: string
        queryParams: Record<string, string>
      }
    }) => Promise<{ error: { message: string } | null }>
  }
}

export async function signInWithGoogleOAuth(supabase: GoogleOAuthClient, nextPath: string) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: buildAuthCallbackUrl(sanitizeRedirectPath(nextPath)),
      scopes: 'email profile',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })
}