import type { SupabaseClient } from '@supabase/supabase-js'

import { APP_DB_SCHEMA } from '@/lib/app-schema'

export type UserDataExportPayload = {
  exported_at: string
  export_version: 1
  user_id: string
  profile: unknown
  workspace_memberships: unknown[]
  workspaces: unknown[]
  public_projects: unknown[]
  reports: unknown[]
  notifications: unknown[]
  billing_accounts: unknown[]
  credit_ledger: unknown[]
  pipeline_projects: unknown[]
  /** Output rows without large raw_artifacts blobs */
  outputs_summary: unknown[]
}

/**
 * Builds a portable JSON export of Supabase rows tied to the user (CPRA-style access request).
 * Uses a service-role client; caller must verify the session user matches `userId`.
 */
export async function buildUserDataExport(
  admin: SupabaseClient,
  userId: string,
): Promise<UserDataExportPayload> {
  const exportedAt = new Date().toISOString()

  const [profileRes, membershipsRes, notificationsRes, pipelineProjectsRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
    admin.from('workspace_memberships').select('*, workspaces(*)').eq('user_id', userId),
    admin.from('notifications').select('*').eq('user_id', userId),
    admin.schema(APP_DB_SCHEMA).from('projects').select('*').eq('user_id', userId),
  ])

  const workspaceIds = (membershipsRes.data ?? [])
    .map((m: { workspace_id?: string }) => m.workspace_id)
    .filter((id): id is string => Boolean(id))

  const workspaces = (membershipsRes.data ?? [])
    .map((m: { workspaces?: unknown }) => m.workspaces)
    .filter(Boolean)

  let publicProjects: unknown[] = []
  let reports: unknown[] = []
  let billingAccounts: unknown[] = []
  let creditLedger: unknown[] = []
  let outputsSummary: unknown[] = []

  if (workspaceIds.length > 0) {
    const [projectsRes, reportsRes, billingRes, ledgerRes] = await Promise.all([
      admin.from('projects').select('*').in('workspace_id', workspaceIds),
      admin.from('reports').select('*').in('workspace_id', workspaceIds),
      admin.from('billing_accounts').select('*').in('workspace_id', workspaceIds),
      admin.from('credit_ledger').select('*').in('workspace_id', workspaceIds),
    ])
    publicProjects = projectsRes.data ?? []
    reports = reportsRes.data ?? []
    billingAccounts = billingRes.data ?? []
    creditLedger = ledgerRes.data ?? []

    const projectIds = (publicProjects as { id?: string }[]).map(p => p.id).filter(Boolean) as string[]
    const pipelineIds = (pipelineProjectsRes.data as { id?: string }[] | null)?.map(p => p.id).filter(Boolean) ?? []
    const allProjectIds = [...new Set([...projectIds, ...pipelineIds])]

    if (allProjectIds.length > 0) {
      const { data: outputs } = await admin
        .schema(APP_DB_SCHEMA)
        .from('outputs')
        .select(
          'id, project_id, flow_phase, version, agent_cost_usd, agent_turns, agent_duration_ms, created_at, validation_status, confidence_score',
        )
        .in('project_id', allProjectIds)

      outputsSummary = outputs ?? []
    }
  }

  return {
    exported_at: exportedAt,
    export_version: 1,
    user_id: userId,
    profile: profileRes.data ?? null,
    workspace_memberships: membershipsRes.data ?? [],
    workspaces,
    public_projects: publicProjects,
    reports,
    notifications: notificationsRes.data ?? [],
    billing_accounts: billingAccounts,
    credit_ledger: creditLedger,
    pipeline_projects: pipelineProjectsRes.data ?? [],
    outputs_summary: outputsSummary,
  }
}
