import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''

interface PlacePrediction {
  placePrediction: {
    placeId: string
    text: { text: string }
    structuredFormat?: {
      mainText: { text: string }
      secondaryText: { text: string }
    }
  }
}

interface PlaceDetailsResponse {
  addressComponents?: Array<{
    longText: string
    shortText: string
    types: string[]
  }>
  formattedAddress?: string
}

/**
 * GET /api/address-autocomplete?q=...
 *
 * Returns address suggestions from Google Places Autocomplete (New) API.
 * Restricted to US addresses only. API key stays server-side.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 3) {
    return NextResponse.json({ suggestions: [] })
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { suggestions: [], error: 'Google Places API key not configured' },
      { status: 200 },
    )
  }

  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        },
        body: JSON.stringify({
          input: query.trim(),
          includedPrimaryTypes: ['street_address', 'subpremise', 'premise'],
          includedRegionCodes: ['us'],
          languageCode: 'en',
        }),
      },
    )

    if (!response.ok) {
      console.error('[address-autocomplete] Places API error:', response.status)
      return NextResponse.json({ suggestions: [] })
    }

    const data = await response.json()
    const predictions: PlacePrediction[] = data.suggestions || []

    const suggestions = predictions.map((p) => ({
      placeId: p.placePrediction.placeId,
      description: p.placePrediction.text.text,
      mainText: p.placePrediction.structuredFormat?.mainText.text || '',
      secondaryText: p.placePrediction.structuredFormat?.secondaryText.text || '',
    }))

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[address-autocomplete] Error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}

/**
 * POST /api/address-autocomplete
 *
 * Resolves a Place ID to structured address components.
 * Used when user selects a suggestion to auto-fill form fields.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { placeId } = body

  if (!placeId || typeof placeId !== 'string') {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 })
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 200 })
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'addressComponents,formattedAddress',
        },
      },
    )

    if (!response.ok) {
      console.error('[address-autocomplete] Place details error:', response.status)
      return NextResponse.json({ error: 'Failed to resolve address' })
    }

    const place: PlaceDetailsResponse = await response.json()
    const components = place.addressComponents || []

    const find = (type: string) =>
      components.find((c) => c.types.includes(type))

    const streetNumber = find('street_number')?.longText || ''
    const route = find('route')?.longText || ''
    const subpremise = find('subpremise')?.longText || ''
    const locality = find('locality')?.longText || find('sublocality')?.longText || ''
    const state = find('administrative_area_level_1')?.shortText || ''
    const zip = find('postal_code')?.longText || ''

    // Parse direction and street type from route (e.g. "East Colorado Boulevard")
    const directionMap: Record<string, string> = {
      north: 'N', south: 'S', east: 'E', west: 'W',
      northeast: 'NE', northwest: 'NW', southeast: 'SE', southwest: 'SW',
    }
    const typeMap: Record<string, string> = {
      avenue: 'Ave', boulevard: 'Blvd', court: 'Ct', drive: 'Dr',
      freeway: 'Fwy', highway: 'Hwy', lane: 'Ln', parkway: 'Pkwy',
      place: 'Pl', road: 'Rd', street: 'St', terrace: 'Ter',
      trail: 'Trl', way: 'Way', circle: 'Cir', alley: 'Aly',
    }

    let direction = ''
    let streetName = route
    let streetType = ''

    // Extract direction prefix
    const routeWords = route.split(' ')
    if (routeWords.length > 1) {
      const firstWord = routeWords[0].toLowerCase()
      if (directionMap[firstWord]) {
        direction = directionMap[firstWord]
        routeWords.shift()
      }
    }

    // Extract street type suffix
    if (routeWords.length > 1) {
      const lastWord = routeWords[routeWords.length - 1].toLowerCase()
      if (typeMap[lastWord]) {
        streetType = typeMap[lastWord]
        routeWords.pop()
      }
    }

    streetName = routeWords.join(' ')

    return NextResponse.json({
      formatted: place.formattedAddress || '',
      number: streetNumber,
      direction,
      streetName,
      streetType,
      unit: subpremise,
      city: locality,
      state,
      zip,
    })
  } catch (err) {
    console.error('[address-autocomplete] Details error:', err)
    return NextResponse.json({ error: 'Failed to resolve address' })
  }
}
