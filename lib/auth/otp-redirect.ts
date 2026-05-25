export type OtpType = 'invite' | 'magiclink' | 'recovery' | 'email' | 'email_change'

type UserMetadata = Record<string, unknown> | undefined

type ResolveOtpRedirectParams = {
  type: OtpType
  redirectToParam: string | null | undefined
  currentOrigin: string | undefined
  userMetadata: UserMetadata
}

function sanitizeRedirectPath(path: string | null | undefined, fallback = '/dashboard'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return fallback
  }

  return path
}

function normalizeRedirectTarget(
  next: string | null | undefined,
  currentOrigin: string | undefined,
  fallback = '/dashboard',
): string {
  if (!next) return fallback

  try {
    const u = new URL(next)
    if (currentOrigin && u.origin === currentOrigin) {
      return sanitizeRedirectPath(u.pathname + u.search + u.hash, fallback)
    }
    return fallback
  } catch {
    return sanitizeRedirectPath(next, fallback)
  }
}

function getWorkspaceInvitePathFromMetadata(userMetadata: UserMetadata): string | null {
  if (!userMetadata) return null
  if (userMetadata.invite_kind !== 'workspace') return null

  const token = userMetadata.workspace_invite_token
  if (typeof token !== 'string' || !token) return null
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    return null
  }

  return `/invite/${token}`
}

function shouldPreferWorkspaceInviteFallback(type: OtpType, resolvedRedirect: string): boolean {
  if (type !== 'invite' && type !== 'magiclink') return false

  // Supabase may replace disallowed redirect_to with root/Site URL.
  // In that case, recover invite destination from trusted metadata.
  return resolvedRedirect === '/dashboard' || resolvedRedirect === '/'
}

export function resolveOtpRedirect(params: ResolveOtpRedirectParams): string {
  const nextFromParam = normalizeRedirectTarget(params.redirectToParam, params.currentOrigin)
  if (!shouldPreferWorkspaceInviteFallback(params.type, nextFromParam)) {
    return nextFromParam
  }

  return getWorkspaceInvitePathFromMetadata(params.userMetadata) ?? nextFromParam
}

