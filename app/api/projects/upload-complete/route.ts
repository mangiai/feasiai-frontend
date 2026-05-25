import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { assertLegacyProjectAccess, getAdminSupabase } from '@/lib/server/access-control'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { project_id } = await request.json()
    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    const access = await assertLegacyProjectAccess({
      userId: auth.userId,
      projectId: project_id,
      workspaceRoles: ['owner', 'admin', 'member'],
    })

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const runtimeStatus = access.legacyProject.status
    const publicStatus = access.publicProject.status

    if (runtimeStatus !== 'uploading' && publicStatus !== 'uploading') {
      return NextResponse.json({ error: 'Project is not in uploading state' }, { status: 400 })
    }

    const adminSupabase = getAdminSupabase()
    const { error: syncError } = await adminSupabase.rpc('sync_project_status', {
      p_project_id: project_id,
      p_runtime_status: 'ready',
      p_public_status: 'ready',
      p_current_phase: null,
      p_error_message: null,
    })

    if (syncError) {
      console.error('sync_project_status failed:', syncError)
      return NextResponse.json({ error: 'Failed to mark project ready' }, { status: 500 })
    }

    return NextResponse.json({ success: true, project_id })
  } catch (error) {
    console.error('Error in upload-complete route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
