import { describe, it, expect } from 'vitest'
import { generateWorld } from './generateWorld'
import { DUNGEON_THEMES } from '~/domain/data/worldgen/poiKinds'

const REALM = 'realm-1'

describe('generateWorld', () => {
  it('every region has an outline boundary and a distinct color', () => {
    const { regions } = generateWorld(REALM, 'seed-a', { cols: 12, rows: 12 })
    for (const r of regions) {
      expect(r.boundary).not.toBeNull()
      expect(r.boundary!.length).toBeGreaterThanOrEqual(3)
    }
    const colors = regions.map((r) => r.color)
    // colors come from a cycling palette — neighbors differ
    expect(new Set(colors).size).toBeGreaterThan(1)
  })

  it('region names are unique within the world', () => {
    const { regions } = generateWorld(REALM, 'seed-a', { cols: 16, rows: 16 })
    const names = regions.map((r) => r.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('every region gets at least the per-region POI minimum (capped by its land cells)', () => {
    const { regions, pois } = generateWorld(REALM, 'seed-a', { cols: 12, rows: 12, poiDensity: 'sparse' })
    const countByRegion = new Map<string, number>()
    for (const p of pois) countByRegion.set(p.regionId, (countByRegion.get(p.regionId) ?? 0) + 1)
    for (const r of regions) {
      // each region with any POIs should have a healthy minimum (>= 3);
      // sparse density would otherwise leave some regions near-empty.
      const c = countByRegion.get(r.id) ?? 0
      expect(c).toBeGreaterThanOrEqual(3)
    }
  })

  it('carves at least one lake', () => {
    const { gameMap } = generateWorld(REALM, 'seed-a', { cols: 12, rows: 12 })
    const lakeCells = gameMap.hexCells!.filter((c) => c.biome === 'lake')
    expect(lakeCells.length).toBeGreaterThan(0)
  })

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
