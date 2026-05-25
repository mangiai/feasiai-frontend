import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { getServerBaseUrl, SERVER_URL_ERROR_HINT } from '@/lib/http/server-base'

const serverUrl = () => getServerBaseUrl()

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = serverUrl()
  if (!base) {
    return NextResponse.json(
      { error: `Server not configured (${SERVER_URL_ERROR_HINT})` },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 180_000)

  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/generate/export-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: (err as { error?: string }).error || `Server error: ${response.status}` },
        { status: response.status },
      )
    }

    const buf = await response.arrayBuffer()
    const cd = response.headers.get('Content-Disposition') || 'attachment; filename="report.pdf"'
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': cd,
      },
    })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'PDF generation timed out' }, { status: 504 })
    }
    console.error('export-pdf proxy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
