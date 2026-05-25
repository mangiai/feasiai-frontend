import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/server/access-control'

/**
 * PATCH — Save edited report content (HITL edits).
 * Creates a version snapshot before updating.
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
  const { artifacts } = body as { artifacts?: Record<string, unknown> }

  if (!artifacts || typeof artifacts !== 'object') {
    return NextResponse.json({ error: 'artifacts object is required' }, { status: 400 })
  }

  // Fetch current report
  const { data: report, error: fetchErr } = await adminSupabase
    .from('reports')
    .select('id, content, current_version, verification_status')
    .eq('id', id)
    .single()

  if (fetchErr || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // Snapshot current version before overwriting
  // Update report content with new artifacts
  const updatedContent = {
    ...(typeof report.content === 'object' && report.content !== null ? report.content : {}),
    artifacts,
  }
  const shouldResetVerification = report.verification_status === 'verified'

  const runOptimisticFallback = async () => {
    const { error: versionInsertErr } = await adminSupabase.from('report_versions').insert({
      report_id: id,
      version_number: report.current_version,
      content: report.content,
      change_summary: 'SA expert edit',
      change_type: 'expert_review',
      created_by: user.id,
    })

    if (versionInsertErr && versionInsertErr.code !== '23505') {
      return {
        ok: false as const,
        status: 500,
        error: `Failed to snapshot report version: ${versionInsertErr.message}`,
      }
    }

    const { data: updated, error: updateErr } = await adminSupabase
      .from('reports')
      .update({
        content: updatedContent as unknown,
        current_version: report.current_version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('current_version', report.current_version)
      .select('id')

    if (updateErr) {
      return {
        ok: false as const,
        status: 500,
        error: `Failed to save report edit: ${updateErr.message}`,
      }
    }

    if (!updated || updated.length === 0) {
      return {
        ok: false as const,
        status: 409,
        error: 'Conflict — report was modified by another user. Please reload and try again.',
      }
    }

    return { ok: true as const }
  }

  // Attempt atomic version bump via RPC (SELECT ... FOR UPDATE inside transaction)
  const { data: newVersion, error: rpcErr } = await adminSupabase.rpc('update_report_with_version', {
    p_report_id: id,
    p_expected_version: report.current_version,
    p_content: updatedContent as unknown,
    p_change_summary: 'SA expert edit',
    p_change_type: 'expert_review',
    p_user_id: user.id,
  })

  // Fallback on any RPC error to keep edit path resilient across local schema/policy drift.
  if (rpcErr) {
    console.error('update_report_with_version RPC failed, using optimistic fallback', {
      report_id: id,
      code: rpcErr.code,
      message: rpcErr.message,
      details: rpcErr.details,
      hint: rpcErr.hint,
    })

    const fallback = await runOptimisticFallback()
    if (!fallback.ok) {
      return NextResponse.json({ error: fallback.error }, { status: fallback.status })
    }
  } else if (newVersion === 0) {
    return NextResponse.json(
      { error: 'Conflict — report was modified by another user. Please reload and try again.' },
      { status: 409 },
    )
  }

  if (shouldResetVerification) {
    const { error: verificationResetErr } = await adminSupabase
      .from('reports')
      .update({
        verification_status: 'pending',
        verified_at: null,
        verified_by: null,
        verification_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (verificationResetErr) {
      return NextResponse.json({ error: 'Failed to reset verification status after edit' }, { status: 500 })
    }
  }

  // Audit event
  await adminSupabase.from('audit_events').insert({
    action: 'report_content_edited',
    actor_id: user.id,
    actor_email: user.email ?? null,
    resource_type: 'report',
    resource_id: id,
    details: {
      version_from: report.current_version,
      version_to: report.current_version + 1,
      artifact_keys: Object.keys(artifacts),
      verification_reset: shouldResetVerification,
    },
  })

  return NextResponse.json({
    version: report.current_version + 1,
    message: 'Report content updated successfully.',
  })
}
