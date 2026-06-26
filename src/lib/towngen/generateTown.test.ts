import { describe, it, expect } from 'vitest'
import { generateTown, type GenerateTownOpts } from './generateTown'
import type { TownAnchor } from './presets'
import { classifyFeature } from '~/lib/watabou/featureStyle'

const anchors: TownAnchor[] = [
  { poiId: 'p1', x: 200, y: 200, type: 'settlement' },
  { poiId: 'p2', x: 400, y: 300, type: 'building' },
  { poiId: 'p3', x: 300, y: 500, type: 'shrine' },
]
const base: GenerateTownOpts = { preset: 'village', seed: 'seed-xyz', width: 1000, height: 1000 }

function buildingFeatures(data: ReturnType<typeof generateTown>) {
  return data.features.filter((f) => f.properties.id === 'buildings')
}

describe('generateTown', () => {
  it('is deterministic for the same anchors + seed', () => {
    expect(generateTown(anchors, base)).toEqual(generateTown(anchors, base))
  })

  it('emits one building footprint per anchor, each carrying its poiId', () => {
    const b = buildingFeatures(generateTown(anchors, base))
    expect(b).toHaveLength(3)
    expect(b.map((f) => f.properties.poiId).sort()).toEqual(['p1', 'p2', 'p3'])
  })

  it('classifies every footprint as a building (no properties.id collision)', () => {
    for (const f of buildingFeatures(generateTown(anchors, base))) {
      expect(classifyFeature(f)).toBe('building')
    }
  })

  it('keeps all coordinates within the pixel canvas', () => {
    const data = generateTown(anchors, base)
    const flat: number[] = []
    const walk = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === 'number') { flat.push(c[0] as number, c[1] as number) }
      else if (Array.isArray(c)) c.forEach(walk)
    }
    data.features.forEach((f) => walk(f.geometry.coordinates))
    const xs = flat.filter((_, i) => i % 2 === 0)
    const ys = flat.filter((_, i) => i % 2 === 1)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...xs)).toBeLessThanOrEqual(1000)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(1000)
  })

  it('adds a wall for the city preset and omits it for village by default', () => {
    const wallsIn = (o: GenerateTownOpts) =>
      generateTown(anchors, o).features.some((f) => f.properties.id === 'walls')
    expect(wallsIn({ ...base, preset: 'village' })).toBe(false)
    expect(wallsIn({ ...base, preset: 'city' })).toBe(true)
  })

  it('honors an explicit walled override over the preset default', () => {
    const walls = generateTown(anchors, { ...base, preset: 'village', walled: true })
      .features.some((f) => f.properties.id === 'walls')
    expect(walls).toBe(true)
  })

  it('returns an earth-only town for zero anchors', () => {
    const data = generateTown([], base)
    expect(buildingFeatures(data)).toHaveLength(0)
    expect(data.features.every((f) => f.properties.id === 'earth')).toBe(true)
  })

  it('emits one road spoke per anchor', () => {
    const roads = generateTown(anchors, base).features.filter((f) => f.properties.id === 'roads')
    expect(roads).toHaveLength(3)
    expect(roads[0].geometry.type).toBe('LineString')
  })
})
