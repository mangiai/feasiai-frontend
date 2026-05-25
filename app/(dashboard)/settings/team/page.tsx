'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { UserPlusIcon, ShieldIcon, UserIcon, CrownIcon, Trash2Icon, MailIcon } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  role: string
  created_at: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
  }
}

interface PendingInvite {
  id: string
  email: string
  role: string
  created_at: string
}

const ROLE_ICONS: Record<string, typeof CrownIcon> = {
  owner: CrownIcon,
  admin: ShieldIcon,
  member: UserIcon,
  viewer: UserIcon,
}

const ROLE_COLORS: Record<string, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  member: 'outline',
  viewer: 'outline',
}

const EDITABLE_ROLES = ['admin', 'member', 'viewer']

export default function TeamSettingsPage() {
  const { currentWorkspace, canManageMembers, currentRole, switchWorkspace } = useWorkspace()
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showInviteConfirm, setShowInviteConfirm] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing, setRemoving] = useState(false)
  const [showDeleteWorkspaceConfirm, setShowDeleteWorkspaceConfirm] = useState(false)
  const [deletingWorkspace, setDeletingWorkspace] = useState(false)
  const [deleteWorkspaceMessage, setDeleteWorkspaceMessage] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    if (!currentWorkspace) return
    setLoading(true)
    const [membersRes, invitesRes] = await Promise.all([
      fetch(`/api/workspaces/${currentWorkspace.id}/members`),
      fetch(`/api/workspaces/${currentWorkspace.id}/members?include=invitations`),
    ])
    if (membersRes.ok) {
      const data = await membersRes.json()
      setMembers(data.members || [])
    }
    if (invitesRes.ok) {
      const data = await invitesRes.json()
      setPendingInvites(data.invitations || [])
    }
    setLoading(false)
  }, [currentWorkspace])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentWorkspace || !inviteEmail.trim()) return
    setShowInviteConfirm(true)
  }

  async function handleInviteConfirmed() {
    if (!currentWorkspace || !inviteEmail.trim()) return
    setShowInviteConfirm(false)
    setInviting(true)
    setMessage(null)

    const res = await fetch(`/api/workspaces/${currentWorkspace.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })

    setInviting(false)
    if (res.ok) {
      setMessage({ type: 'success', text: `Invitation sent to ${inviteEmail.trim()}.` })
      setInviteEmail('')
      loadMembers()
    } else {
      const data = await res.json()
      setMessage({ type: 'error', text: data.error || 'Failed to send invitation.' })
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    if (!currentWorkspace) return
    const res = await fetch(`/api/workspaces/${currentWorkspace.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, role: newRole }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    }
  }

  async function handleRemoveMember() {
    if (!currentWorkspace || !removeTarget) return
    setRemoving(true)
    const res = await fetch(
      `/api/workspaces/${currentWorkspace.id}/members?member_id=${removeTarget.id}`,
      { method: 'DELETE' }
    )
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== removeTarget.id))
    }
    setRemoving(false)
    setRemoveTarget(null)
  }

  async function handleDeleteWorkspaceConfirmed() {
    if (!currentWorkspace) return
    setDeletingWorkspace(true)
    setDeleteWorkspaceMessage(null)
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteWorkspaceMessage(data?.error || 'Failed to delete workspace.')
        return
      }

      // Clear local selection and force reload so the provider re-fetches memberships
      switchWorkspace('')
      if (typeof window !== 'undefined') {
        localStorage.removeItem('feasiai-workspace-id')
        window.location.href = '/dashboard'
      }
    } finally {
      setDeletingWorkspace(false)
      setShowDeleteWorkspaceConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People who have access to {currentWorkspace?.name || 'this workspace'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <div className="divide-y">
              {members.map(member => {
                const RoleIcon = ROLE_ICONS[member.role] || UserIcon
                return (
                  <div key={member.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {member.profiles?.full_name?.[0]?.toUpperCase() || member.profiles?.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                        </p>
                        {member.profiles?.email && member.profiles.full_name && (
                          <p className="text-xs text-muted-foreground">{member.profiles.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageMembers && member.role !== 'owner' ? (
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.id, e.target.value)}
                          className="h-7 rounded-md border border-input bg-transparent px-2 text-xs capitalize shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {EDITABLE_ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant={ROLE_COLORS[member.role] || 'outline'} className="capitalize gap-1">
                          <RoleIcon className="w-3 h-3" />
                          {member.role}
                        </Badge>
                      )}
                      {canManageMembers && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemoveTarget(member)}
                          title="Remove member"
                        >
                          <Trash2Icon className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite */}
      {canManageMembers && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlusIcon className="w-5 h-5" />
              Invite Member
            </CardTitle>
            <CardDescription>Send an invitation to join this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteSubmit} className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="inviteEmail">Email address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              <div className="w-32 space-y-2">
                <Label htmlFor="inviteRole">Role</Label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <Button type="submit" disabled={inviting}>
                {inviting ? 'Sending...' : 'Invite'}
              </Button>
            </form>
            {message && (
              <p className={`text-sm mt-3 ${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
                {message.text}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailIcon className="w-5 h-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>Invitations that have not yet been accepted.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {pendingInvites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {new Date(invite.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">{invite.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      {currentWorkspace && currentRole === 'owner' && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2Icon className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Deleting a workspace is a <strong>soft delete</strong>. It will be removed from your workspace list and access will be disabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deleteWorkspaceMessage && (
              <p className="text-sm text-destructive">{deleteWorkspaceMessage}</p>
            )}
            <Button
              variant="destructive"
              disabled={!canManageMembers || deletingWorkspace}
              onClick={() => setShowDeleteWorkspaceConfirm(true)}
            >
              {deletingWorkspace ? 'Deleting…' : 'Delete workspace'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invite Confirmation Dialog */}
      <AlertDialog open={showInviteConfirm} onOpenChange={setShowInviteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send an invitation to <strong>{inviteEmail}</strong> with the <strong>{inviteRole}</strong> role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInviteConfirmed}>Send Invitation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={open => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {removeTarget?.profiles?.full_name || removeTarget?.profiles?.email || 'this member'} from the workspace. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRemoveMember} disabled={removing}>
              {removing ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog open={showDeleteWorkspaceConfirm} onOpenChange={setShowDeleteWorkspaceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete <strong>{currentWorkspace?.name}</strong>. Members will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingWorkspace}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteWorkspaceConfirmed} disabled={deletingWorkspace}>
              {deletingWorkspace ? 'Deleting…' : 'Delete workspace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
