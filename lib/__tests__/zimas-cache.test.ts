import { describe, expect, it } from 'vitest'

import { extractLotSizeFromZimasCache, extractLotSizeFromRawRows } from '../feasibility-checklist-summary'
import {
  buildPersistedZimasProjectCache,
  matchesCachedLookupAddress,
  normalizeAddressForCache,
  parseCachedZimasLookupResult,
} from '../zimas-cache'

const successfulLookup = {
  success: true as const,
  address: '330 N Normandie Ave, Los Angeles, CA 90004',
  fields: {
    zone: 'R3-1',
    general_plan_land_use: 'Medium Residential',
    detail_fields: {
      address_legal: {
        lot_parcel_area_calculated: { value: '6,499' },
      },
    },
  },
  raw_data: [],
  execution_time: 3.4,
}

describe('normalizeAddressForCache', () => {
  it('normalizes street-only (strips city/state/zip) for stable comparisons', () => {
    expect(normalizeAddressForCache(' 330 N. Normandie Ave, Los Angeles, CA 90004 ')).toBe(
      '330 N NORMANDIE AVE',
    )
  })
})

describe('parseCachedZimasLookupResult', () => {
  it('accepts successful lookup payloads with fields', () => {
    expect(parseCachedZimasLookupResult(successfulLookup)).toMatchObject({
      success: true,
      address: successfulLookup.address,
      fields: successfulLookup.fields,
    })
  })

  it('preserves screenshots and signed URLs so the pipeline can re-sign without re-scraping', () => {
    const lookupWithScreenshots = {
      ...successfulLookup,
      screenshots: [
        'zimas-cache/330_N_NORMANDIE_AVE_LOS_ANGELES_CA_90004/post_extract_map.png',
        'zimas-cache/330_N_NORMANDIE_AVE_LOS_ANGELES_CA_90004/post_extract_panel.png',
      ],
      screenshot_urls: ['https://signed.example/map.png', 'https://signed.example/panel.png'],
    }

    expect(parseCachedZimasLookupResult(lookupWithScreenshots)).toMatchObject({
      success: true,
      address: lookupWithScreenshots.address,
      screenshots: lookupWithScreenshots.screenshots,
      screenshot_urls: lookupWithScreenshots.screenshot_urls,
    })
  })

  it('rejects invalid lookup payloads', () => {
    expect(parseCachedZimasLookupResult({ success: true, address: 'x' })).toBeNull()
    expect(parseCachedZimasLookupResult({ success: false, address: successfulLookup.address, fields: {} })).toBeNull()
  })
})

describe('buildPersistedZimasProjectCache', () => {
  it('builds persisted project cache metadata for matching addresses', () => {
    expect(buildPersistedZimasProjectCache({
      lookupResult: successfulLookup,
      projectAddress: '330 N Normandie Ave, Los Angeles, CA 90004',
    })).toEqual({
      cache_version: 1,
      cached_for_address: '330 N NORMANDIE AVE',
      lookup_result: successfulLookup,
      zone_code: 'R3-1',
      zone_description: 'Medium Residential',
      lot_area: 6499,
    })
  })

  it('refuses to persist lookups that do not match the submitted address', () => {
    expect(buildPersistedZimasProjectCache({
      lookupResult: successfulLookup,
      projectAddress: '1447 S Shenandoah St, Los Angeles, CA 90035',
    })).toBeNull()
  })

  it('matches addresses using normalized street keys', () => {
    expect(matchesCachedLookupAddress(successfulLookup, '330 N. Normandie Ave Los Angeles CA 90004')).toBe(true)
  })

  it('reads lot area from top-level lot_size and address_legal_information', () => {
    const lookup = parseCachedZimasLookupResult({
      success: true,
      address: '3723 N ROSEMEAD AVE',
      fields: {
        zone: 'RD3-1',
        lot_size: 7125,
        detail_fields: {
          address_legal_information: {
            lot_parcel_area_calculated: { value: '7,125.0 (sq ft)' },
          },
        },
      },
      raw_data: [
        { Section: 'Address/Legal Information', Subtitle: 'Lot/Parcel Area (Calculated)', Description: '7,125.0 (sq ft)' },
      ],
    })
    expect(extractLotSizeFromZimasCache(lookup)).toBe('7125')
    expect(extractLotSizeFromRawRows(lookup?.raw_data)).toBe('7125')
    expect(
      buildPersistedZimasProjectCache({
        lookupResult: lookup!,
        projectAddress: '3723 Rosemead Ave, Los Angeles, CA',
        zimasStreetLine: '3723 Rosemead Ave',
      })?.lot_area,
    ).toBe(7125)
  })

  it('matches when ZIMAS returns a canonical street line without city', () => {
    const rosemeadLookup = {
      success: true as const,
      address: '3723 N ROSEMEAD AVE',
      fields: { zone: 'RD3-1' },
    }
    expect(
      buildPersistedZimasProjectCache({
        lookupResult: rosemeadLookup,
        projectAddress: '3723 Rosemead Ave, Los Angeles, CA',
        zimasStreetLine: '3723 Rosemead Ave',
      }),
    ).not.toBeNull()
  })
})