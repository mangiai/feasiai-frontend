import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { authenticateRequest, getSupabaseForAuth } from '@/lib/api-auth'
import { APP_DB_SCHEMA, STORAGE_BUCKET_UPLOADS } from '@/lib/app-schema'
import { buildPersistedZimasProjectCache, parseCachedZimasLookupResult } from '@/lib/zimas-cache'
import { isZimasLookupVerified } from '@/lib/zimas-verification'
import { sanitizeZimasSearchAddress } from '@/lib/zimas-search-address'
import { getAdminSupabase } from '@/lib/server/access-control'

function isInvalidAientitleSchemaError(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === 'PGRST106' || (error?.message ?? '').includes('Invalid schema: feasiai')
}

function isMissingRpcError(error: { code?: string; message?: string } | null | undefined): boolean {
  const message = (error?.message ?? '').toLowerCase()
  return (
    error?.code === 'PGRST202'
    || message.includes('could not find the function')
    || message.includes('function public.create_dual_schema_project')
  )
}

function coerceLotSizeSqft(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(num) || num <= 0) return null
  return Math.round(num)
}

async function deleteProjectRows(adminSupabase: SupabaseClient, projectId: string) {
  const { error: rpcError } = await adminSupabase.rpc('delete_dual_schema_project', {
    p_project_id: projectId,
  })
  if (!rpcError) return

  await Promise.allSettled([
    adminSupabase.schema(APP_DB_SCHEMA).from('projects').delete().eq('id', projectId),
    adminSupabase.from('projects').delete().eq('id', projectId),
  ])
}

