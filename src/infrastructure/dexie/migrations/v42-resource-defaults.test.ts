import { describe, it, expect } from 'vitest'
import { withDefiningResourceDefault } from './v42-resource-defaults'

describe('withDefiningResourceDefault', () => {
  it('adds definingResource: null when missing', () => {
    const region = { id: 'r1', name: 'Vale' } as Record<string, unknown>
    expect(withDefiningResourceDefault(region).definingResource).toBe(null)
  })

  it('preserves an existing definingResource value', () => {
    const region = { id: 'r1', definingResource: 'iron' } as Record<string, unknown>
    expect(withDefiningResourceDefault(region).definingResource).toBe('iron')
  })

  it('does not mutate the input row', () => {
    const region = { id: 'r1' } as Record<string, unknown>
    withDefiningResourceDefault(region)
    expect('definingResource' in region).toBe(false)
  })
})
