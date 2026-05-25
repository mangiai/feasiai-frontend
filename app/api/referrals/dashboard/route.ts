import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch user's referral links
  const { data: links, error: linksError } = await supabase
    .from('referral_links')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (linksError) {
    return NextResponse.json({ error: 'Failed to fetch referral links' }, { status: 500 })
  }

  const allLinks = links ?? []
  const linkIds = allLinks.map(l => l.id)

  // Fetch events grouped by link
  const eventsByLink: Record<string, { clicks: number; signups: number; conversions: number; credits: number }> = {}

  if (linkIds.length > 0) {
    const { data: events, error: eventsError } = await supabase
      .from('referral_events')
      .select('referral_link_id, event_type, metadata')
      .in('referral_link_id', linkIds)

    if (eventsError) {
      return NextResponse.json({ error: 'Failed to fetch referral events' }, { status: 500 })
    }

    for (const event of events ?? []) {
      if (!eventsByLink[event.referral_link_id]) {
        eventsByLink[event.referral_link_id] = { clicks: 0, signups: 0, conversions: 0, credits: 0 }
      }
      const bucket = eventsByLink[event.referral_link_id]
      if (event.event_type === 'click') bucket.clicks++
      else if (event.event_type === 'signup') bucket.signups++
      else if (event.event_type === 'first_purchase' || event.event_type === 'report_ordered') {
        bucket.conversions++
        const meta = event.metadata as Record<string, unknown> | null
        bucket.credits += (typeof meta?.credit_amount === 'number' ? meta.credit_amount : 0)
      }
    }
  }

  // Build per-link stats and totals
  let total_clicks = 0
  let total_signups = 0
  let total_conversions = 0
  let total_credits_earned = 0

  const linksWithStats = allLinks.map(link => {
    const stats = eventsByLink[link.id] ?? { clicks: 0, signups: 0, conversions: 0, credits: 0 }
    total_clicks += stats.clicks
    total_signups += stats.signups
    total_conversions += stats.conversions
    total_credits_earned += stats.credits
    return { ...link, ...stats }
  })

  return NextResponse.json({
    stats: {
      total_links: allLinks.length,
      total_clicks,
      total_signups,
      total_conversions,
      total_credits_earned,
    },
    links: linksWithStats,
  })
}
