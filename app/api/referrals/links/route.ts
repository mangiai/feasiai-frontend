import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: links, error } = await supabase
    .from('referral_links')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch referral links' }, { status: 500 })
  }

  return NextResponse.json({ links: links ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { campaign_name, destination_url } = body

  const code = crypto.randomUUID().slice(0, 8)

  const { data: link, error } = await supabase
    .from('referral_links')
    .insert({
      code,
      owner_user_id: user.id,
      created_by: user.id,
      campaign_name: campaign_name || null,
      destination_url: destination_url || '/signup',
    })
    .select()
    .single()

  if (error) {
    const message = (error.message || '').toLowerCase()
    if (error.code === '42501' || message.includes('row-level security')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Referral code already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Failed to create referral link' }, { status: 500 })
  }

  return NextResponse.json({ link })
}
