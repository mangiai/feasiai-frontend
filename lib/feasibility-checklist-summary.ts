import type { CachedZimasLookupResult } from '@/lib/zimas-cache'

export type ChecklistStatus = 'ok' | 'verify' | 'missing' | 'blocked'

export interface ChecklistRow {
  id: string
  label: string
  value: string
  status: ChecklistStatus
  note?: string
}

export interface FeasibilityChecklistSummary {
  gate: 'PROCEED' | 'PROCEED_WITH_FLAGS' | 'BLOCK'
  criticalMissing: string[]
  rows: ChecklistRow[]
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  const s = String(value).trim()
  return s
}

function fieldFromCache(cache: CachedZimasLookupResult | null, key: string): string {
  if (!cache?.fields) return ''
  return asText((cache.fields as Record<string, unknown>)[key])
}

export function extractLotSizeFromRawRows(rawData: unknown): string {
  if (!Array.isArray(rawData)) return ''
  for (const row of rawData) {
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    const subtitle = asText(record.Subtitle) || asText(record.subtitle)
    const subtitleLower = subtitle.toLowerCase()
    if (!subtitleLower.includes('lot') || !subtitleLower.includes('parcel')) continue
    if (!subtitleLower.includes('area') && !subtitleLower.includes('calculated')) continue
    const description = asText(record.Description) || asText(record.description)
    const num = asNumber(description)
    if (num !== null && num > 0) return String(Math.round(num))
  }
  return ''
}

