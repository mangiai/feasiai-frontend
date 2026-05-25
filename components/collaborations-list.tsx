'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2Icon, Trash2Icon, UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CollaborationBadge } from '@/components/collaboration-badge'
import { createClient } from '@/lib/supabase/client'
import type { CollaborationStatus } from '@/types/database'

interface Collaboration {
  id: string
  grantee_email: string
  scope: 'view' | 'comment' | 'edit'
  status: CollaborationStatus
  created_at: string
  expires_at: string | null
  grantee_user_id: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  accepted: 'bg-green-500/10 text-green-700 border-green-500/20',
  declined: 'bg-red-500/10 text-red-700 border-red-500/20',
  expired: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  revoked: 'bg-red-500/10 text-red-500 border-red-500/20',
}

interface CollaborationsListProps {
  resourceType: 'project' | 'report'
  resourceId: string
  refreshToken?: number
}

export function CollaborationsList({ resourceType, resourceId, refreshToken = 0 }: CollaborationsListProps) {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)

  const fetchCollaborations = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(
        `/api/collaborations?resource_type=${resourceType}&resource_id=${resourceId}`
      )
      if (res.ok) {
        const data = await res.json()
        setCollaborations(data.sent ?? [])
      } else {
        setError('Failed to load collaborations.')
      }
    } catch (err) {
      setError('Network error loading collaborations.')
    } finally {
      setLoading(false)
    }
  }, [resourceType, resourceId])

  useEffect(() => {
    fetchCollaborations()
  }, [fetchCollaborations, refreshToken])

  // Realtime subscription to refresh on collaboration changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`collaborations-${resourceType}-${resourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_collaborations',
          filter: resourceType === 'project'
            ? `project_id=eq.${resourceId}`
            : `report_id=eq.${resourceId}`,
        },
        () => {
          fetchCollaborations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [resourceType, resourceId, fetchCollaborations])

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const res = await fetch(`/api/collaborations/${revokeTarget}`, { method: 'DELETE' })
      if (res.ok) {
        setCollaborations((prev) => prev.filter((c) => c.id !== revokeTarget))
      } else {
        setError('Failed to revoke collaboration.')
      }
    } catch (err) {
      setError('Network error revoking collaboration.')
    } finally {
      setRevoking(false)
      setRevokeTarget(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        <span className="ml-2 text-xs">Loading collaborations…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-xs text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchCollaborations}>Retry</Button>
      </div>
    )
  }

  if (collaborations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
        <UsersIcon className="size-8 opacity-40" />
        <p className="text-xs">No collaborations yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="divide-y">
        {collaborations.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.grantee_email}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString()}
                {c.expires_at && ` · Expires ${new Date(c.expires_at).toLocaleDateString()}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <CollaborationBadge scope={c.scope} />
              <Badge variant="outline" className={STATUS_STYLES[c.status] || ''}>
                {c.status}
              </Badge>
              {(c.status === 'pending' || c.status === 'accepted') && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setRevokeTarget(c.id)}
                  title="Revoke"
                >
                  <Trash2Icon className="size-3.5 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke collaboration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately remove the collaborator&apos;s access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? 'Revoking…' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
