import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const REFERRAL_COOKIE_NAME = 'pf_ref'
const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

interface Props {
  params: Promise<{ code: string }>
}

export default async function ReferralRedirectPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  // Look up referral link by code
  const { data: link } = await supabase
    .from('referral_links')
    .select('id, created_by, click_count')
    .eq('code', code)
    .single()

  if (link) {
    // Increment click count
    await supabase
      .from('referral_links')
      .update({ click_count: (link.click_count ?? 0) + 1 })
      .eq('id', link.id)

    // Create referral event
    await supabase.from('referral_events').insert({
      referral_link_id: link.id,
      event_type: 'click' as const,
    })

    // Set 30-day attribution cookie
    const cookieStore = await cookies()
    cookieStore.set(REFERRAL_COOKIE_NAME, code, {
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    redirect(`/signup?ref=${encodeURIComponent(code)}&utm_source=referral&utm_medium=link`)
  }

  // Invalid code — redirect to signup with error indicator
  redirect('/signup?ref_error=invalid')
}
