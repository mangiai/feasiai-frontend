import type { SupabaseClient } from '@supabase/supabase-js'

import { APP_DB_SCHEMA } from '@/lib/app-schema'

export type PreservedFeasibilityInput = {
  zone?: string
  lot_size?: number
  toc_tier?: string
  chip_tier?: string
  lot_width?: number
  lot_depth?: number
  existing_building_year?: number
  existing_units?: number
  rso_units?: number
  existing_parking?: number
  hazard_zones?: string
  transit_proximity?: boolean
  specific_plan?: string
  existing_building_plan?: string
  rso_replacement_policy?: string
}

type LegacyProjectRow = {
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
  resume_params?: Record<string, unknown> | null
}

type PublicProjectRow = {
  zone?: string | null
  lot_size_sqft?: number | null
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
  zoning_data?: Record<string, unknown> | null
}

function pickNumber(...values: Array<number | null | undefined>): number | undefined {
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return undefined
}

function pickString(...values: Array<string | null | undefined>): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function pickBoolean(...values: Array<boolean | null | undefined>): boolean | undefined {
  for (const v of values) {
    if (typeof v === 'boolean') return v
  }
  return undefined
}

/**
 * Reconstruct feasibility generate payload from legacy project columns,
 * resume_params, and public.projects zoning_data overrides.
 */
export async function loadPreservedFeasibilityInput(
  adminSupabase: SupabaseClient,
  projectId: string,
): Promise<PreservedFeasibilityInput> {
  const [{ data: legacy }, { data: pub }] = await Promise.all([
    adminSupabase
      .schema(APP_DB_SCHEMA)
      .from('projects')
      .select(
        'zone, lot_size, toc_tier, chip_tier, lot_width, lot_depth, existing_building_year, existing_units, rso_units, existing_parking, hazard_zones, transit_proximity, specific_plan, resume_params',
      )
      .eq('id', projectId)
      .maybeSingle(),
    adminSupabase
      .from('projects')
      .select(
        'zone, lot_size_sqft, toc_tier, chip_tier, lot_width, lot_depth, existing_building_year, existing_units, rso_units, existing_parking, hazard_zones, transit_proximity, specific_plan, zoning_data',
      )
      .eq('id', projectId)
      .maybeSingle(),
  ])

  const legacyRow = (legacy ?? {}) as LegacyProjectRow
  const publicRow = (pub ?? {}) as PublicProjectRow
  const resume =
    legacyRow.resume_params && typeof legacyRow.resume_params === 'object'
      ? legacyRow.resume_params
      : {}
  const zoning = publicRow.zoning_data ?? {}
  const assumptions =
    zoning && typeof zoning === 'object' && !Array.isArray(zoning)
      ? ((zoning as Record<string, unknown>).user_assumptions as Record<string, unknown> | undefined)
      : undefined

  return {
    zone: pickString(legacyRow.zone, publicRow.zone, resume.zone as string | undefined),
    lot_size: pickNumber(
      legacyRow.lot_size ?? undefined,
      publicRow.lot_size_sqft ?? undefined,
      resume.lot_size as number | undefined,
    ),
    toc_tier: pickString(legacyRow.toc_tier, publicRow.toc_tier, resume.toc_tier as string | undefined),
    chip_tier: pickString(legacyRow.chip_tier, publicRow.chip_tier, resume.chip_tier as string | undefined),
    lot_width: pickNumber(
      legacyRow.lot_width ?? undefined,
      publicRow.lot_width ?? undefined,
      resume.lot_width as number | undefined,
    ),
    lot_depth: pickNumber(
      legacyRow.lot_depth ?? undefined,
      publicRow.lot_depth ?? undefined,
      resume.lot_depth as number | undefined,
    ),
    existing_building_year: pickNumber(
      legacyRow.existing_building_year ?? undefined,
      publicRow.existing_building_year ?? undefined,
      resume.existing_building_year as number | undefined,
    ),
    existing_units: pickNumber(
      legacyRow.existing_units ?? undefined,
      publicRow.existing_units ?? undefined,
      resume.existing_units as number | undefined,
    ),
    rso_units: pickNumber(
      legacyRow.rso_units ?? undefined,
      publicRow.rso_units ?? undefined,
      resume.rso_units as number | undefined,
    ),
    existing_parking: pickNumber(
      legacyRow.existing_parking ?? undefined,
      publicRow.existing_parking ?? undefined,
      resume.existing_parking as number | undefined,
    ),
    hazard_zones: pickString(
      legacyRow.hazard_zones,
      publicRow.hazard_zones,
      resume.hazard_zones as string | undefined,
    ),
    transit_proximity: pickBoolean(
      legacyRow.transit_proximity ?? undefined,
      publicRow.transit_proximity ?? undefined,
      resume.transit_proximity as boolean | undefined,
    ),
    specific_plan: pickString(
      legacyRow.specific_plan,
      publicRow.specific_plan,
      resume.specific_plan as string | undefined,
    ),
    existing_building_plan: pickString(
      assumptions?.existing_building_plan as string | undefined,
      resume.existing_building_plan as string | undefined,
    ),
    rso_replacement_policy: pickString(
      assumptions?.rso_replacement_policy as string | undefined,
      resume.rso_replacement_policy as string | undefined,
    ),
  }
}

export function preservedInputToGenerateBody(
  projectId: string,
  runAsUserId: string,
  input: PreservedFeasibilityInput,
  reportId: string,
) {
  return {
    project_id: projectId,
    user_id: runAsUserId,
    flow_type: 'feasibility-analysis' as const,
    regeneration_target_report_id: reportId,
    use_free_models: true,
    ...Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined && v !== null),
    ),
  }
}
