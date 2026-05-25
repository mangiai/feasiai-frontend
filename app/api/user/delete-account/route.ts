import { NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type RpcResult = { ok?: boolean; code?: string; message?: string }

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { confirm?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.confirm !== 'DELETE MY ACCOUNT') {
    return NextResponse.json(
      { error: 'Confirmation phrase mismatch. Send { "confirm": "DELETE MY ACCOUNT" }.' },
      { status: 400 },
    )
  }

  try {
    const admin = createAdminClient()

    const { data: rpcData, error: rpcError } = await admin.rpc('prepare_solo_account_deletion', {
      p_user_id: user.id,
    })

    if (rpcError) {
      console.error('[user/delete-account] RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Account deletion is temporarily unavailable. Contact support.' },
        { status: 503 },
      )
    }

    const result = rpcData as RpcResult | null
    if (!result?.ok) {
      return NextResponse.json(
        {
          error: result?.message ?? 'Account cannot be deleted automatically.',
          code: result?.code ?? 'UNKNOWN',
        },
        { status: 409 },
      )
    }

    await admin.from('audit_events').insert({
      action: 'user.account_deletion_requested',
      actor_id: user.id,
      actor_email: user.email ?? null,
      details: { source: 'self_serve_api' },
    })

    const { error: delError } = await admin.auth.admin.deleteUser(user.id)

    if (delError) {
      console.error('[user/delete-account] auth.admin.deleteUser:', delError)
      return NextResponse.json(
        { error: 'Database prepared but auth user deletion failed. Contact support immediately.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[user/delete-account]', e)
    return NextResponse.json({ error: 'Account deletion failed' }, { status: 500 })
  }
}
