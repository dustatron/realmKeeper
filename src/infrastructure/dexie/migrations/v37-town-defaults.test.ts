import { describe, it, expect } from 'vitest'
import { withTownDefaults } from './v37-town-defaults'

describe('withTownDefaults', () => {
  it('fills missing town fields with null, leaving existing fields intact', () => {
    const row = { id: 'm1', name: 'X', kind: 'image' } as Record<string, unknown>
    expect(withTownDefaults(row)).toMatchObject({
      id: 'm1', name: 'X', kind: 'image',
      townData: null, townPreset: null, townSeed: null, townWalled: null,
    })
  })

  it('does not clobber an already-populated town field', () => {
    const row = { id: 'm2', kind: 'town', townPreset: 'city' } as Record<string, unknown>
    expect(withTownDefaults(row).townPreset).toBe('city')
  })
})
