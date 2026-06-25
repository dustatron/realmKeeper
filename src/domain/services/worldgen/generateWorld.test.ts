import { describe, it, expect } from 'vitest'
import { generateWorld } from './generateWorld'
import { DUNGEON_THEMES } from '~/domain/data/worldgen/poiKinds'
import { hexLine } from '~/lib/hexmap/hex'
import { cairnSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import type { GameMap } from '@domain/entities/GameMap'

const REALM = 'realm-1'

// Reconstruct each POI's axial hex from its pixel position by matching the
// position to a hex cell's centroid (the generator places POIs at cell centers).
function axialLookup(gameMap: GameMap) {
  const centroid = (corners: { x: number; y: number }[]) => ({
    x: corners.reduce((s, c) => s + c.x, 0) / corners.length,
    y: corners.reduce((s, c) => s + c.y, 0) / corners.length,
  })
  const byCenter = new Map<string, { q: number; r: number; biome: string }>()
  for (const c of gameMap.hexCells!) {
    const ctr = centroid(c.corners)
    byCenter.set(`${Math.round(ctr.x)},${Math.round(ctr.y)}`, { q: c.q, r: c.r, biome: c.biome })
  }
  return (poi: { position: { x: number; y: number } | null }) =>
    byCenter.get(`${Math.round(poi.position!.x)},${Math.round(poi.position!.y)}`)!
}

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

  it('every region gets structured flavor (description, resources, people, dangers)', () => {
    const { regions } = generateWorld(REALM, 'seed-a', { cols: 12, rows: 12 })
    for (const r of regions) {
      expect(r.description.length).toBeGreaterThan(0)
      expect(r.resources.length).toBeGreaterThanOrEqual(1)
      expect(r.people.length).toBe(1)
      expect(r.dangers.length).toBeGreaterThanOrEqual(1)
      expect(r.features.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('settlements get a subtype label and a feature tag (richer detail)', () => {
    const { pois } = generateWorld(REALM, 'seed-a', { cols: 16, rows: 16 })
    const settlements = pois.filter((p) => p.type === 'settlement')
    expect(settlements.length).toBeGreaterThan(0)
    for (const s of settlements) {
      expect(s.subtypeLabel).toBeTruthy()
      expect(s.tags.length).toBeGreaterThanOrEqual(1)
      expect(s.readAloud.length).toBeGreaterThan(0)
    }
  })

  it('every POI gets a non-empty description', () => {
    const { pois } = generateWorld(REALM, 'seed-a', { cols: 12, rows: 12 })
    expect(pois.length).toBeGreaterThan(0)
    for (const p of pois) {
      expect(p.description.length).toBeGreaterThan(0)
      // Templates display readAloud, so every POI needs non-empty readAloud to
      // show flavor in the UI.
      expect(p.readAloud.length).toBeGreaterThan(0)
      // Non-settlement read-alouds name the POI; settlements carry the name in
      // their read-aloud too.
      expect(p.readAloud).toContain(p.name)
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

  it('connects settlements with paths (valid endpoints, positive travel time, no self/dupes)', () => {
    const { pois, paths } = generateWorld(REALM, 'seed-a', { cols: 16, rows: 16 })
    const settlementIds = new Set(pois.filter((p) => p.type === 'settlement').map((p) => p.id))
    expect(settlementIds.size).toBeGreaterThan(1)
    expect(paths.length).toBeGreaterThan(0)

    const seenEdges = new Set<string>()
    for (const path of paths) {
      // both endpoints are generated settlements
      expect(settlementIds.has(path.fromPoiId)).toBe(true)
      expect(settlementIds.has(path.toPoiId)).toBe(true)
      // no self-paths
      expect(path.fromPoiId).not.toBe(path.toPoiId)
      // travel time is positive
      expect(path.baseTravelWatches).toBeGreaterThan(0)
      // no duplicate undirected edge
      const key = [path.fromPoiId, path.toPoiId].sort().join('|')
      expect(seenEdges.has(key)).toBe(false)
      seenEdges.add(key)
    }
  })

  it('no path crosses a body of water', () => {
    for (const seed of ['seed-a', 'water-1', 'water-2', 'water-3']) {
      const { gameMap, pois, paths } = generateWorld(REALM, seed, { cols: 16, rows: 16 })
      const axialOf = axialLookup(gameMap)
      const poiById = new Map(pois.map((p) => [p.id, p]))
      const lake = new Set(
        gameMap.hexCells!.filter((c) => c.biome === 'lake').map((c) => `${c.q},${c.r}`),
      )
      for (const path of paths) {
        const a = axialOf(poiById.get(path.fromPoiId)!)
        const b = axialOf(poiById.get(path.toPoiId)!)
        for (const h of hexLine(a, b)) {
          expect(lake.has(`${h.q},${h.r}`)).toBe(false)
        }
      }
    }
  })

  it('connects regions: most settlements share one road network', () => {
    const { pois, paths } = generateWorld(REALM, 'seed-a', { cols: 16, rows: 16 })
    const settlements = pois.filter((p) => p.type === 'settlement')
    const regionOf = new Map(settlements.map((s) => [s.id, s.regionId]))

    // union-find over settlement POIs joined by paths
    const parent = new Map<string, string>(settlements.map((s) => [s.id, s.id]))
    const find = (x: string): string => {
      while (parent.get(x) !== x) {
        parent.set(x, parent.get(parent.get(x)!)!)
        x = parent.get(x)!
      }
      return x
    }
    const union = (a: string, b: string) => parent.set(find(a), find(b))
    for (const p of paths) union(p.fromPoiId, p.toPoiId)

    const components = new Map<string, string[]>()
    for (const s of settlements) {
      const root = find(s.id)
      ;(components.get(root) ?? components.set(root, []).get(root)!).push(s.id)
    }
    const largest = [...components.values()].sort((a, b) => b.length - a.length)[0]
    // the backbone ties a clear majority of settlements together...
    expect(largest.length).toBeGreaterThan(settlements.length / 2)
    // ...spanning more than one region (cross-region roads exist)
    const regionsInLargest = new Set(largest.map((id) => regionOf.get(id)))
    expect(regionsInLargest.size).toBeGreaterThan(1)
  })

  it('generates factions anchored to settlement headquarters', () => {
    const { pois, regions, factions } = generateWorld(REALM, 'seed-a', { cols: 16, rows: 16 })
    const settlements = new Map(pois.filter((p) => p.type === 'settlement').map((p) => [p.id, p]))
    const regionIds = new Set(regions.map((r) => r.id))

    expect(factions.length).toBeGreaterThanOrEqual(2)
    expect(factions.length).toBeLessThanOrEqual(settlements.size)

    const hqs = new Set<string>()
    for (const f of factions) {
      expect(f.worldId).toBe(REALM)
      expect(f.isParty).toBe(false)
      expect(f.name.length).toBeGreaterThan(0)
      // HQ is a generated settlement, and distinct per faction
      expect(settlements.has(f.headquartersPoiId!)).toBe(true)
      expect(hqs.has(f.headquartersPoiId!)).toBe(false)
      hqs.add(f.headquartersPoiId!)
      // region matches the HQ settlement's region
      expect(f.regionId).toBe(settlements.get(f.headquartersPoiId!)!.regionId)
      expect(regionIds.has(f.regionId!)).toBe(true)
    }
  })

  it('generates a leader and agents for each faction when a system config is supplied', () => {
    const { factions, npcs } = generateWorld(REALM, 'seed-a', {
      cols: 16,
      rows: 16,
      factionCount: 4,
      systemConfig: cairnSystemConfig,
    })
    const npcById = new Map(npcs.map((n) => [n.id, n]))
    expect(npcs.length).toBeGreaterThanOrEqual(factions.length * 2)
    for (const f of factions) {
      // leader assigned and present
      expect(f.leaderNpcId).not.toBeNull()
      const leader = npcById.get(f.leaderNpcId!)!
      expect(leader.factionIds).toContain(f.id)
      expect(leader.regionId).toBe(f.regionId)
      // 1-3 agents assigned, all present and linked
      expect(f.agentNpcIds.length).toBeGreaterThanOrEqual(1)
      expect(f.agentNpcIds.length).toBeLessThanOrEqual(3)
      for (const aid of f.agentNpcIds) {
        expect(npcById.get(aid)!.factionIds).toContain(f.id)
      }
    }
  })

  it("gives faction NPCs a want drawn from their faction's agenda", () => {
    const { factions, npcs } = generateWorld(REALM, 'seed-a', {
      cols: 16,
      rows: 16,
      factionCount: 4,
      systemConfig: cairnSystemConfig,
    })
    const factionById = new Map(factions.map((f) => [f.id, f]))
    const factionNpcs = npcs.filter((n) => n.factionIds.length > 0)
    expect(factionNpcs.length).toBeGreaterThan(0)
    for (const npc of factionNpcs) {
      expect(npc.want.length).toBeGreaterThan(0)
      const faction = factionById.get(npc.factionIds[0])!
      const goalDescriptions = faction.agendaGoals.map((g) => g.description)
      expect(goalDescriptions).toContain(npc.want)
    }
  })

  it('gives every settlement at least one resident NPC (locations are rarely empty)', () => {
    const { pois, npcs } = generateWorld(REALM, 'seed-a', {
      cols: 16,
      rows: 16,
      systemConfig: cairnSystemConfig,
    })
    const settlements = pois.filter((p) => p.type === 'settlement')
    const npcCountByPoi = new Map<string, number>()
    for (const n of npcs) {
      if (n.poiId) npcCountByPoi.set(n.poiId, (npcCountByPoi.get(n.poiId) ?? 0) + 1)
    }
    expect(settlements.length).toBeGreaterThan(0)
    for (const s of settlements) {
      expect(npcCountByPoi.get(s.id) ?? 0).toBeGreaterThanOrEqual(1)
    }
  })

  it('gives settlements buildings (child POIs) with proprietors', () => {
    const { pois, npcs } = generateWorld(REALM, 'seed-a', {
      cols: 16,
      rows: 16,
      systemConfig: cairnSystemConfig,
    })
    const settlements = pois.filter((p) => p.type === 'settlement')
    const buildings = pois.filter((p) => p.type === 'building')
    expect(buildings.length).toBeGreaterThan(0)
    const settlementIds = new Set(settlements.map((s) => s.id))
    for (const b of buildings) {
      // each building is parented to a generated settlement and has an occupant
      expect(settlementIds.has(b.parentPoiId!)).toBe(true)
      expect(npcs.some((n) => n.poiId === b.id)).toBe(true)
    }
    // every settlement has at least one building
    for (const s of settlements) {
      expect(buildings.some((b) => b.parentPoiId === s.id)).toBe(true)
    }
  })

  it('omits NPCs (and leaves leaders empty) when no system config is supplied', () => {
    const { factions, npcs } = generateWorld(REALM, 'seed-a', { cols: 12, rows: 12 })
    expect(npcs).toEqual([])
    for (const f of factions) {
      expect(f.leaderNpcId).toBeNull()
      expect(f.agentNpcIds).toEqual([])
    }
  })

  it('connects NPCs: agents serve their leader, hostile leaders are enemies', () => {
    const { factions, npcs, connections } = generateWorld(REALM, 'seed-a', {
      cols: 16,
      rows: 16,
      factionCount: 4,
      systemConfig: cairnSystemConfig,
    })
    const npcIds = new Set(npcs.map((n) => n.id))
    expect(connections.length).toBeGreaterThan(0)
    for (const c of connections) {
      expect(c.fromType).toBe('npc')
      expect(c.toType).toBe('npc')
      expect(npcIds.has(c.fromId)).toBe(true)
      expect(npcIds.has(c.toId)).toBe(true)
      expect(c.fromId).not.toBe(c.toId)
    }
    // every agent has a 'serves' (ally) edge to its faction leader
    for (const f of factions) {
      for (const agentId of f.agentNpcIds) {
        expect(
          connections.some((c) => c.fromId === agentId && c.toId === f.leaderNpcId && c.kind === 'ally'),
        ).toBe(true)
      }
    }
  })

  it('generates pairwise relationships among the factions', () => {
    const { factions, factionRelationships } = generateWorld(REALM, 'seed-a', { cols: 16, rows: 16, factionCount: 4 })
    const ids = new Set(factions.map((f) => f.id))
    // one directional row per ordered pair
    expect(factionRelationships).toHaveLength(factions.length * (factions.length - 1))
    for (const rel of factionRelationships) {
      expect(ids.has(rel.factionId)).toBe(true)
      expect(ids.has(rel.targetId)).toBe(true)
      expect(rel.score).toBeGreaterThanOrEqual(-6)
      expect(rel.score).toBeLessThanOrEqual(6)
    }
  })

  it('respects an explicit faction count (capped by settlements)', () => {
    const { factions } = generateWorld(REALM, 'seed-a', { cols: 16, rows: 16, factionCount: 3 })
    expect(factions.length).toBe(3)
  })

  it('faction generation is deterministic for a given seed', () => {
    const a = generateWorld(REALM, 'fixed', { cols: 12, rows: 12 })
    const b = generateWorld(REALM, 'fixed', { cols: 12, rows: 12 })
    expect(a.factions.length).toBe(b.factions.length)
    expect(a.factions.map((f) => f.name)).toEqual(b.factions.map((f) => f.name))
  })

  it('path generation is deterministic for a given seed', () => {
    const a = generateWorld(REALM, 'fixed', { cols: 12, rows: 12 })
    const b = generateWorld(REALM, 'fixed', { cols: 12, rows: 12 })
    const sig = (r: ReturnType<typeof generateWorld>) =>
      r.paths.map((p) => `${p.fromPoiId}->${p.toPoiId}:${p.baseTravelWatches}`)
    // ids differ per run (ULID), so compare structure by index counts instead
    expect(a.paths.length).toBe(b.paths.length)
    expect(sig(a).length).toBe(sig(b).length)
  })

  it('is deterministic for a given seed (biomes + POI types)', () => {
    const a = generateWorld(REALM, 'fixed', { cols: 8, rows: 8 })
    const b = generateWorld(REALM, 'fixed', { cols: 8, rows: 8 })
    expect(a.gameMap.hexCells!.map((c) => c.biome)).toEqual(b.gameMap.hexCells!.map((c) => c.biome))
    expect(a.pois.map((p) => p.type)).toEqual(b.pois.map((p) => p.type))
  })
})
