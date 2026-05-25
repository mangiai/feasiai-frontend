'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function lockWorkspace(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Merge into existing settings
  const { data: ws } = await supabase
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single()

  const current = (ws?.settings as Record<string, unknown>) ?? {}

  await supabase
    .from('workspaces')
    .update({
      settings: {
        ...current,
        is_locked: true,
        locked_by: user?.id ?? null,
        locked_at: new Date().toISOString(),
      },
    })
    .eq('id', workspaceId)

  revalidatePath(`/sa/workspaces/${workspaceId}`)
}

export async function unlockWorkspace(workspaceId: string) {
  const supabase = await createClient()

  const { data: ws } = await supabase
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single()

  const current = (ws?.settings as Record<string, unknown>) ?? {}

  await supabase
    .from('workspaces')
    .update({
      settings: {
        ...current,
        is_locked: false,
        locked_by: null,
        locked_at: null,
      },
    })
    .eq('id', workspaceId)

  revalidatePath(`/sa/workspaces/${workspaceId}`)
}
