import {
  addressesMatchForZimas,
  normalizeAddressForZimasCache,
  normalizeApnForZimasCache,
  sanitizeZimasSearchAddress,
} from './zimas-search-address'

type UnknownRecord = Record<string, unknown>

export interface CachedZimasLookupResult {
  success: true
  address: string
  target_address?: string
  fields: UnknownRecord
  raw_data?: unknown[]
  execution_time?: number
  /**
   * Storage paths in feasiai-outputs (shared zimas-cache/<address_key>/ prefix
   * when written by the server). Persisted with the project so the pipeline
   * can re-sign URLs without re-scraping.
   */
  screenshots?: string[]
  /**
   * Signed URLs for screenshots. NOT persisted — re-signed on read by the
   * server. Kept on the in-memory copy so the New Project page can render
   * previews immediately after lookup.
   */
  screenshot_urls?: string[]
}

export interface PersistedZimasProjectCache {
  cache_version: 1
  cached_for_address: string
  lookup_method?: 'address' | 'apn'
  locked_apn?: string | null
  lookup_result: CachedZimasLookupResult
  zone_code?: string | null
  zone_description?: string | null
  lot_area?: number | null
  user_assumptions?: {
    existing_building_plan?: 'demolish' | 'keep_rear_development' | 'partial_demolition'
    rso_replacement_policy?: 'proportional_removed_units' | 'full_if_any_demo' | 'auto_by_scope'
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const matched = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
    if (!matched) return null
    const parsed = Number.parseFloat(matched[0])
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function extractDetailValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function extractLotAreaFromLookup(lookupResult: CachedZimasLookupResult): number | null {
  const topLevel = asNumber(lookupResult.fields.lot_size)
  if (topLevel !== null && topLevel > 0) {
    return Math.round(topLevel)
  }

  const detailFields = isRecord(lookupResult.fields.detail_fields)
    ? lookupResult.fields.detail_fields
    : null

  if (!detailFields) return null

  for (const sectionKey of ['address_legal_information', 'address_legal', 'assessor_information', 'assessor']) {
    const section = detailFields[sectionKey]
    if (!isRecord(section)) continue
    for (const fieldKey of ['lot_parcel_area_calculated', 'lot_parcel_area', 'lot_parcel_area_sq_ft']) {
      const lotAreaValue = extractDetailValue(section[fieldKey])
      const parsed = isRecord(lotAreaValue) ? asNumber(lotAreaValue.value) : asNumber(lotAreaValue)
      if (parsed !== null && parsed > 0) {
        return Math.round(parsed)
      }
    }
  }

  if (!Array.isArray(lookupResult.raw_data)) return null

  for (const row of lookupResult.raw_data) {
    if (!isRecord(row)) continue
    const subtitle = (asString(row.Subtitle) ?? asString(row.subtitle) ?? '').toLowerCase()
    if (!subtitle.includes('lot') || !subtitle.includes('parcel')) continue
    if (!subtitle.includes('area') && !subtitle.includes('calculated')) continue
    const description = asString(row.Description) ?? asString(row.description)
    const parsed = asNumber(description)
    if (parsed !== null && parsed >= 100) {
      return Math.round(parsed)
    }
  }

  return null
}

/** @deprecated Use normalizeAddressForZimasCache from zimas-search-address */
export function normalizeAddressForCache(value: string | null | undefined): string {
  return normalizeAddressForZimasCache(value)
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const filtered = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
  return filtered.length > 0 ? filtered : undefined
}

export function parseCachedZimasLookupResult(value: unknown): CachedZimasLookupResult | null {
  if (!isRecord(value)) return null
  if (value.success !== true) return null

  const address = asString(value.address)
  const fields = isRecord(value.fields) ? value.fields : null

  if (!address || !fields) {
    return null
  }

  const screenshots = asStringArray(value.screenshots)
  const screenshotUrls = asStringArray(value.screenshot_urls)

  return {
    success: true,
    address,
    ...(asString(value.target_address) ? { target_address: asString(value.target_address) } : {}),
    fields,
    ...(Array.isArray(value.raw_data) ? { raw_data: value.raw_data } : {}),
    ...(typeof value.execution_time === 'number' && Number.isFinite(value.execution_time)
      ? { execution_time: value.execution_time }
      : {}),
    ...(screenshots ? { screenshots } : {}),
    ...(screenshotUrls ? { screenshot_urls: screenshotUrls } : {}),
  }
}

export function matchesCachedLookupAddress(
  lookupResult: unknown,
  projectAddress: string | null | undefined,
  zimasStreetLine?: string | null,
  lockedApn?: string | null,
): boolean {
  const parsed = parseCachedZimasLookupResult(lookupResult)
  if (!parsed) return false

  const apnKey = normalizeApnForZimasCache(lockedApn)
  if (apnKey) {
    const resultApn = normalizeApnForZimasCache(
      typeof parsed.fields?.apn === 'string' ? parsed.fields.apn : lockedApn,
    )
    if (resultApn && resultApn === apnKey) return true
  }

  const expectedStreet = sanitizeZimasSearchAddress(zimasStreetLine ?? projectAddress)
  if (!expectedStreet) return false

  return [parsed.address, parsed.target_address]
    .filter((candidate): candidate is string => Boolean(candidate))
    .some((candidate) => addressesMatchForZimas(expectedStreet, candidate))
}

export function buildPersistedZimasProjectCache(params: {
  lookupResult: unknown
  projectAddress: string | null | undefined
  /** Street-only line used for ZIMAS lookup (preferred for cache matching). */
  zimasStreetLine?: string | null
  lookupMethod?: 'address' | 'apn'
  lockedApn?: string | null
  fallbackLotArea?: unknown
  userAssumptions?: {
    existing_building_plan?: 'demolish' | 'keep_rear_development' | 'partial_demolition'
    rso_replacement_policy?: 'proportional_removed_units' | 'full_if_any_demo' | 'auto_by_scope'
  }
}): PersistedZimasProjectCache | null {
  const parsed = parseCachedZimasLookupResult(params.lookupResult)
  const streetLine = sanitizeZimasSearchAddress(params.zimasStreetLine ?? params.projectAddress)
  const apnKey = normalizeApnForZimasCache(params.lockedApn)
  const cachedForAddress = apnKey || normalizeAddressForZimasCache(streetLine)

  if (
    !parsed
    || !cachedForAddress
    || !matchesCachedLookupAddress(parsed, params.projectAddress, streetLine, params.lockedApn)
  ) {
    return null
  }

  const fallbackLotArea = asNumber(params.fallbackLotArea)
  const derivedLotArea = fallbackLotArea ?? extractLotAreaFromLookup(parsed)

  return {
    cache_version: 1,
    cached_for_address: cachedForAddress,
    lookup_method: params.lookupMethod,
    locked_apn: params.lockedApn ?? null,
    lookup_result: parsed,
    zone_code: asString(parsed.fields.zone) || null,
    zone_description: asString(parsed.fields.general_plan_land_use) || null,
    lot_area: derivedLotArea,
    user_assumptions: params.userAssumptions,
  }
}