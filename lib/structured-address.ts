export interface StructuredAddress {
  number: string
  direction: string
  streetName: string
  streetType: string
  unit: string
  city: string
  state: string
  zip: string
}

export const ADDRESS_DIRECTIONS = ['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW'] as const
export const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Dr', 'Rd', 'Ln', 'Way', 'Ct', 'Pl', 'Ter', 'Pkwy', 'Cir'] as const

const EMPTY_ADDRESS: StructuredAddress = {
  number: '',
  direction: '',
  streetName: '',
  streetType: '',
  unit: '',
  city: '',
  state: '',
  zip: '',
}

const DIRECTION_SET = new Set<string>(ADDRESS_DIRECTIONS)
const STREET_TYPE_ALIASES = new Map<string, string>([
  ['ST', 'St'],
  ['STREET', 'St'],
  ['AVE', 'Ave'],
  ['AVENUE', 'Ave'],
  ['BLVD', 'Blvd'],
  ['BOULEVARD', 'Blvd'],
  ['DR', 'Dr'],
  ['DRIVE', 'Dr'],
  ['RD', 'Rd'],
  ['ROAD', 'Rd'],
  ['LN', 'Ln'],
  ['LANE', 'Ln'],
  ['WAY', 'Way'],
  ['CT', 'Ct'],
  ['COURT', 'Ct'],
  ['PL', 'Pl'],
  ['PLACE', 'Pl'],
  ['TER', 'Ter'],
  ['TERRACE', 'Ter'],
  ['PKWY', 'Pkwy'],
  ['PARKWAY', 'Pkwy'],
  ['CIR', 'Cir'],
  ['CIRCLE', 'Cir'],
])

