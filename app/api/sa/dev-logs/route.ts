import { NextRequest, NextResponse } from 'next/server'
import { assertSuperAdmin } from '../usage/_auth'
import { getServerBaseUrl } from '@/lib/http/server-base'

export async function GET(request: NextRequest) {
  const auth = await assertSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const adminSecret = process.env.ADMIN_SECRET
  const serverUrl = getServerBaseUrl({ includeDevFallback: true })
  if (!adminSecret || !serverUrl) {
    return NextResponse.json({ error: 'Server logging is not configured' }, { status: 503 })
  }

  const category = request.nextUrl.searchParams.get('category') ?? 'all'
  const limit = request.nextUrl.searchParams.get('limit') ?? '500'
  const url = new URL(`${serverUrl}/admin/dev-logs/recent`)
  url.searchParams.set('category', category)
  url.searchParams.set('limit', limit)

  const res = await fetch(url, {
    headers: { 'x-admin-secret': adminSecret },
    cache: 'no-store',
  })

  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  })
}
