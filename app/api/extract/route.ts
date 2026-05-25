import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { getServerBaseUrl, SERVER_URL_ERROR_HINT } from '@/lib/http/server-base'
import { assertLegacyProjectAccess } from '@/lib/server/access-control'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { project_id } = await request.json()

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    if (!auth.isApiKey) {
      const access = await assertLegacyProjectAccess({
        userId: auth.userId!,
        projectId: project_id,
        workspaceRoles: ['owner', 'admin', 'member'],
      })

      if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status })
      }
    }

    const serverBaseUrl = getServerBaseUrl()
    if (!serverBaseUrl) {
      return NextResponse.json({ error: `Server not configured (${SERVER_URL_ERROR_HINT})` }, { status: 500 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(`${serverBaseUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
      },
      body: JSON.stringify({ project_id }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || `Server error: ${response.status}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, ...data })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 })
    }
    console.error('Error in extract route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
