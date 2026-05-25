import 'server-only'

import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

import { APP_DB_SCHEMA } from '@/lib/app-schema'

type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer' | 'collaborator'
type CollaborationScope = 'view' | 'comment' | 'edit' | 'verify'
type SystemRole = 'super_admin' | 'reviewer' | 'expert' | 'sales' | 'support' | 'operations'

type LegacyProjectRow = {
  id: string
  user_id: string
  flow_type: 'city-review' | 'corrections-analysis' | 'feasibility-analysis'
  project_name: string
  project_address: string | null
  city: string | null
  status: string
  is_demo: boolean
  zone?: string | null
  lot_size?: number | null
  toc_tier?: string | null
  chip_tier?: string | null
  lot_width?: number | null
  lot_depth?: number | null
  existing_building_year?: number | null
  existing_units?: number | null
  rso_units?: number | null
  existing_parking?: number | null
  hazard_zones?: string | null
  transit_proximity?: boolean | null
  specific_plan?: string | null
}

type PublicProjectRow = {
  id: string
  workspace_id: string
  name: string
  status: string
  flow_type: string
  address: string | null
  city: string | null
  created_by: string
  is_demo: boolean
}

type ReportRow = {
  id: string
  workspace_id: string
  project_id: string
  status: string
  verification_status: string
  title: string
  current_version: number
  content: unknown
  is_public: boolean
  public_token: string | null
  updated_at: string
}

type AccessFailure = {
  ok: false
  status: number
  error: string
}

type LegacyProjectAccess = {
  ok: true
  legacyProject: LegacyProjectRow
  publicProject: PublicProjectRow
  membershipRole: WorkspaceRole
}

type ReportAccess = {
  ok: true
  report: ReportRow
  membershipRole: WorkspaceRole | null
  collaborationScope: CollaborationScope | null
  systemRole: SystemRole | null
}

const DEFAULT_PROJECT_VIEW_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer', 'collaborator']
const DEFAULT_REPORT_VIEW_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer', 'collaborator']

function createAdminSupabase(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured')
  }

  return createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function includesRole(allowedRoles: WorkspaceRole[], role: string | null | undefined): role is WorkspaceRole {
  return Boolean(role && allowedRoles.includes(role as WorkspaceRole))
}

function includesScope(allowedScopes: CollaborationScope[], scope: string | null | undefined): scope is CollaborationScope {
  return Boolean(scope && allowedScopes.includes(scope as CollaborationScope))
}

export function getAdminSupabase() {
  return createAdminSupabase()
}

