import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { buildLoginPath, buildOnboardingPath, buildPathWithSearch, sanitizeRedirectPath } from '@/lib/auth/redirects'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname
  const requestPath = sanitizeRedirectPath(buildPathWithSearch(pathname, request.nextUrl.search))

  // Super-admin portal — separate auth flow
  const isSAPath = pathname.startsWith('/sa') && !pathname.startsWith('/sa/login')
  const isSALogin = pathname === '/sa/login'

  if (isSAPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/sa/login'
    return NextResponse.redirect(url)
  }

  if (isSAPath && user) {
    const supabaseSA = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          },
        },
      }
    )

    const { data: saProfile } = await supabaseSA
      .from('profiles')
      .select('system_role')
      .eq('id', user.id)
      .single()

    if (saProfile?.system_role !== 'super_admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/sa/login'
      return NextResponse.redirect(url)
    }
  }

  // Legacy /admin route → redirect to /sa (now the super-admin portal)
  if (pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/sa'
    return NextResponse.redirect(url)
  }

  // Protected routes - require authentication
  const protectedPaths = ['/dashboard', '/projects', '/my-projects', '/settings', '/onboarding', '/reports', '/referrals']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  // Auth routes - redirect to dashboard if already logged in
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL(buildLoginPath(requestPath), request.url))
  }

  if (isAuthPath && user) {
    const redirectTarget = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirect'))
    return NextResponse.redirect(new URL(redirectTarget, request.url))
  }

  // Onboarding guard: if user is authenticated and accessing app routes (not onboarding itself),
  // check if they've completed onboarding. If not, redirect to /onboarding.
  const appPaths = ['/dashboard', '/projects', '/my-projects', '/settings']
  const isAppPath = appPaths.some(path => pathname.startsWith(path))

  if (isAppPath && user) {
    // Quick check: read profile onboarding_status via a lightweight Supabase call.
    // We use the same cookie-based client from the middleware response.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          },
        },
      }
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_status')
      .eq('id', user.id)
      .single()

    // If profile exists and onboarding is not completed, redirect
    if (profile && profile.onboarding_status !== 'completed') {
      return NextResponse.redirect(new URL(buildOnboardingPath(requestPath), request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
