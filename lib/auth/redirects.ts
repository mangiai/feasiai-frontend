import { getPublicClientOrigin } from '@/lib/http/public-client-origin'

export function sanitizeRedirectPath(path: string | null | undefined, fallback = '/dashboard'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return fallback
  }

  return path
}

export function buildPathWithSearch(pathname: string, search: string | null | undefined): string {
  return `${pathname}${search ?? ''}`
}

export function buildLoginPath(nextPath: string | null | undefined): string {
  const next = sanitizeRedirectPath(nextPath)

  if (next === '/dashboard') {
    return '/login'
  }

  return `/login?redirect=${encodeURIComponent(next)}`
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const next = sanitizeRedirectPath(nextPath)
  return `${getPublicClientOrigin()}/auth/callback?next=${encodeURIComponent(next)}`
}

export function buildOnboardingPath(nextPath: string | null | undefined): string {
  const next = sanitizeRedirectPath(nextPath)

  if (next === '/dashboard') {
    return '/onboarding'
  }

  return `/onboarding?next=${encodeURIComponent(next)}`
}