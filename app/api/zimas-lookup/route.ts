import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { buildBackendAuthHeaders } from '@/lib/backend-auth-headers'
import { sanitizeZimasSearchAddress } from '@/lib/zimas-search-address'
import {
  getServerBaseCandidates,
  SERVER_URL_ERROR_HINT,
} from '@/lib/http/server-base'

/**
 * POST /api/zimas-lookup
 *
 * Proxies ZIMAS planning/zoning lookup requests to the backend server.
 * Returns structured fields (zone, TOC tier, TOIA tier, etc.) that the
 * frontend uses to auto-fill the feasibility form.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authenticated || !auth.userId) {
      console.warn('[zimas-lookup] rejected: no session user', {
        authenticated: auth.authenticated,
        hasUserId: Boolean(auth.userId),
      })
      return NextResponse.json(
        { error: 'Sign in required to run ZIMAS lookup', code: 'UNAUTHORIZED' },
        { status: 401 },
      )
    }

    const backendHeaders = buildBackendAuthHeaders(auth)
    if (!backendHeaders.Authorization) {
      console.warn('[zimas-lookup] rejected: no backend Authorization header', {
        userId: auth.userId,
        hasApiKey: Boolean(process.env.AIENTITLE_API_KEY?.trim()),
        hasAccessToken: Boolean(auth.accessToken),
      })
      return NextResponse.json(
        {
          error: 'Session expired — refresh the page or sign in again',
          code: 'SESSION_EXPIRED',
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { address, apn, selected_index, force_refresh } = body
    const apnDigits = typeof apn === 'string' ? apn.replace(/\D/g, '') : ''
    const addressTrimmed = typeof address === 'string' ? sanitizeZimasSearchAddress(address) : ''

    if (!apnDigits && (!addressTrimmed || addressTrimmed.length < 3)) {
      return NextResponse.json(
        { error: 'Provide a street address (min 3 characters) or an APN (min 8 digits)' },
        { status: 400 },
      )
    }

    if (apnDigits && apnDigits.length < 8) {
      return NextResponse.json(
        { error: 'APN must be at least 8 digits' },
        { status: 400 },
      )
    }

    if (selected_index !== undefined && (!Number.isInteger(selected_index) || selected_index < 0)) {
      return NextResponse.json(
        { error: 'selected_index must be a non-negative integer' },
        { status: 400 },
      )
    }

    const forceRefresh = force_refresh === true

    const backendCandidates = getServerBaseCandidates()
    if (backendCandidates.length === 0) {
      return NextResponse.json(
        { error: `Server not configured (${SERVER_URL_ERROR_HINT})` },
        { status: 500 },
      )
    }

    let lastNetworkError: Error | null = null

    for (const baseUrl of backendCandidates) {
      const controller = new AbortController()
      // ZIMAS scraper can take up to 2 minutes for cold starts
      const timeoutId = setTimeout(() => controller.abort(), 150_000)

      try {
        const response = await fetch(`${baseUrl}/zimas-lookup`, {
          method: 'POST',
          headers: backendHeaders,
          body: JSON.stringify({
            address: addressTrimmed || undefined,
            apn: apnDigits || undefined,
            ui_mode: selected_index === undefined && !apnDigits,
            selected_index,
            force_refresh: forceRefresh,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          // For server errors (5xx), try next backend candidate
          if (response.status >= 500) {
            lastNetworkError = new Error(errorData.error || `Server error: ${response.status}`)
            continue
          }
          console.warn('[zimas-lookup] backend error', {
            status: response.status,
            code: errorData.code,
            error: errorData.error,
          })
          return NextResponse.json(
            { error: errorData.error || `Server error: ${response.status}`, code: errorData.code },
            { status: response.status },
          )
        }

        const data = await response.json()
        return NextResponse.json(data)
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          return NextResponse.json(
            { error: 'ZIMAS lookup timed out — try again or enter data manually' },
            { status: 504 },
          )
        }

        lastNetworkError = error instanceof Error ? error : new Error(String(error))
      }
    }

    return NextResponse.json(
      {
        error: `Cannot reach backend service (${backendCandidates.join(', ')}) — start server on http://localhost:8080 or ${SERVER_URL_ERROR_HINT}`,
        details: lastNetworkError?.message,
      },
      { status: 503 },
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'ZIMAS lookup timed out — try again or enter data manually' },
        { status: 504 },
      )
    }
    console.error('Error in zimas-lookup route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
