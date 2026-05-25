// ============================================================
// FeasiAI SaaS — Database Types
// Auto-generated base: database.generated.ts (supabase gen types)
// This file adds convenience aliases used across the app.
// To regenerate: supabase gen types typescript --local > frontend/types/database.generated.ts
// ============================================================

// Re-export everything from the auto-generated file
export type { Database, Json } from './database.generated'
export { Constants } from './database.generated'

import type { Database } from './database.generated'

// ─── Public schema convenience types ───

type PublicTables = Database['public']['Tables']
type PublicEnums = Database['public']['Enums']

// Enum types
export type AccountType = PublicEnums['account_type']
export type WorkspaceType = PublicEnums['workspace_type']
export type WorkspaceRole = PublicEnums['workspace_role']
export type SystemRole = PublicEnums['system_role']
export type OnboardingStatus = PublicEnums['onboarding_status']
export type ProfessionType = PublicEnums['profession_type']
export type FlowType = PublicEnums['flow_type']
export type ProjectStatus = PublicEnums['project_status']
export type PipelineStatus = PublicEnums['pipeline_status']
export type FileType = PublicEnums['file_type']
export type MessageRole = PublicEnums['message_role']
export type ReportStatus = PublicEnums['report_status']
export type VerificationStatus = PublicEnums['verification_status']
export type CreditTransactionType = PublicEnums['credit_transaction_type']
export type PaymentStatus = PublicEnums['payment_status']
export type CollaborationScope = PublicEnums['collaboration_scope']
export type CollaborationStatus = PublicEnums['collaboration_status']
export type CorrectionType = PublicEnums['correction_type']
export type ReferralEventType = PublicEnums['referral_event_type']
export type NotificationChannel = PublicEnums['notification_channel']
export type NotificationStatus = PublicEnums['notification_status']

// Row types
export type Profile = PublicTables['profiles']['Row']
export type Workspace = PublicTables['workspaces']['Row']
export type WorkspaceMembership = PublicTables['workspace_memberships']['Row']
export type WorkspaceInvitation = PublicTables['workspace_invitations']['Row']
export type BillingAccount = PublicTables['billing_accounts']['Row']
export type CreditLedger = PublicTables['credit_ledger']['Row']
export type Project = PublicTables['projects']['Row']
export type ProjectFile = PublicTables['project_files']['Row']
export type PipelineRun = PublicTables['pipeline_runs']['Row']
export type PipelineMessage = PublicTables['pipeline_messages']['Row']
export type Report = PublicTables['reports']['Row']
export type ReportVersion = PublicTables['report_versions']['Row']
export type ReportComment = PublicTables['report_comments']['Row']
export type ReportFeedback = PublicTables['report_feedback']['Row']
export type ProjectCollaboration = PublicTables['project_collaborations']['Row']
export type ReferralLink = PublicTables['referral_links']['Row']
export type ReferralEvent = PublicTables['referral_events']['Row']
export type Notification = PublicTables['notifications']['Row']
export type AuditEvent = PublicTables['audit_events']['Row']

// Insert types
export type ProfileInsert = PublicTables['profiles']['Insert']
export type WorkspaceInsert = PublicTables['workspaces']['Insert']
export type ProjectInsert = PublicTables['projects']['Insert']
export type PipelineRunInsert = PublicTables['pipeline_runs']['Insert']
export type ReportInsert = PublicTables['reports']['Insert']

// Update types
export type ProfileUpdate = PublicTables['profiles']['Update']
export type ProjectCollaborationUpdate = PublicTables['project_collaborations']['Update']
export type WorkspaceUpdate = PublicTables['workspaces']['Update']
export type ProjectUpdate = PublicTables['projects']['Update']

// ─── App schema (feasiai) convenience types ───

type AppSchemaTables = Database['feasiai']['Tables']
type AppSchemaEnums = Database['feasiai']['Enums']

export type LegacyProjectStatus = AppSchemaEnums['project_status']
export type LegacyFlowType = AppSchemaEnums['flow_type']
export type LegacyFlowPhase = AppSchemaEnums['flow_phase']
export type LegacyFileType = AppSchemaEnums['file_type']
export type LegacyMessageRole = AppSchemaEnums['message_role']
export type LegacyQuestionType = AppSchemaEnums['question_type']

export type LegacyProject = AppSchemaTables['projects']['Row']
export type LegacyFile = AppSchemaTables['files']['Row']
export type LegacyMessage = AppSchemaTables['messages']['Row']
export type LegacyOutput = AppSchemaTables['outputs']['Row']
export type LegacyContractorAnswer = AppSchemaTables['contractor_answers']['Row']

// ─── Skill registry types (from skill_nodes, skill_edges, skill_executions, source_registry tables) ───

export type SkillNode = {
  id: string
  name: string
  version: string
  description: string | null
  accuracy: number
  maturity: string
  total_executions: number
  last_verified: string | null
  created_at: string
  updated_at: string
}

export type SkillEdge = {
  id: string
  source_skill_id: string
  target_skill_id: string
  relationship_type: string
  created_at: string
}

export type SkillExecution = {
  id: string
  skill_node_id: string
  project_id: string | null
  status: string
  started_at: string
  completed_at: string | null
  error_message: string | null
  execution_time_ms: number | null
}

export type SourceRegistryEntry = {
  id: string
  url: string
  title: string | null
  source_type: string
  status: string
  last_fetched: string | null
  skill_node_id: string | null
  created_at: string
}
