import { normalizeLocalOrigin } from '@/lib/http/normalize-local-origin'

export function getPublicOrigin(request: Request): string {
  // Prefer explicit config when available (most reliable in prod)
  const configured =
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL

  if (configured) return normalizeLocalOrigin(configured)

  // Fall back to forwarded headers (common behind load balancers / reverse proxies)
  const forwardedProto = request.headers.get('x-forwarded-proto') || undefined
  const forwardedHost = request.headers.get('x-forwarded-host') || undefined

  if (forwardedHost) {
    const proto = (forwardedProto || 'https').split(',')[0].trim()
    const host = forwardedHost.split(',')[0].trim()
    return normalizeLocalOrigin(`${proto}://${host}`)
  }

  // Finally, use the request URL origin (works in local/dev)
  return normalizeLocalOrigin(new URL(request.url).origin)
}

