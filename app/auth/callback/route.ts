import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPublicOrigin } from '@/lib/http/public-origin'
import { buildOnboardingPath, sanitizeRedirectPath } from '@/lib/auth/redirects'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getPublicOrigin(request)
  const code = searchParams.get('code')
  const next = sanitizeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Let workspace invite / email-confirm users land on the invite page first;
      // they can complete onboarding afterward from the dashboard.
      if (next.startsWith('/invite/')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_status')
          .eq('id', user.id)
          .single()

        if (profile && (profile as Record<string, unknown>).onboarding_status !== 'completed') {
          return NextResponse.redirect(`${origin}${buildOnboardingPath(next)}`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // OAuth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&redirect=${encodeURIComponent(next)}`)
}
