import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspace_id = searchParams.get('workspace_id') ?? request.headers.get('X-Workspace-Id')

  if (!workspace_id) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  // Verify user is a member of this workspace
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 })
  }

  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0)

  // Get total count
  const { count } = await supabase
    .from('credit_ledger')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace_id)

  // Fetch transactions
  const { data: transactions, error } = await supabase
    .from('credit_ledger')
    .select('*')
    .eq('workspace_id', workspace_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch transaction history' }, { status: 500 })
  }

  return NextResponse.json({
    transactions: transactions ?? [],
    total_count: count ?? 0,
  })
}