async function createProjectRows(
  adminSupabase: SupabaseClient,
  params: {
    userId: string
    workspaceId: string
    projectName: string
    city: string
    projectAddress: string | null
    flowType: string
    publicFlowType: string
    isFeasibility: boolean
    zone?: string
    lotSize: number | null
    tocTier?: string
    chipTier?: string
    lotWidth?: number
    lotDepth?: number
    existingBuildingYear: number | null
    existingUnits: number | null
    rsoUnits?: number
    existingParking?: number
    hazardZones?: string
    transitProximity?: boolean
    specificPlan?: string
    persistedZoningData: unknown
  },
): Promise<{ projectId: string } | { error: string; status: number; code?: string }> {
  const feasibilityFields = params.isFeasibility
    ? {
        zone: params.zone || null,
        lot_size: params.lotSize,
        toc_tier: params.tocTier || null,
        chip_tier: params.chipTier || null,
        lot_width: params.lotWidth || null,
        lot_depth: params.lotDepth || null,
        existing_building_year: params.existingBuildingYear,
        existing_units: params.existingUnits,
        rso_units: params.rsoUnits || null,
        existing_parking: params.existingParking || null,
        hazard_zones: params.hazardZones || null,
        transit_proximity: params.transitProximity ?? null,
        specific_plan: params.specificPlan || null,
      }
    : {}

  const { data: rpcProjectId, error: rpcError } = await adminSupabase.rpc('create_dual_schema_project', {
    p_user_id: params.userId,
    p_workspace_id: params.workspaceId,
    p_project_name: params.projectName,
    p_city: params.city,
    p_project_address: params.projectAddress,
    p_runtime_flow_type: params.flowType,
    p_public_flow_type: params.publicFlowType,
    p_runtime_status: 'uploading',
    p_public_status: 'uploading',
    p_zone: params.isFeasibility ? params.zone || null : null,
    p_lot_size: params.isFeasibility ? params.lotSize : null,
    p_toc_tier: params.isFeasibility ? params.tocTier || null : null,
    p_chip_tier: params.isFeasibility ? params.chipTier || null : null,
    p_lot_width: params.isFeasibility ? params.lotWidth || null : null,
    p_lot_depth: params.isFeasibility ? params.lotDepth || null : null,
    p_existing_building_year: params.isFeasibility ? params.existingBuildingYear : null,
    p_existing_units: params.isFeasibility ? params.existingUnits : null,
    p_rso_units: params.isFeasibility ? params.rsoUnits || null : null,
    p_existing_parking: params.isFeasibility ? params.existingParking || null : null,
    p_hazard_zones: params.isFeasibility ? params.hazardZones || null : null,
    p_transit_proximity: params.isFeasibility ? (params.transitProximity ?? null) : null,
    p_specific_plan: params.isFeasibility ? params.specificPlan || null : null,
    p_zoning_data: params.isFeasibility ? params.persistedZoningData : null,
    p_is_demo: false,
  })

  if (!rpcError && typeof rpcProjectId === 'string' && rpcProjectId.length > 0) {
    return { projectId: rpcProjectId }
  }

  if (rpcError && !isMissingRpcError(rpcError)) {
    console.error('create_dual_schema_project RPC failed:', {
      code: rpcError.code,
      message: rpcError.message,
      details: rpcError.details,
    })
    return { error: 'Failed to create project', status: 500 }
  }

  // Fallback when RPC migration is not applied yet (requires feasiai schema exposed).
  const { data: project, error: projectError } = await adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('projects')
    .insert({
      user_id: params.userId,
      project_name: params.projectName,
      city: params.city,
      project_address: params.projectAddress,
      flow_type: params.flowType,
      status: 'uploading',
      is_demo: false,
      ...feasibilityFields,
    })
    .select('id')
    .single()

  if (projectError || !project) {
    console.error('Failed to create project:', {
      code: projectError?.code,
      message: projectError?.message,
      details: projectError?.details,
    })
    if (isInvalidAientitleSchemaError(projectError)) {
      return {
        error:
          'Database is missing the create_dual_schema_project function and the feasiai API schema is not exposed. Apply the latest Supabase migration or add "feasiai" under Project Settings → API → Exposed schemas.',
        status: 503,
        code: 'AIENTITLE_SCHEMA_NOT_CONFIGURED',
      }
    }
    return { error: 'Failed to create project', status: 500 }
  }

  const projectId = (project as { id: string }).id

  const { error: publicProjectError } = await adminSupabase
    .from('projects')
    .insert({
      id: projectId,
      workspace_id: params.workspaceId,
      name: params.projectName,
      address: params.projectAddress,
      city: params.city,
      flow_type: params.publicFlowType,
      status: 'uploading',
      created_by: params.userId,
      is_demo: false,
      ...(params.isFeasibility && {
        zone: params.zone || null,
        lot_size_sqft: params.lotSize,
        toc_tier: params.tocTier || null,
        chip_tier: params.chipTier || null,
        lot_width: params.lotWidth || null,
        lot_depth: params.lotDepth || null,
        existing_building_year: params.existingBuildingYear,
        existing_units: params.existingUnits,
        rso_units: params.rsoUnits || null,
        existing_parking: params.existingParking || null,
        hazard_zones: params.hazardZones || null,
        transit_proximity: params.transitProximity ?? null,
        specific_plan: params.specificPlan || null,
        zoning_data: params.persistedZoningData,
      }),
    })

  if (publicProjectError) {
    await deleteProjectRows(adminSupabase, projectId)
    console.error('Failed to create public project mirror:', publicProjectError)
    return { error: 'Failed to create project workspace record', status: 500 }
  }

  return { projectId }
}

async function insertProjectFileRecord(
  adminSupabase: SupabaseClient,
  params: {
    projectId: string
    fileType: string
    filename: string
    storagePath: string
    mimeType: string
    sizeBytes: number
  },
): Promise<{ ok: true } | { ok: false; error: { code?: string; message?: string } }> {
  const { error: rpcError } = await adminSupabase.rpc('insert_runtime_project_file', {
    p_project_id: params.projectId,
    p_file_type: params.fileType,
    p_filename: params.filename,
    p_storage_path: params.storagePath,
    p_mime_type: params.mimeType,
    p_size_bytes: params.sizeBytes,
  })

  if (!rpcError) {
    return { ok: true }
  }

  if (!isMissingRpcError(rpcError)) {
    return { ok: false, error: rpcError }
  }

  const { error: schemaError } = await adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('files')
    .insert({
      project_id: params.projectId,
      file_type: params.fileType,
      filename: params.filename,
      storage_path: params.storagePath,
      mime_type: params.mimeType,
      size_bytes: params.sizeBytes,
    })

  if (schemaError) {
    return { ok: false, error: schemaError }
  }

  return { ok: true }
}

