import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import {
  getServerBaseCandidates,
  SERVER_URL_ERROR_HINT,
} from '@/lib/http/server-base'

/**
 * POST /api/navigatela-lookup
 *
 * Proxies NavigateLA street dedication lookup to the backend server.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { address, apn, lot_size, lot_width, lot_depth, force_refresh } = body

    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      return NextResponse.json(
        { error: 'Address must be at least 3 characters' },
        { status: 400 },
      )
    }

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
      const timeoutId = setTimeout(() => controller.abort(), 60_000)

      try {
        const response = await fetch(`${baseUrl}/navigatela-lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
          },
          body: JSON.stringify({
            address: address.trim(),
            apn: typeof apn === 'string' ? apn.trim() : undefined,
            lot_size: typeof lot_size === 'number' ? lot_size : undefined,
            lot_width: typeof lot_width === 'number' ? lot_width : undefined,
            lot_depth: typeof lot_depth === 'number' ? lot_depth : undefined,
            force_refresh: force_refresh === true,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          if (response.status >= 500) {
            lastNetworkError = new Error(errorData.error || `Server error: ${response.status}`)
            continue
          }
          return NextResponse.json(
            { error: errorData.error || `Server error: ${response.status}` },
            { status: response.status },
          )
        }

        return NextResponse.json(await response.json())
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          return NextResponse.json(
            { error: 'NavigateLA lookup timed out — try again later' },
            { status: 504 },
          )
        }
        lastNetworkError = error instanceof Error ? error : new Error(String(error))
      }
    }

    return NextResponse.json(
      {
        error: `Cannot reach backend service (${backendCandidates.join(', ')})`,
        details: lastNetworkError?.message,
      },
      { status: 503 },
    )
  } catch (error) {
    console.error('Error in navigatela-lookup route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
