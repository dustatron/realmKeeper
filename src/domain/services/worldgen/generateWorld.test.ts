import { describe, it, expect } from 'vitest'
import { generateWorld } from './generateWorld'
import { DUNGEON_THEMES } from '~/domain/data/worldgen/poiKinds'

const REALM = 'realm-1'

describe('generateWorld', () => {
  it('every dungeon stub uses a valid DungeonTheme', () => {
    const { pois } = generateWorld(REALM, 'themes', { cols: 12, rows: 12, poiDensity: 'dense' })
    const dungeons = pois.filter((p) => p.type === 'dungeon')
    expect(dungeons.length).toBeGreaterThan(0)
    for (const d of dungeons) {
      expect(DUNGEON_THEMES).toContain(d.dungeonGenOptions!.theme)
    }
  })

  it('produces a hex map, regions, and POIs', () => {
    const { gameMap, regions, pois } = generateWorld(REALM, 'seed-a', { cols: 8, rows: 8 })
    expect(gameMap.kind).toBe('hex')
    expect(gameMap.ownerRealmId).toBe(REALM)
    expect(gameMap.hexCells).toHaveLength(64)
    expect(regions.length).toBeGreaterThan(0)
    expect(pois.length).toBeGreaterThan(0)
  })

  it('every POI links to a generated region, is placed on this map, and has a position', () => {
    const { gameMap, regions, pois } = generateWorld(REALM, 'seed-a', { cols: 8, rows: 8 })
    const regionIds = new Set(regions.map((r) => r.id))
    for (const p of pois) {
      expect(regionIds.has(p.regionId)).toBe(true)
      expect(p.mapRef).toBe(gameMap.id)
      expect(p.position).not.toBeNull()
    }
  })

  it('dungeon POIs are lazy stubs (no spatialDungeon, with dungeonGenOptions)', () => {
    const { pois } = generateWorld(REALM, 'seed-a', { cols: 12, rows: 12, poiDensity: 'dense' })
    const dungeons = pois.filter((p) => p.type === 'dungeon')
    for (const d of dungeons) {
      expect(d.spatialDungeon).toBeNull()
      expect(d.dungeonGenOptions).not.toBeNull()
    }
  })

  it('density scales POI count (dense > sparse)', () => {
    const sparse = generateWorld(REALM, 's', { cols: 12, rows: 12, poiDensity: 'sparse' })
    const dense = generateWorld(REALM, 's', { cols: 12, rows: 12, poiDensity: 'dense' })
    expect(dense.pois.length).toBeGreaterThan(sparse.pois.length)
  })

  it('is deterministic for a given seed (biomes + POI types)', () => {
    const a = generateWorld(REALM, 'fixed', { cols: 8, rows: 8 })
    const b = generateWorld(REALM, 'fixed', { cols: 8, rows: 8 })
    expect(a.gameMap.hexCells!.map((c) => c.biome)).toEqual(b.gameMap.hexCells!.map((c) => c.biome))
    expect(a.pois.map((p) => p.type)).toEqual(b.pois.map((p) => p.type))
  })
})
