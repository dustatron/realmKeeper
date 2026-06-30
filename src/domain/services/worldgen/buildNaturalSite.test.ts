import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildNaturalSite } from './buildNaturalSite'
import { poiKindToType } from '@domain/data/worldgen/poiKinds'
import { NATURAL_SITE_NAMES, NATURAL_SITE_HAZARDS } from '@domain/data/worldgen/naturalSites.tables'

const moods = NATURAL_SITE_HAZARDS.map((h) => h.mood)
const troubles = NATURAL_SITE_HAZARDS.map((h) => h.trouble)

describe('buildNaturalSite', () => {
  it('produces a POI of type natural', () => {
    const poi = buildNaturalSite({ regionId: 'region-1', rng: new SeededRandom('seed-a') })
    expect(poi.type).toBe('natural')
  })

  it('is deterministic per seed', () => {
    const a = buildNaturalSite({ regionId: 'region-1', rng: new SeededRandom('seed-x') })
    const b = buildNaturalSite({ regionId: 'region-1', rng: new SeededRandom('seed-x') })
    expect(a.name).toBe(b.name)
    expect(a.mood).toBe(b.mood)
    expect(a.trouble).toBe(b.trouble)
    expect(a.description).toBe(b.description)
  })

  it('different seeds can yield different identities', () => {
    const names = new Set(
      ['s1', 's2', 's3', 's4', 's5', 's6'].map(
        (s) => buildNaturalSite({ regionId: 'r', rng: new SeededRandom(s) }).name,
      ),
    )
    expect(names.size).toBeGreaterThan(1)
  })

  it('draws name and mood/trouble from the tables', () => {
    const poi = buildNaturalSite({ regionId: 'region-1', rng: new SeededRandom('seed-tables') })
    expect(NATURAL_SITE_NAMES).toContain(poi.name)
    expect(moods).toContain(poi.mood)
    expect(troubles).toContain(poi.trouble)
  })

  it('tags the site as a natural-site', () => {
    const poi = buildNaturalSite({ regionId: 'region-1', rng: new SeededRandom('seed-tag') })
    expect(poi.tags).toContain('natural-site')
  })

  it('records a hosted resource on trade.produces with empty needs', () => {
    const poi = buildNaturalSite({
      regionId: 'region-1',
      rng: new SeededRandom('seed-resource'),
      hostedResource: 'iron ore',
    })
    expect(poi.trade).toEqual({ produces: 'iron ore', needs: [] })
    expect(poi.description).toContain('iron ore')
  })

  it('has null trade when no hosted resource is given', () => {
    const poi = buildNaturalSite({ regionId: 'region-1', rng: new SeededRandom('seed-noresource') })
    expect(poi.trade).toBeNull()
  })

  it('respects an explicit position and mapRef', () => {
    const poi = buildNaturalSite({
      regionId: 'region-1',
      rng: new SeededRandom('seed-pos'),
      position: { x: 3, y: 7 },
      mapRef: 'map-1',
    })
    expect(poi.position).toEqual({ x: 3, y: 7 })
    expect(poi.mapRef).toBe('map-1')
  })
})

describe('poiKindToType', () => {
  it('maps natural_site to the natural POI type', () => {
    expect(poiKindToType('natural_site')).toBe('natural')
  })
})
