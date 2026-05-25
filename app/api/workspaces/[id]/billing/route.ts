import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify workspace membership
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this workspace' }, { status: 403 })
  }

  // Fetch billing account
  const { data: billing, error: billingError } = await supabase
    .from('billing_accounts')
    .select('*')
    .eq('workspace_id', id)
    .single()

  if (billingError) {
    return NextResponse.json({ error: 'Billing account not found' }, { status: 404 })
  }

  // Fetch recent credit ledger entries
  const { data: ledger } = await supabase
    .from('credit_ledger')
    .select('id, transaction_type, amount, balance_after, description, created_at')
    .eq('workspace_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    billing,
    ledger: ledger ?? [],
  })
}
