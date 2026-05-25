import { describe, expect, it } from 'vitest'

import { resolveOtpRedirect } from '../auth/otp-redirect'

const ORIGIN = 'https://feasiai.com'
const INVITE_TOKEN = 'c8912902-23f5-484a-9c5c-74982033813b'

describe('resolveOtpRedirect', () => {
  it('keeps recovery redirect to settings callback', () => {
    const next = resolveOtpRedirect({
      type: 'recovery',
      redirectToParam: 'https://feasiai.com/auth/callback?next=%2Fsettings',
      currentOrigin: ORIGIN,
      userMetadata: {
        invite_kind: 'workspace',
        workspace_invite_token: INVITE_TOKEN,
      },
    })

    expect(next).toBe('/auth/callback?next=%2Fsettings')
  })

  it('keeps email-change redirect instead of invite fallback', () => {
    const next = resolveOtpRedirect({
      type: 'email_change',
      redirectToParam: 'https://feasiai.com/settings/profile',
      currentOrigin: ORIGIN,
      userMetadata: {
        invite_kind: 'workspace',
        workspace_invite_token: INVITE_TOKEN,
      },
    })

    expect(next).toBe('/settings/profile')
  })

  it('recovers invite path when invite redirect collapses to root', () => {
    const next = resolveOtpRedirect({
      type: 'invite',
      redirectToParam: 'https://feasiai.com/',
      currentOrigin: ORIGIN,
      userMetadata: {
        invite_kind: 'workspace',
        workspace_invite_token: INVITE_TOKEN,
      },
    })

    expect(next).toBe(`/invite/${INVITE_TOKEN}`)
  })

  it('recovers invite path when redirect is unsafe and sanitized to dashboard', () => {
    const next = resolveOtpRedirect({
      type: 'invite',
      redirectToParam: 'https://evil.example.com',
      currentOrigin: ORIGIN,
      userMetadata: {
        invite_kind: 'workspace',
        workspace_invite_token: INVITE_TOKEN,
      },
    })

    expect(next).toBe(`/invite/${INVITE_TOKEN}`)
  })

  it('falls back to root when no invite metadata exists', () => {
    const next = resolveOtpRedirect({
      type: 'invite',
      redirectToParam: 'https://feasiai.com/',
      currentOrigin: ORIGIN,
      userMetadata: undefined,
    })

    expect(next).toBe('/')
  })

  it('ignores invalid invite token format', () => {
    const next = resolveOtpRedirect({
      type: 'magiclink',
      redirectToParam: 'https://feasiai.com/',
      currentOrigin: ORIGIN,
      userMetadata: {
        invite_kind: 'workspace',
        workspace_invite_token: 'not-a-uuid',
      },
    })

    expect(next).toBe('/')
  })
})

