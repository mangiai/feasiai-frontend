import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/server/access-control'
import type { AccountType, ProfileUpdate } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { step, data: payload } = body as {
      step: number
      data: Record<string, unknown>
    }

    if (!step || step < 1 || step > 4) {
      return NextResponse.json({ error: 'Invalid step (1-4)' }, { status: 400 })
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Missing data object' }, { status: 400 })
    }

    switch (step) {
      case 1: {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_data')
          .eq('id', user.id)
          .single()

        const onboardingData = (profile?.onboarding_data as Record<string, unknown>) ?? {}
        const updates: ProfileUpdate = {}
        if (payload.full_name) updates.full_name = String(payload.full_name)
        if (payload.phone) updates.phone = String(payload.phone)
        if (payload.company_name) {
          updates.onboarding_data = {
            ...onboardingData,
            company_name: String(payload.company_name),
          }
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)

        if (error) {
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
        }
        break
      }

      case 2: {
        // Update account type
        if (!payload.account_type) {
          return NextResponse.json({ error: 'account_type is required for step 2' }, { status: 400 })
        }

        const { error } = await supabase
          .from('profiles')
          .update({ account_type: String(payload.account_type) as AccountType })
          .eq('id', user.id)

        if (error) {
          return NextResponse.json({ error: 'Failed to update account type' }, { status: 500 })
        }
        break
      }

      case 3: {
        // Create workspace + membership
        if (!payload.workspace_name) {
          return NextResponse.json({ error: 'workspace_name is required for step 3' }, { status: 400 })
        }

        let admin
        try {
          admin = getAdminSupabase()
        } catch {
          return NextResponse.json(
            { error: 'Server misconfiguration: Supabase service role is not set' },
            { status: 503 },
          )
        }

        const wsName = String(payload.workspace_name)
        const workspaceType = payload.workspace_type === 'team' ? 'team' : 'personal'
        const slug = wsName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        const { data: workspace, error: wsError } = await admin
          .from('workspaces')
          .insert({
            name: wsName.trim(),
            slug: `${slug}-${Date.now().toString(36)}`,
            type: workspaceType,
            created_by: user.id,
          })
          .select()
          .single()

        if (wsError) {
          console.error('[api/onboarding] insert workspace:', wsError)
          return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
        }

        const { error: memError } = await admin
          .from('workspace_memberships')
          .insert({
            workspace_id: workspace.id,
            user_id: user.id,
            role: 'owner',
          })

        if (memError) {
          console.error('[api/onboarding] insert membership:', memError)
          await admin.from('workspaces').delete().eq('id', workspace.id)
          return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 })
        }
        break
      }

      case 4: {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_data')
          .eq('id', user.id)
          .single()

        const onboardingData = (profile?.onboarding_data as Record<string, unknown>) ?? {}
        const nextOnboardingData = {
          ...onboardingData,
          ...(payload.interests ? { interests: payload.interests as string[] } : {}),
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            onboarding_data: nextOnboardingData,
            onboarding_status: 'completed',
          })
          .eq('id', user.id)

        if (error) {
          return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
        }
        break
      }
    }

    return NextResponse.json({ success: true, step })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
