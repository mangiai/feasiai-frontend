import { describe, it, expect } from 'vitest'
import { isZimasHostUrl, parseAddressFromZimasUrl } from '../zimas-url'

describe('zimas-url', () => {
  it('detects ZIMAS host', () => {
    expect(isZimasHostUrl('https://zimas.lacity.org/')).toBe(true)
    expect(isZimasHostUrl('https://example.com')).toBe(false)
  })

  it('parses address from query string when present', () => {
    const addr = parseAddressFromZimasUrl(
      'https://zimas.lacity.org/?address=1256%20S%20Elden%20Ave%2C%20Los%20Angeles%2C%20CA',
    )
    expect(addr).toContain('1256')
    expect(addr).toContain('Elden')
  })

  it('returns null for bare ZIMAS home URL', () => {
    expect(parseAddressFromZimasUrl('https://zimas.lacity.org/')).toBeNull()
  })
})