export async function getActiveWorkspaceMembership(
  adminSupabase: SupabaseClient,
  userId: string,
  workspaceId: string,
) {
  const { data } = await adminSupabase
    .from('workspace_memberships')
    .select('workspace_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  return data as { workspace_id: string; role: WorkspaceRole } | null
}

async function fetchLegacyProject(adminSupabase: SupabaseClient, projectId: string) {
  const { data } = await adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('projects')
    .select('id, user_id, flow_type, project_name, project_address, city, status, is_demo, zone, lot_size, toc_tier, chip_tier, lot_width, lot_depth, existing_building_year, existing_units, rso_units, existing_parking, hazard_zones, transit_proximity, specific_plan')
    .eq('id', projectId)
    .maybeSingle()

  return (data as LegacyProjectRow | null) ?? null
}

async function fetchPublicProject(adminSupabase: SupabaseClient, projectId: string) {
  const { data } = await adminSupabase
    .from('projects')
    .select('id, workspace_id, name, status, flow_type, address, city, created_by, is_demo')
    .eq('id', projectId)
    .maybeSingle()

  return (data as PublicProjectRow | null) ?? null
}

function mapPublicFlowTypeToLegacy(flowType: string): LegacyProjectRow['flow_type'] {
  if (flowType === 'feasibility') return 'feasibility-analysis'
  if (flowType === 'corrections') return 'corrections-analysis'
  return 'city-review'
}

function mapPublicStatusToLegacy(status: string): string {
  switch (status) {
    case 'uploading':
      return 'uploading'
    case 'ready':
    case 'draft':
      return 'ready'
    case 'queued':
    case 'processing':
      return 'processing'
    case 'awaiting_input':
      return 'awaiting-answers'
    case 'paused':
      return 'paused'
    case 'completed':
      return 'completed'
    case 'failed':
    case 'cancelled':
      return 'failed'
    default:
      return status
  }
}

/** When PostgREST cannot read feasiai.projects (PGRST106), derive runtime fields from public.projects. */
function synthesizeLegacyProjectFromPublic(publicProject: PublicProjectRow): LegacyProjectRow {
  return {
    id: publicProject.id,
    user_id: publicProject.created_by,
    flow_type: mapPublicFlowTypeToLegacy(publicProject.flow_type),
    project_name: publicProject.name,
    project_address: publicProject.address,
    city: publicProject.city,
    status: mapPublicStatusToLegacy(publicProject.status),
    is_demo: publicProject.is_demo,
  }
}

export async function assertLegacyProjectAccess({
  userId,
  projectId,
  workspaceRoles = DEFAULT_PROJECT_VIEW_ROLES,
}: {
  userId: string
  projectId: string
  workspaceRoles?: WorkspaceRole[]
}): Promise<AccessFailure | LegacyProjectAccess> {
  const adminSupabase = createAdminSupabase()
  const [legacyFromSchema, publicProject] = await Promise.all([
    fetchLegacyProject(adminSupabase, projectId),
    fetchPublicProject(adminSupabase, projectId),
  ])

  if (!publicProject) {
    return { ok: false, status: 404, error: 'Project not found' }
  }

  const legacyProject = legacyFromSchema ?? synthesizeLegacyProjectFromPublic(publicProject)

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('system_role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.system_role === 'super_admin') {
    return {
      ok: true,
      legacyProject,
      publicProject,
      membershipRole: 'admin',
    }
  }

  const membership = await getActiveWorkspaceMembership(adminSupabase, userId, publicProject.workspace_id)
  if (!membership || !includesRole(workspaceRoles, membership.role)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return {
    ok: true,
    legacyProject,
    publicProject,
    membershipRole: membership.role,
  }
}

export async function assertReportAccess({
  userId,
  reportId,
  workspaceRoles = DEFAULT_REPORT_VIEW_ROLES,
  collaborationScopes = ['view', 'comment', 'edit', 'verify'],
  allowStaff = true,
  requiredStaffRoles,
}: {
  userId: string
  reportId: string
  workspaceRoles?: WorkspaceRole[]
  collaborationScopes?: CollaborationScope[]
  allowStaff?: boolean
  requiredStaffRoles?: SystemRole[]
}): Promise<AccessFailure | ReportAccess> {
  const adminSupabase = createAdminSupabase()

  const [{ data: report }, { data: profile }] = await Promise.all([
    adminSupabase
      .from('reports')
      .select('id, workspace_id, project_id, status, verification_status, title, current_version, content, is_public, public_token, updated_at')
      .eq('id', reportId)
      .maybeSingle(),
    adminSupabase
      .from('profiles')
      .select('system_role')
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (!report) {
    return { ok: false, status: 404, error: 'Report not found' }
  }

  const systemRole = (profile?.system_role as SystemRole | null | undefined) ?? null
  if (allowStaff && systemRole && (!requiredStaffRoles || requiredStaffRoles.includes(systemRole))) {
    return {
      ok: true,
      report: report as ReportRow,
      membershipRole: null,
      collaborationScope: null,
      systemRole,
    }
  }

  const membership = await getActiveWorkspaceMembership(adminSupabase, userId, report.workspace_id)
  if (membership && includesRole(workspaceRoles, membership.role)) {
    return {
      ok: true,
      report: report as ReportRow,
      membershipRole: membership.role,
      collaborationScope: null,
      systemRole,
    }
  }

  const nowIso = new Date().toISOString()
  const { data: collaboration } = await adminSupabase
    .from('project_collaborations')
    .select('scope, expires_at')
    .eq('project_id', report.project_id)
    .eq('grantee_user_id', userId)
    .eq('status', 'accepted')
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!collaboration || !includesScope(collaborationScopes, collaboration.scope)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return {
    ok: true,
    report: report as ReportRow,
    membershipRole: null,
    collaborationScope: collaboration.scope as CollaborationScope,
    systemRole,
  }
}
