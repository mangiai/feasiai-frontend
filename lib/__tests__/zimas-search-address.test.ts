import { describe, expect, it } from 'vitest'
import {
  addressesMatchForZimas,
  buildZimasStreetLine,
  hasMinAddressForZimas,
  LA_CITY_DEFAULT,
  LA_STATE_DEFAULT,
  normalizeAddressForZimasCache,
  sanitizeZimasSearchAddress,
  withLaCityDefaults,
} from '../zimas-search-address'

describe('zimas-search-address', () => {
  it('defaults city and state for LA feasibility parcels', () => {
    const parts = withLaCityDefaults({ number: '3723', streetName: 'Rosemead', streetType: 'Ave' })
    expect(parts.city).toBe(LA_CITY_DEFAULT)
    expect(parts.state).toBe(LA_STATE_DEFAULT)
  })

  it('builds street-only line for ZIMAS', () => {
    const line = buildZimasStreetLine(
      withLaCityDefaults({
        number: '3723',
        streetName: 'Rosemead',
        streetType: 'Ave',
      }),
    )
    expect(line).toBe('3723 Rosemead Ave')
    expect(line).not.toContain('Los Angeles')
  })

  it('requires number and street name only', () => {
    expect(hasMinAddressForZimas(withLaCityDefaults({ number: '1', streetName: 'Main' }))).toBe(true)
    expect(hasMinAddressForZimas(withLaCityDefaults({ streetName: 'Main' }))).toBe(false)
  })

  it('strips city, state, zip, and leading or trailing spaces', () => {
    expect(sanitizeZimasSearchAddress('  3723 Rosemead Ave, Los Angeles, CA 90032  ')).toBe('3723 Rosemead Ave')
    expect(normalizeAddressForZimasCache('3723 Rosemead Ave, Los Angeles, CA')).toBe('3723 ROSEMEAD AVE')
  })

  it('matches ZIMAS canonical address when direction differs', () => {
    expect(
      addressesMatchForZimas(
        '3723 Rosemead Ave, Los Angeles, CA',
        '3723 N ROSEMEAD AVE',
      ),
    ).toBe(true)
  })

  it('does not match unrelated streets', () => {
    expect(
      addressesMatchForZimas(
        '3723 Rosemead Ave, Los Angeles, CA',
        '1447 S Shenandoah St, Los Angeles, CA',
      ),
    ).toBe(false)
  })
})
