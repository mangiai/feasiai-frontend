import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { getServerBaseUrl, SERVER_URL_ERROR_HINT } from '@/lib/http/server-base'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, message: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'super_admin') {
    return { ok: false as const, status: 403, message: 'Forbidden' }
  }

  return { ok: true as const }
}

function getServerBase(): string {
  const raw = getServerBaseUrl()
  if (!raw) throw new Error(`Server not configured (${SERVER_URL_ERROR_HINT})`)
  return raw
}

export async function POST(request: Request) {
  const auth = await assertSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET is not configured — cannot apply feedback to runtime' },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const feedbackIds = Array.isArray(body?.feedbackIds) ? body.feedbackIds : []
  const targetSkillName = typeof body?.targetSkillName === 'string' ? body.targetSkillName : undefined

  if (feedbackIds.length === 0) {
    return NextResponse.json({ error: 'feedbackIds array is required' }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(`${getServerBase()}/feedback/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret,
      },
      body: JSON.stringify({ feedbackIds, targetSkillName }),
    })
  } catch (err) {
    console.error('[sa/feedback/apply] Server unreachable:', err)
    return NextResponse.json(
      { error: 'Server is unreachable — is the backend running?' },
      { status: 502 },
    )
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error ?? 'Server returned an error' },
      { status: res.status },
    )
  }

  return NextResponse.json(data)
}