const UNIT_SUFFIX_PATTERN = /\s+(?:#|APT|APARTMENT|UNIT|STE|SUITE|FL|FLOOR)\s*([^,]+)\s*$/i
const STATE_ZIP_PATTERN = /^([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/
const CITY_STATE_ZIP_PATTERN = /^(.+?)(?:,\s*|\s+)([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?$/
const CITY_ZIP_PATTERN = /^(.+?)\s+(\d{5}(?:-\d{4})?)$/

function looksLikeLocalityOnly(segments: string[]): boolean {
  const [first, second] = segments

  if (!first || /\d/.test(first)) {
    return false
  }

  if (segments.length === 2) {
    return Boolean(second?.trim().match(STATE_ZIP_PATTERN))
  }

  if (segments.length >= 3) {
    return Boolean(second?.trim().match(/^[A-Za-z]{2}$/))
  }

  return false
}

function normalizeStreetType(value: string): string {
  const cleaned = value.trim().replace(/\.$/, '')
  if (!cleaned) return ''
  return STREET_TYPE_ALIASES.get(cleaned.toUpperCase()) || cleaned
}

function parseStreetLine(line1: string, allowNumberlessStreet: boolean): Pick<StructuredAddress, 'number' | 'direction' | 'streetName' | 'streetType' | 'unit'> {
  const trimmed = line1.trim()
  if (!trimmed) {
    return {
      number: '',
      direction: '',
      streetName: '',
      streetType: '',
      unit: '',
    }
  }

  let working = trimmed
  let unit = ''

  const unitMatch = working.match(UNIT_SUFFIX_PATTERN)
  if (unitMatch) {
    unit = unitMatch[1]?.trim() || ''
    working = working.slice(0, unitMatch.index).trim()
  }

  const tokens = working.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return {
      number: '',
      direction: '',
      streetName: '',
      streetType: '',
      unit,
    }
  }

  let number = ''
  let direction = ''
  let streetType = ''

  if (/\d/.test(tokens[0])) {
    number = tokens.shift() || ''
  } else if (!allowNumberlessStreet) {
    return {
      number: '',
      direction: '',
      streetName: '',
      streetType: '',
      unit,
    }
  }

  if (tokens.length > 0 && DIRECTION_SET.has(tokens[0].toUpperCase())) {
    direction = tokens.shift()!.toUpperCase()
  }

  if (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1]
    const normalizedStreetType = normalizeStreetType(lastToken)
    if (normalizedStreetType && STREET_TYPE_ALIASES.has(lastToken.trim().replace(/\.$/, '').toUpperCase())) {
      streetType = normalizedStreetType
      tokens.pop()
    }
  }

  return {
    number,
    direction,
    streetName: tokens.join(' '),
    streetType,
    unit,
  }
}

function parseLocalitySegments(
  rawSegments: string[],
  fallback: Pick<StructuredAddress, 'city' | 'state' | 'zip'>,
): Pick<StructuredAddress, 'city' | 'state' | 'zip'> {
  const segments = rawSegments.map((segment) => segment.trim()).filter(Boolean)
  if (segments.length === 0) {
    return {
      city: fallback.city.trim(),
      state: fallback.state.trim().toUpperCase(),
      zip: fallback.zip.trim(),
    }
  }

  let city = fallback.city.trim()
  let state = fallback.state.trim().toUpperCase()
  let zip = ''

  if (segments.length >= 2) {
    city = segments[0]
    const stateZipMatch = segments.slice(1).join(' ').match(STATE_ZIP_PATTERN)
    if (stateZipMatch) {
      state = stateZipMatch[1].toUpperCase()
      zip = stateZipMatch[2] || ''
    }

    return { city, state, zip }
  }

  const locality = segments[0]
  const stateZipMatch = locality.match(STATE_ZIP_PATTERN)
  if (stateZipMatch) {
    return {
      city,
      state: stateZipMatch[1].toUpperCase(),
      zip: stateZipMatch[2] || '',
    }
  }

  const cityStateZipMatch = locality.match(CITY_STATE_ZIP_PATTERN)
  if (cityStateZipMatch) {
    return {
      city: cityStateZipMatch[1].trim(),
      state: cityStateZipMatch[2].toUpperCase(),
      zip: cityStateZipMatch[3] || '',
    }
  }

  const cityZipMatch = locality.match(CITY_ZIP_PATTERN)
  if (cityZipMatch) {
    return {
      city: cityZipMatch[1].trim(),
      state,
      zip: cityZipMatch[2],
    }
  }

  return { city: locality, state, zip }
}

export function composeStructuredAddress(parts: Partial<StructuredAddress>): string {
  const line1 = [
    parts.number?.trim(),
    parts.direction?.trim().toUpperCase(),
    parts.streetName?.trim(),
    parts.streetType?.trim(),
  ].filter(Boolean).join(' ')

  if (!line1) {
    return ''
  }

  const withUnit = parts.unit?.trim() ? `${line1} #${parts.unit.trim()}` : line1
  const city = parts.city?.trim()
  const state = parts.state?.trim().toUpperCase()
  const zip = parts.zip?.trim()
  const cityState = [city, state].filter(Boolean).join(', ')
  const tail = [cityState, zip].filter(Boolean).join(' ')

  return [withUnit, tail].filter(Boolean).join(', ')
}

export function parseStructuredAddress(
  value: string,
  fallback: Partial<StructuredAddress> = {},
): StructuredAddress {
  const trimmed = value.trim()
  if (!trimmed) {
    return { ...EMPTY_ADDRESS }
  }

  const segments = trimmed.split(',').map((segment) => segment.trim()).filter(Boolean)

  if (looksLikeLocalityOnly(segments)) {
    return {
      ...EMPTY_ADDRESS,
      ...parseLocalitySegments(segments, {
        city: fallback.city || '',
        state: fallback.state || '',
        zip: fallback.zip || '',
      }),
    }
  }

  const line1 = segments[0] || ''
  const localitySegments = segments.slice(1)

  return {
    ...parseStreetLine(line1, localitySegments.length === 0),
    ...parseLocalitySegments(localitySegments, {
      city: fallback.city || '',
      state: fallback.state || '',
      zip: fallback.zip || '',
    }),
  }
}