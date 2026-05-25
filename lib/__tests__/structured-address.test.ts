import { describe, expect, it } from 'vitest'

import { composeStructuredAddress, parseStructuredAddress } from '../structured-address'

describe('composeStructuredAddress', () => {
  it('composes a full formatted address from structured parts', () => {
    expect(composeStructuredAddress({
      number: '1232',
      direction: 'N',
      streetName: 'Jefferson',
      streetType: 'St',
      unit: '4B',
      city: 'Los Angeles',
      state: 'ca',
      zip: '90026',
    })).toBe('1232 N Jefferson St #4B, Los Angeles, CA 90026')
  })

  it('does not emit a city-only address when the street line is empty', () => {
    expect(composeStructuredAddress({
      city: 'Pasadena',
      state: 'CA',
      zip: '91107',
    })).toBe('')
  })
})

describe('parseStructuredAddress', () => {
  it('parses a standard US address into structured parts', () => {
    expect(parseStructuredAddress('1232 N Jefferson St #4B, Los Angeles, CA 90026')).toEqual({
      number: '1232',
      direction: 'N',
      streetName: 'Jefferson',
      streetType: 'St',
      unit: '4B',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90026',
    })
  })

  it('parses ranged street numbers used by feasibility defaults', () => {
    expect(parseStructuredAddress('3686-3698 E Colorado Blvd, Pasadena, CA 91107')).toEqual({
      number: '3686-3698',
      direction: 'E',
      streetName: 'Colorado',
      streetType: 'Blvd',
      unit: '',
      city: 'Pasadena',
      state: 'CA',
      zip: '91107',
    })
  })

  it('preserves locality fallback while a user is editing only the street line', () => {
    expect(parseStructuredAddress('8815 Burke Dr', {
      city: 'Los Angeles',
      state: 'CA',
      zip: '90048',
    })).toEqual({
      number: '8815',
      direction: '',
      streetName: 'Burke',
      streetType: 'Dr',
      unit: '',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90048',
    })
  })

  it('clears stale street fields when only locality is present', () => {
    expect(parseStructuredAddress('Pasadena, CA 91107')).toEqual({
      number: '',
      direction: '',
      streetName: '',
      streetType: '',
      unit: '',
      city: 'Pasadena',
      state: 'CA',
      zip: '91107',
    })
  })
})