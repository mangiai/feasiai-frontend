import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import { getServerBaseUrl, SERVER_URL_ERROR_HINT } from '@/lib/http/server-base'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Projects live in the app schema; fetch resume_params too
  const { data: project } = await supabase
    .schema(APP_DB_SCHEMA)
    .from('projects')
    .select('id, user_id, status, resume_params')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (project.status !== 'paused') {
    return NextResponse.json(
      { error: 'Project is not paused' },
      { status: 409 }
    )
  }

  if (!project.resume_params) {
    return NextResponse.json(
      { error: 'No saved parameters — please start a new analysis' },
      { status: 422 }
    )
  }

  // Re-trigger generation on the server using the saved params.
  // The server sets the status back to processing-* internally.
  const serverUrl = getServerBaseUrl()
  if (!serverUrl) {
    return NextResponse.json({ error: `Server not configured (${SERVER_URL_ERROR_HINT})` }, { status: 500 })
  }
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${serverUrl}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(project.resume_params),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    return NextResponse.json(
      { error: `Failed to resume analysis: ${text || response.statusText}` },
      { status: 502 }
    )
  }

  return NextResponse.json({ status: 'resuming', project_id: id })
}
