'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeAuth } from '@/lib/supabase/use-realtime-auth'

interface ProjectStatusRealtimeProps {
  projectId: string
  onStatusChange: (status: string) => void
}

/**
 * Subscribes to Supabase Realtime for a specific project's status changes.
 * Renders nothing — purely a side-effect wrapper.
 *
 * NOTE: This subscribes to `public.projects`. If project data lives only in the
 * app (`feasiai`) schema, this subscription will never fire. Supabase Realtime
 * only supports `public` schema out of the box — custom schema support
 * requires enabling the `supabase_realtime` publication on those tables.
 */
export function ProjectStatusRealtime({ projectId, onStatusChange }: ProjectStatusRealtimeProps) {
  const supabase = useMemo(() => createClient(), [])
  const realtimeReady = useRealtimeAuth(supabase)

  useEffect(() => {
    if (!realtimeReady) return

    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    function subscribe() {
      const channel = supabase
        .channel(`project-status-rt-${projectId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'projects',
            filter: `id=eq.${projectId}`,
          },
          (payload) => {
            const newStatus = payload.new.status as string
            onStatusChange(newStatus)
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`[ProjectStatusRealtime] channel error for ${projectId}, retrying in 5s`, err)
            supabase.removeChannel(channel)
            retryTimeout = setTimeout(subscribe, 5000)
          }
        })

      return channel
    }

    const channel = subscribe()

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout)
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase, realtimeReady, onStatusChange])

  return null
}
