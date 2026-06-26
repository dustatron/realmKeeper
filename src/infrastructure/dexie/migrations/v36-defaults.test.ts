import { describe, it, expect } from 'vitest'
import { withHookIdDefault, withGameMapKindDefault } from './v36-defaults'

describe('v36 backfill defaults', () => {
  it('adds hookId: null when missing', () => {
    const row = { id: 'n1', title: 'x' } as Record<string, unknown>
    expect(withHookIdDefault(row).hookId).toBe(null)
  })

  it('preserves an existing hookId', () => {
    const row = { id: 'n1', hookId: 'h9' } as Record<string, unknown>
    expect(withHookIdDefault(row).hookId).toBe('h9')
  })

  it('defaults GameMap.kind to "image" when missing', () => {
    const map = { id: 'm1', imageUrl: 'u' } as Record<string, unknown>
    expect(withGameMapKindDefault(map).kind).toBe('image')
  })

  it('preserves an existing kind', () => {
    const map = { id: 'm1', kind: 'hex' } as Record<string, unknown>
    expect(withGameMapKindDefault(map).kind).toBe('hex')
  })
})
