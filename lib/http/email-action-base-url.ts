import { normalizeLocalOrigin } from '@/lib/http/normalize-local-origin'
import { getPublicOrigin } from '@/lib/http/public-origin'

/**
 * Base URL for links in transactional emails (invite acceptance, etc.).
 *
 * When you send invites from local dev (`http://localhost:3000`), we must not use
 * `NEXT_PUBLIC_APP_URL` if it points at production — otherwise emails link to prod while
 * you invited from localhost. Local hostnames always use the incoming request origin.
 */
export function getEmailActionBaseUrl(request: Request): string {
  try {
    const url = new URL(request.url)
    const host = url.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return normalizeLocalOrigin(url.origin)
    }
  } catch {
    /* use getPublicOrigin */
  }

  return getPublicOrigin(request)
}