export function extractLotSizeFromZimasCache(
  cache: CachedZimasLookupResult | null,
): string {
  if (!cache?.fields) return ''
  const fields = cache.fields as Record<string, unknown>
  const topLevel = asNumber(fields.lot_size)
  if (topLevel !== null && topLevel > 0) return String(Math.round(topLevel))

  const details = cache.fields.detail_fields as Record<string, Record<string, unknown>> | undefined
  const sections = ['address_legal', 'address_legal_information', 'assessor', 'assessor_information']
  for (const section of sections) {
    const block = details?.[section]
    if (!block) continue
    for (const key of ['lot_parcel_area_calculated', 'lot_parcel_area', 'lot_parcel_area_sq_ft']) {
      const raw = block[key]
      const value =
        raw && typeof raw === 'object' && 'value' in (raw as object)
          ? (raw as { value?: unknown }).value
          : raw
      const num = asNumber(value)
      if (num !== null && num > 0) return String(Math.round(num))
    }
  }

  return extractLotSizeFromRawRows(cache.raw_data)
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const matched = value.replace(/,/g, '').match(/\d+(\.\d+)?/)
    if (!matched) return null
    const parsed = Number.parseFloat(matched[0])
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function buildFeasibilityChecklistSummary(input: {
  projectName: string
  city: string
  address: string
  zone: string
  lotSize: string
  tocTier: string
  chipTier: string
  transitProximity: boolean | null
  hazardZones: string
  specificPlan: string
  existingBuildingYear: string
  existingUnits: string
  zimasVerified: boolean
  zimasLookupCache: CachedZimasLookupResult | null
}): FeasibilityChecklistSummary {
  const apn =
    fieldFromCache(input.zimasLookupCache, 'apn') ||
    asText(input.zimasLookupCache?.fields?.apn)
  const generalPlan = fieldFromCache(input.zimasLookupCache, 'general_plan_land_use')
  const toia = fieldFromCache(input.zimasLookupCache, 'toia_tier')
  const oc = fieldFromCache(input.zimasLookupCache, 'oc_tier')
  const ct = fieldFromCache(input.zimasLookupCache, 'ct_tier')
  const tcac = fieldFromCache(input.zimasLookupCache, 'tcac_opportunity_area')
  const lowVmt = fieldFromCache(input.zimasLookupCache, 'ab_2334_low_vmt')
  const historic =
    fieldFromCache(input.zimasLookupCache, 'historic_preservation') ||
    fieldFromCache(input.zimasLookupCache, 'historic_places_la')

  const zone = input.zone.trim() || fieldFromCache(input.zimasLookupCache, 'zone')
  const lotSize = input.lotSize.trim() || ''
  const lotFromCache = fieldFromCache(input.zimasLookupCache, 'lot_parcel_area')
  const hasLot = Boolean(lotSize || lotFromCache)

  const rows: ChecklistRow[] = [
    {
      id: 'address',
      label: 'Property address',
      value: input.address.trim() || '—',
      status: input.address.trim().length >= 8 ? 'ok' : 'missing',
    },
    {
      id: 'zimas',
      label: 'ZIMAS verification',
      value: input.zimasVerified ? 'Verified' : 'Not verified',
      status: input.zimasVerified ? 'ok' : 'blocked',
    },
    {
      id: 'city',
      label: 'City / jurisdiction',
      value: input.city.trim() || '—',
      status: input.city.trim() ? 'ok' : 'missing',
    },
    {
      id: 'zone',
      label: 'Zone code',
      value: zone || '—',
      status: zone ? 'ok' : 'missing',
      note: 'Required for feasibility calculations',
    },
    {
      id: 'lot',
      label: 'Lot size (gross sf)',
      value: lotSize || lotFromCache || '—',
      status: hasLot ? 'ok' : 'verify',
      note: hasLot ? undefined : 'ZIMAS often omits lot area — agent uses Assessor fallback',
    },
    {
      id: 'apn',
      label: 'APN',
      value: apn || '—',
      status: apn ? 'ok' : 'verify',
    },
    {
      id: 'toc',
      label: 'TOC tier',
      value: input.tocTier.trim() || fieldFromCache(input.zimasLookupCache, 'toc_tier') || '—',
      status: input.tocTier.trim() || fieldFromCache(input.zimasLookupCache, 'toc_tier') ? 'ok' : 'verify',
    },
    {
      id: 'chip',
      label: 'CHIP tiers',
      value:
        [input.chipTier.trim(), toia && `TOIA ${toia}`, oc && `OC ${oc}`, ct && `CT ${ct}`]
          .filter(Boolean)
          .join(' · ') || '—',
      status:
        input.chipTier.trim() || toia || oc || ct ? 'ok' : 'verify',
    },
    {
      id: 'transit',
      label: 'Transit (½ mi MTS / AB 2097)',
      value:
        input.transitProximity === true
          ? 'Yes'
          : input.transitProximity === false
            ? 'No'
            : fieldFromCache(input.zimasLookupCache, 'transit_proximity') || 'Unknown',
      status: input.transitProximity !== null ? 'ok' : 'verify',
    },
    {
      id: 'hazards',
      label: 'Hazards / historic',
      value: [input.hazardZones.trim(), historic && `Historic: ${historic}`].filter(Boolean).join('; ') || 'None reported',
      status: 'ok',
    },
    {
      id: 'specific_plan',
      label: 'Specific plan',
      value: input.specificPlan.trim() || fieldFromCache(input.zimasLookupCache, 'specific_plan') || 'None',
      status: 'ok',
    },
    {
      id: 'general_plan',
      label: 'General plan land use',
      value: generalPlan || '—',
      status: generalPlan ? 'ok' : 'verify',
    },
    {
      id: 'tcac',
      label: 'TCAC opportunity area',
      value: tcac || '—',
      status: tcac ? 'ok' : 'verify',
    },
    {
      id: 'low_vmt',
      label: 'Low VMT (AB 2334)',
      value: lowVmt || '—',
      status: lowVmt ? 'ok' : 'verify',
    },
    {
      id: 'existing',
      label: 'Existing development',
      value:
        [input.existingBuildingYear && `Built ${input.existingBuildingYear}`, input.existingUnits && `${input.existingUnits} units`]
          .filter(Boolean)
          .join(' · ') || 'Not specified (agent may research)',
      status: 'ok',
    },
  ]

  const criticalMissing: string[] = []
  if (!input.projectName.trim()) criticalMissing.push('Project name')
  if (!input.city.trim()) criticalMissing.push('City')
  if (input.address.trim().length < 8) criticalMissing.push('Address')
  if (!input.zimasVerified) criticalMissing.push('ZIMAS verification')
  if (!zone) criticalMissing.push('Zone code')
  if (!hasLot) criticalMissing.push('Lot size')

  let gate: FeasibilityChecklistSummary['gate'] = 'PROCEED'
  if (!input.zimasVerified || !zone || input.address.trim().length < 8) {
    gate = 'BLOCK'
  } else if (criticalMissing.length > 0 || rows.some((r) => r.status === 'verify' && ['lot', 'apn', 'toc', 'chip', 'transit'].includes(r.id))) {
    gate = 'PROCEED_WITH_FLAGS'
  }

  return { gate, criticalMissing, rows }
}
