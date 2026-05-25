import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { verificationCompleteEmail } from '@/lib/email-templates'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import { assertReportAccess, getAdminSupabase } from '@/lib/server/access-control'

const EXPEDITED_CREDIT_COST = 5

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = getAdminSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await assertReportAccess({ userId: user.id, reportId: id })
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const { data: report, error } = await adminSupabase
    .from('reports')
    .select('verification_status, verification_notes, verified_at, verified_by')
    .eq('id', id)
    .single()

  if (error || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  return NextResponse.json({ verification: report })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = getAdminSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await assertReportAccess({
    userId: user.id,
    reportId: id,
    workspaceRoles: ['owner', 'admin', 'member'],
    collaborationScopes: ['edit', 'verify'],
  })

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  let body: { priority?: string; notes?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Allow empty body for simple verification requests
  }

  const { priority = 'standard', notes } = body

  if (priority !== 'standard' && priority !== 'expedited') {
    return NextResponse.json({ error: 'Invalid priority. Must be "standard" or "expedited".' }, { status: 400 })
  }

  // Verify report exists
  const { data: report, error: fetchErr } = await adminSupabase
    .from('reports')
    .select('id, verification_status, workspace_id')
    .eq('id', id)
    .single()

  if (fetchErr || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (report.verification_status === 'verified') {
    return NextResponse.json({ error: 'Report is already verified' }, { status: 400 })
  }

  // Deduct credits for expedited reviews (atomic via RPC)
  if (priority === 'expedited') {
    const { data: billingAccount, error: billingLookupErr } = await adminSupabase
      .from('billing_accounts')
      .select('id, credit_balance')
      .eq('workspace_id', report.workspace_id)
      .single()

    if (billingLookupErr || !billingAccount) {
      return NextResponse.json({ error: 'Billing account not found' }, { status: 404 })
    }

    const { data: newBalance, error: rpcErr } = await adminSupabase.rpc('deduct_credits', {
      p_billing_account_id: billingAccount.id,
      p_amount: EXPEDITED_CREDIT_COST,
      p_workspace_id: report.workspace_id,
      p_description: 'Expedited verification for report',
      p_created_by: user.id,
      p_reference_id: id,
      p_reference_type: 'verification',
    })

    // Fallback: if RPC not available, use optimistic approach
    if (rpcErr?.message?.includes('function') || rpcErr?.code === '42883') {
      if (billingAccount.credit_balance < EXPEDITED_CREDIT_COST) {
        return NextResponse.json({ error: `Insufficient credits. Expedited review costs ${EXPEDITED_CREDIT_COST} credits.` }, { status: 402 })
      }

      const calcBalance = billingAccount.credit_balance - EXPEDITED_CREDIT_COST
      await adminSupabase.from('credit_ledger').insert({
        workspace_id: report.workspace_id,
        amount: -EXPEDITED_CREDIT_COST,
        balance_after: calcBalance,
        transaction_type: 'consumption',
        description: 'Expedited verification for report',
        created_by: user.id,
        reference_id: id,
        reference_type: 'verification',
      })
      const { data: updated } = await adminSupabase
        .from('billing_accounts')
        .update({ credit_balance: calcBalance })
        .eq('id', billingAccount.id)
        .eq('credit_balance', billingAccount.credit_balance)
        .select('id')

      if (!updated || updated.length === 0) {
        return NextResponse.json({ error: 'Credit deduction failed — please retry' }, { status: 409 })
      }
    } else if (rpcErr) {
      return NextResponse.json({ error: 'Credit deduction failed' }, { status: 500 })
    } else if (newBalance === -1) {
      return NextResponse.json({ error: `Insufficient credits. Expedited review costs ${EXPEDITED_CREDIT_COST} credits.` }, { status: 402 })
    }
  }

  const verificationNotes = [
    `Priority: ${priority}`,
    notes ? `Notes: ${notes}` : null,
  ].filter(Boolean).join(' | ')

  // Update report verification status
  const { error: updateErr } = await adminSupabase
    .from('reports')
    .update({
      verification_status: 'pending' as const,
      verification_notes: verificationNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to submit verification request' }, { status: 500 })
  }

  // Create audit event
  await adminSupabase.from('audit_events').insert({
    action: 'verification_requested',
    actor_id: user.id,
    actor_email: user.email ?? null,
    resource_type: 'report',
    resource_id: id,
    workspace_id: report.workspace_id,
    details: { priority, notes: notes ?? null },
  })

  return NextResponse.json({
    status: 'pending',
    priority,
    message: priority === 'expedited'
      ? 'Verification request submitted. Expedited review within 24 hours.'
      : 'Verification request submitted. Standard review within 48 hours.',
  })
}

/**
 * PATCH — Expert review action: approve, reject, or request revisions
 * Only accessible to users with system_role = 'admin' or 'super_admin'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = getAdminSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify reviewer/expert/super_admin role
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['reviewer', 'expert', 'super_admin'].includes(profile.system_role ?? '')) {
    return NextResponse.json({ error: 'Forbidden — reviewer access required' }, { status: 403 })
  }

  const body = await request.json()
  const { action, notes } = body as { action?: string; notes?: string }

  if (!action || !['approved', 'rejected', 'revisions_requested'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Must be "approved", "rejected", or "revisions_requested".' },
      { status: 400 },
    )
  }

  // Fetch report
  const { data: report, error: fetchErr } = await adminSupabase
    .from('reports')
    .select('id, title, verification_status, workspace_id, project_id')
    .eq('id', id)
    .single()

  if (fetchErr || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (report.verification_status !== 'pending') {
    return NextResponse.json({ error: 'Report is not pending verification' }, { status: 400 })
  }

  const newStatus = action === 'approved' ? 'verified' : action === 'rejected' ? 'rejected' : 'pending'

  const updatePayload: Record<string, unknown> = {
    verification_status: newStatus,
    verification_notes: notes ?? report.verification_status,
    updated_at: new Date().toISOString(),
  }

  if (action === 'approved') {
    updatePayload.verified_at = new Date().toISOString()
    updatePayload.verified_by = user.id
  }

  const { error: updateErr } = await adminSupabase
    .from('reports')
    .update(updatePayload)
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 })
  }

  // Audit event
  await adminSupabase.from('audit_events').insert({
    action: `verification_${action}`,
    actor_id: user.id,
    actor_email: user.email ?? null,
    resource_type: 'report',
    resource_id: id,
    workspace_id: report.workspace_id,
    details: { action, notes: notes ?? null },
  })

  // Accuracy tracking — update skill scores on approve/reject
  if ((action === 'approved' || action === 'rejected') && report.project_id) {
    try {
      const feedbackScores: Record<string, number> = { approved: 100, rejected: 20, revisions_requested: 60 }
      const score = feedbackScores[action] ?? 60

      const { data: output } = await adminSupabase
        .schema(APP_DB_SCHEMA)
        .from('outputs')
        .select('flow_phase')
        .eq('project_id', report.project_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (output?.flow_phase) {
        const skillMap: Record<string, string[]> = {
          review: ['california-adu', 'adu-plan-review', 'adu-city-research'],
          analysis: ['adu-corrections-flow', 'california-adu', 'adu-city-research', 'adu-targeted-page-viewer'],
          response: ['adu-corrections-complete'],
          feasibility: ['feasibility-analysis', 'california-adu'],
        }
        const skillNames = skillMap[output.flow_phase as string] || []

        if (skillNames.length > 0) {
          const { data: nodes } = await adminSupabase
            .from('skill_nodes')
            .select('id, name')
            .in('name', skillNames)

          if (nodes && nodes.length > 0) {
            for (const node of nodes) {
              await adminSupabase.from('skill_executions').insert({
                skill_node_id: node.id,
                flow_type: output.flow_phase,
                confidence_score: score,
                human_feedback_score: score,
                feedback_notes: notes || null,
                project_id: report.project_id,
              })

              // Recalculate rolling average (last 50)
              const { data: recentExecs } = await adminSupabase
                .from('skill_executions')
                .select('human_feedback_score')
                .eq('skill_node_id', node.id)
                .not('human_feedback_score', 'is', null)
                .order('created_at', { ascending: false })
                .limit(50)

              if (recentExecs && recentExecs.length > 0) {
                const avg = Math.round(
                  recentExecs.reduce((sum: number, e: { human_feedback_score: number | null }) => sum + (e.human_feedback_score || 0), 0) / recentExecs.length,
                )
                const updateData: Record<string, unknown> = {
                  accuracy_score: avg,
                  updated_at: new Date().toISOString(),
                }
                if (avg < 80) updateData.maturity = 'needs_attention'
                await adminSupabase.from('skill_nodes').update(updateData).eq('id', node.id)
              }
            }
          }
        }
      }
    } catch (accErr) {
      console.error('[accuracy] Failed to update skill accuracy:', accErr)
      // Fail open — don't block the verification response
    }
  }

  // Send email notification to report owner on completion
  if (action === 'approved' || action === 'rejected') {
    try {
      // Get workspace owner email
      const { data: workspace } = await adminSupabase
        .from('workspaces')
        .select('created_by')
        .eq('id', report.workspace_id)
        .single()

      if (workspace?.created_by) {
        const { data: ownerProfile } = await adminSupabase
          .from('profiles')
          .select('email')
          .eq('id', workspace.created_by)
          .single()

        if (ownerProfile?.email) {
          const statusLabel = action === 'approved' ? 'passed' : 'failed'
          await sendEmail({
            to: ownerProfile.email,
            subject: `Verification ${statusLabel}: ${report.title || 'Your Report'}`,
            html: verificationCompleteEmail(report.title || 'Your Report', statusLabel),
          })
        }
      }
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr)
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json({
    status: newStatus,
    action,
    message: `Verification ${action.replace('_', ' ')} successfully.`,
  })
}
