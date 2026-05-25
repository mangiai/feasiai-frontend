import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_PREFERENCES = {
  email_pipeline_complete: true,
  email_report_ready: true,
  email_collaboration: true,
  email_credits_low: true,
  in_app_all: true,
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('onboarding_data')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }

  const onboardingData = (profile?.onboarding_data as Record<string, unknown>) ?? {}
  const stored = (onboardingData.notification_preferences as Record<string, unknown>) ?? {}
  const preferences = { ...DEFAULT_PREFERENCES, ...stored }

  return NextResponse.json({ preferences })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates = await request.json()

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('onboarding_data')
    .eq('id', user.id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  const onboardingData = (profile?.onboarding_data as Record<string, unknown>) ?? {}
  const existing = (onboardingData.notification_preferences as Record<string, unknown>) ?? {}
  const merged = { ...DEFAULT_PREFERENCES, ...existing, ...updates }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ onboarding_data: { ...onboardingData, notification_preferences: merged } })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }

  return NextResponse.json({ preferences: merged })
}