function coerceIntInRange(
  value: unknown,
  range: { min: number; max: number },
): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(num)) return null
  const int = Math.trunc(num)
  if (int < range.min || int > range.max) return null
  return int
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      workspace_id,
      project_name,
      city,
      project_address,
      flow_type,
      // Feasibility-specific fields
      zone,
      lot_size,
      toc_tier,
      chip_tier,
      lot_width,
      lot_depth,
      // Extended feasibility fields
      existing_building_year,
      existing_units,
      rso_units,
      existing_parking,
      hazard_zones,
      transit_proximity,
      specific_plan,
      existing_building_plan,
      rso_replacement_policy,
      zimas_lookup_cache,
      zimas_street_line,
      zimas_lookup_method,
      zimas_locked_apn,
      zimas_reference_url,
      files, // Array of { filename, file_type, size_bytes, mime_type }
    } = body

    const safeExistingBuildingYear =
      flow_type === 'feasibility-analysis'
        ? coerceIntInRange(existing_building_year, { min: 1800, max: 2100 })
        : null
    const safeExistingUnits =
      flow_type === 'feasibility-analysis'
        ? coerceIntInRange(existing_units, { min: 1, max: 1000 })
        : null

    const userAssumptions = flow_type === 'feasibility-analysis'
      ? Object.fromEntries(
          Object.entries({
            existing_building_plan: existing_building_plan || undefined,
            rso_replacement_policy: rso_replacement_policy || undefined,
          }).filter(([, value]) => value !== undefined),
        ) as {
          existing_building_plan?: 'demolish' | 'keep_rear_development' | 'partial_demolition'
          rso_replacement_policy?: 'proportional_removed_units' | 'full_if_any_demo' | 'auto_by_scope'
        }
      : undefined

    const zimasStreetLine =
      typeof zimas_street_line === 'string'
        ? sanitizeZimasSearchAddress(zimas_street_line)
        : sanitizeZimasSearchAddress(project_address)

    const persistedZoningData = flow_type === 'feasibility-analysis'
      ? (
          buildPersistedZimasProjectCache({
            lookupResult: zimas_lookup_cache,
            projectAddress: project_address,
            zimasStreetLine,
            lookupMethod:
              zimas_lookup_method === 'apn' || zimas_lookup_method === 'address'
                ? zimas_lookup_method
                : undefined,
            lockedApn: typeof zimas_locked_apn === 'string' ? zimas_locked_apn : undefined,
            fallbackLotArea: lot_size,
            userAssumptions,
          }) ?? (
            userAssumptions?.existing_building_plan || userAssumptions?.rso_replacement_policy
              ? { user_assumptions: userAssumptions }
              : null
          )
        )
      : null

    // Validate required fields
    if (!workspace_id || !project_name || !flow_type || !city) {
      return NextResponse.json(
        { error: 'workspace_id, project_name, city, and flow_type are required' },
        { status: 400 },
      )
    }

    if (!['city-review', 'corrections-analysis', 'feasibility-analysis'].includes(flow_type)) {
      return NextResponse.json(
        { error: 'flow_type must be city-review, corrections-analysis, or feasibility-analysis' },
        { status: 400 },
      )
    }

    const filesArr = Array.isArray(files) ? files : []
    if (flow_type !== 'feasibility-analysis' && filesArr.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 },
      )
    }

    if (flow_type === 'feasibility-analysis') {
      const parsedCache = parseCachedZimasLookupResult(zimas_lookup_cache)
      if (!isZimasLookupVerified(parsedCache)) {
        return NextResponse.json(
          {
            error:
              'ZIMAS verification is required before creating a feasibility project. Confirm the address on zimas.lacity.org and complete a successful lookup.',
            code: 'ZIMAS_NOT_VERIFIED',
          },
          { status: 400 },
        )
      }
      if (!project_address || typeof project_address !== 'string' || project_address.trim().length < 8) {
        return NextResponse.json(
          { error: 'A verified project address is required for feasibility analysis' },
          { status: 400 },
        )
      }
    }

    const publicFlowType =
      flow_type === 'city-review'
        ? 'city_review'
        : flow_type === 'corrections-analysis'
          ? 'corrections'
          : 'feasibility'

    // Use cookie-based client for membership check; service-role client for writes.
    const supabase = await getSupabaseForAuth(auth)
    const adminSupabase = getAdminSupabase()

    const { data: membership } = await supabase
      .from('workspace_memberships')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', auth.userId)
      .eq('is_active', true)
      .single()

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only workspace owners, admins, or members can create projects' },
        { status: 403 },
      )
    }

    const safeLotSizeSqft = coerceLotSizeSqft(lot_size)
    const isFeasibility = flow_type === 'feasibility-analysis'

    const created = await createProjectRows(adminSupabase, {
      userId: auth.userId,
      workspaceId: workspace_id,
      projectName: project_name,
      city,
      projectAddress: project_address || null,
      flowType: flow_type,
      publicFlowType,
      isFeasibility,
      zone,
      lotSize: safeLotSizeSqft,
      tocTier: toc_tier,
      chipTier: chip_tier,
      lotWidth: lot_width,
      lotDepth: lot_depth,
      existingBuildingYear: safeExistingBuildingYear,
      existingUnits: safeExistingUnits,
      rsoUnits: rso_units,
      existingParking: existing_parking,
      hazardZones: hazard_zones,
      transitProximity: transit_proximity,
      specificPlan: specific_plan,
      persistedZoningData,
    })

    if ('error' in created) {
      return NextResponse.json(
        { error: created.error, ...(created.code ? { code: created.code } : {}) },
        { status: created.status },
      )
    }

    const projectId = created.projectId

    // 2. Create file records and generate signed upload URLs
    const fileRecords: Array<{
      filename: string
      file_type: string
      storage_path: string
      upload_url: string
    }> = []

    let fileSetupFailed = false

    for (const file of filesArr) {
      const storagePath = `${auth.userId}/${projectId}/${file.filename}`

      const fileInsert = await insertProjectFileRecord(adminSupabase, {
        projectId,
        fileType: file.file_type || 'plan-binder',
        filename: file.filename,
        storagePath: `${STORAGE_BUCKET_UPLOADS}/${storagePath}`,
        mimeType: file.mime_type || 'application/pdf',
        sizeBytes: file.size_bytes || 0,
      })

      if (!fileInsert.ok) {
        console.error(`Failed to create file record for ${file.filename}:`, fileInsert.error)
        if (isInvalidAientitleSchemaError(fileInsert.error)) {
          await deleteProjectRows(adminSupabase, projectId)
          return NextResponse.json(
            {
              error:
                'Database is missing the insert_runtime_project_file function and the feasiai API schema is not exposed. Apply the latest Supabase migration or add "feasiai" under Project Settings → API → Exposed schemas.',
              code: 'AIENTITLE_SCHEMA_NOT_CONFIGURED',
            },
            { status: 503 },
          )
        }
        fileSetupFailed = true
        break
      }

      // Generate signed upload URL (10 min expiry)
      const { data: uploadData, error: uploadError } = await adminSupabase.storage
        .from(STORAGE_BUCKET_UPLOADS)
        .createSignedUploadUrl(storagePath)

      if (uploadError || !uploadData) {
        console.error(`Failed to create upload URL for ${file.filename}:`, uploadError)
        fileSetupFailed = true
        break
      }

      fileRecords.push({
        filename: file.filename,
        file_type: file.file_type || 'plan-binder',
        storage_path: storagePath,
        upload_url: (uploadData as { signedUrl: string }).signedUrl,
      })
    }

    if (fileSetupFailed || fileRecords.length !== filesArr.length) {
      await deleteProjectRows(adminSupabase, projectId)

      return NextResponse.json(
        { error: 'Failed to prepare one or more file uploads' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      project_id: projectId,
      files: fileRecords,
    })
  } catch (error) {
    console.error('Error in create project route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
