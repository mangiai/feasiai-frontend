import type { StructuredAddress } from '@/lib/structured-address'

/** City of Los Angeles feasibility parcels — ZIMAS only covers LA city limits. */
export const LA_CITY_DEFAULT = 'Los Angeles'
export const LA_STATE_DEFAULT = 'CA'

const UNIT_SUFFIX_PATTERN = /\s+(?:#|APT|APARTMENT|UNIT|STE|SUITE|FL|FLOOR)\s*[^,]+$/i
const DIRECTION_PATTERN = /\b(N|S|E|W|NE|NW|SE|SW)\b/g

export function withLaCityDefaults(parts: Partial<StructuredAddress>): StructuredAddress {
  return {
    number: parts.number?.trim() ?? '',
    direction: parts.direction?.trim().toUpperCase() ?? '',
    streetName: parts.streetName?.trim() ?? '',
    streetType: parts.streetType?.trim() ?? '',
    unit: parts.unit?.trim() ?? '',
    city: parts.city?.trim() || LA_CITY_DEFAULT,
    state: parts.state?.trim().toUpperCase() || LA_STATE_DEFAULT,
    zip: parts.zip?.trim() ?? '',
  }
}

/** Street line sent to ZIMAS (house + direction + name + suffix only). */
export function buildZimasStreetLine(parts: StructuredAddress): string {
  return sanitizeZimasSearchAddress(
    [parts.number, parts.direction, parts.streetName, parts.streetType]
      .map((p) => p?.trim())
      .filter(Boolean)
      .join(' '),
  )
}

export function hasMinAddressForZimas(parts: StructuredAddress): boolean {
  return Boolean(parts.number.trim() && parts.streetName.trim())
}

export function normalizeApnInput(value: string): string {
  return value.replace(/\D/g, '')
}

/** Shared-cache / project cache key for APN lookups. */
export function normalizeApnForZimasCache(apn: string | null | undefined): string {
  const digits = normalizeApnInput(apn ?? '')
  return digits ? `apn:${digits}` : ''
}

/**
 * Street-only address for ZIMAS scraper input.
 * Strips city/state/ZIP (comma segments), units, and extra whitespace.
 */
/** Trailing "Los Angeles CA 90032" without commas (autocomplete paste). */
const TRAILING_LA_LOCALITY_PATTERN =
  /\s+(?:los\s+angeles|la)(?:\s*,?\s*(?:ca|california))?(?:\s+\d{5}(?:-\d{4})?)?\s*$/i

export function sanitizeZimasSearchAddress(input: string | null | undefined): string {
  let value = (input ?? '').trim().replace(/\s+/g, ' ')
  if (!value) return ''

  value = value.split(',')[0]?.trim() ?? value
  value = value.replace(TRAILING_LA_LOCALITY_PATTERN, '').trim()
  value = value.replace(UNIT_SUFFIX_PATTERN, '').trim()
  return value.replace(/\s+/g, ' ').trim()
}

/** Stable cache key (street line, uppercase tokens). */
export function normalizeAddressForZimasCache(input: string | null | undefined): string {
  const street = sanitizeZimasSearchAddress(input)
  if (!street) return ''

  return street
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Cache match key ignoring direction (N/S/E/W) when ZIMAS canonicalizes differently. */
/** Collapse "1221 1 2" (from 1/2) so it can match "1221" lookups. */
function stripOptionalFractionalHouseToken(key: string): string {
  const tokens = key.split(/\s+/).filter(Boolean)
  if (
    tokens.length >= 3
    && /^\d{1,5}$/.test(tokens[0])
    && tokens[1] === '1'
    && ['2', '4', '8'].includes(tokens[2])
  ) {
    return [tokens[0], ...tokens.slice(3)].join(' ').trim()
  }
  return key
}

export function normalizeAddressForZimasCacheLoose(input: string | null | undefined): string {
  const strict = normalizeAddressForZimasCache(input)
  if (!strict) return ''
  const withoutDirection = strict.replace(DIRECTION_PATTERN, ' ').replace(/\s+/g, ' ').trim()
  return stripOptionalFractionalHouseToken(withoutDirection)
}

export function addressesMatchForZimas(
  projectAddress: string | null | undefined,
  lookupAddress: string | null | undefined,
): boolean {
  const strictA = normalizeAddressForZimasCache(projectAddress)
  const strictB = normalizeAddressForZimasCache(lookupAddress)
  if (strictA && strictB && strictA === strictB) return true

  const looseA = normalizeAddressForZimasCacheLoose(projectAddress)
  const looseB = normalizeAddressForZimasCacheLoose(lookupAddress)
  return Boolean(looseA && looseB && looseA === looseB)
}
