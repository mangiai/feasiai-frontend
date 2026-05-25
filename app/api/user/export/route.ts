import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildUserDataExport } from '@/lib/user-data-export'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const payload = await buildUserDataExport(admin, user.id)
    const body = JSON.stringify(payload, null, 2)
    const filename = `feasiai-data-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[user/export]', e)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
