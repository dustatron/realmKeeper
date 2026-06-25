import { describe, it, expect } from 'vitest'
import { buildPath } from './buildPath'

describe('buildPath', () => {
  it('applies defaults for optional fields', () => {
    const p = buildPath({ fromPoiId: 'a', toPoiId: 'b', name: 'Road', baseTravelWatches: 3 })
    expect(p.type).toBe('road')
    expect(p.terrain).toBe('plains')
    expect(p.direction).toBeNull()
    expect(p.hasDoor).toBe(false)
    expect(p.isLocked).toBe(false)
    expect(p.description).toBe('')
    expect(p.doorDescription).toBe('')
    expect(p.id.length).toBeGreaterThan(0)
    expect(p.createdAt).toBeGreaterThan(0)
    expect(p.updatedAt).toBe(p.createdAt)
  })

  it('keeps provided values', () => {
    const p = buildPath({
      fromPoiId: 'a',
      toPoiId: 'b',
      name: 'Mountain Pass',
      baseTravelWatches: 6,
      type: 'bridge',
      terrain: 'mountain',
    })
    expect(p.fromPoiId).toBe('a')
    expect(p.toPoiId).toBe('b')
    expect(p.name).toBe('Mountain Pass')
    expect(p.baseTravelWatches).toBe(6)
    expect(p.type).toBe('bridge')
    expect(p.terrain).toBe('mountain')
  })
})
