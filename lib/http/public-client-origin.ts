import { normalizeLocalOrigin } from '@/lib/http/normalize-local-origin'

export function getPublicClientOrigin(): string {
  const configured =
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL

  if (configured) return normalizeLocalOrigin(configured)

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeLocalOrigin(window.location.origin)
  }

  return ''
}

