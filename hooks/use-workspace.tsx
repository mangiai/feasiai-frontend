'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Workspace, WorkspaceMembership, WorkspaceRole, BillingAccount } from '@/types/database'

interface WorkspaceContextValue {
  // Current user
  profile: Profile | null
  isLoading: boolean

  // Workspaces
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  currentRole: WorkspaceRole | null
  switchWorkspace: (workspaceId: string) => void

  // Credits
  creditBalance: number

  // Lock status
  isCurrentWorkspaceLocked: boolean

  // Permissions
  canManageMembers: boolean
  canManageBilling: boolean
  canCreateProjects: boolean
  isAdmin: boolean
  isStaff: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

const WORKSPACE_STORAGE_KEY = 'feasiai-workspace-id'

export function WorkspaceProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([])
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Load profile and workspaces
  useEffect(() => {
    async function load() {
      setIsLoading(true)

      const [profileRes, membershipsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('workspace_memberships').select('*, workspaces(*)').eq('user_id', userId).eq('is_active', true),
      ])

      if (profileRes.data) {
        setProfile(profileRes.data as Profile)
      }

      if (membershipsRes.data) {
        const mems = membershipsRes.data as (WorkspaceMembership & { workspaces: Workspace })[]
        // Filter out soft-deleted workspaces defensively (RLS should also block them)
        const activeMems = mems.filter(m => !(m.workspaces as any)?.deleted_at)
        setMemberships(activeMems)
        const ws = activeMems.map(m => m.workspaces)
        setWorkspaces(ws)

        // Restore last workspace or use first
        const stored = typeof window !== 'undefined' ? localStorage.getItem(WORKSPACE_STORAGE_KEY) : null
        const targetId = stored && ws.some(w => w.id === stored) ? stored : ws[0]?.id ?? null
        setCurrentWorkspaceId(targetId)
      }

      setIsLoading(false)
    }

    load()
  }, [supabase, userId])

  // Load credit balance when workspace changes
  useEffect(() => {
    if (!currentWorkspaceId) return

    supabase
      .from('billing_accounts')
      .select('credit_balance')
      .eq('workspace_id', currentWorkspaceId)
      .single()
      .then(({ data }) => {
        if (data) setCreditBalance(data.credit_balance)
      })
  }, [supabase, currentWorkspaceId])

  const switchWorkspace = useCallback((workspaceId: string) => {
    const nextId = workspaceId || null
    setCurrentWorkspaceId(nextId)
    if (typeof window !== 'undefined') {
      if (workspaceId) localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId)
      else localStorage.removeItem(WORKSPACE_STORAGE_KEY)
    }
  }, [])

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) ?? null
  const currentMembership = memberships.find(m => m.workspace_id === currentWorkspaceId)
  const currentRole = currentMembership?.role ?? null

  const isAdmin = currentRole === 'owner' || currentRole === 'admin'
  const STAFF_ROLES = ['super_admin', 'expert_reviewer', 'support_agent', 'operations'] as const
  const isStaff = STAFF_ROLES.includes(profile?.system_role as any)
  const isCurrentWorkspaceLocked = (currentWorkspace?.settings as any)?.is_locked === true

  const value: WorkspaceContextValue = {
    profile,
    isLoading,
    workspaces,
    currentWorkspace,
    currentRole,
    switchWorkspace,
    creditBalance,
    isCurrentWorkspaceLocked,
    canManageMembers: isAdmin,
    canManageBilling: isAdmin,
    canCreateProjects: currentRole === 'owner' || currentRole === 'admin' || currentRole === 'member',
    isAdmin,
    isStaff,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
