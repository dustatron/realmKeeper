import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { sprinkleRealmContent } from './sprinkleRealmContent'
import { buildPOI } from './buildPoi'

function poi(type: any) { return buildPOI({ regionId: 'r1', name: type, type }) }

describe('sprinkleRealmContent densities', () => {
  it('off densities add nothing', () => {
    const pois = [poi('landmark'), poi('camp')]
    sprinkleRealmContent({ pois, systemId: 'system-cairn-2e', options: { treasureDensity: 'off', magicDensity: 'off', monsterDensity: 'off' }, rng: new SeededRandom('s') })
    expect(pois.every((p) => p.treasure.length === 0 && p.monsterRefs.length === 0)).toBe(true)
  })

  it('treasure density adds treasure to eligible POIs', () => {
    const pois = Array.from({ length: 10 }, () => poi('landmark'))
    sprinkleRealmContent({ pois, regions: [{ id: 'r1', terrain: 'mountains' } as any], systemId: 'system-cairn-2e', options: { treasureDensity: 'frequent', magicDensity: 'off', monsterDensity: 'off' }, rng: new SeededRandom('s') })
    expect(pois.some((p) => p.treasure.length > 0)).toBe(true)
  })

  it('every region gets >=1 treasure and >=1 notable when densities on', () => {
    const regions = [
      { id: 'rA', terrain: 'grasslands' } as any,
      { id: 'rB', terrain: 'mountains' } as any,
    ]
    const pois = [
      buildPOI({ regionId: 'rA', name: 'a1', type: 'landmark' }),
      buildPOI({ regionId: 'rB', name: 'b1', type: 'camp' }),
      buildPOI({ regionId: 'rB', name: 'dungeon', type: 'dungeon' }), // ineligible
      buildPOI({ regionId: 'rB', name: 'ruin', type: 'ruin' }), // ineligible
    ]
    sprinkleRealmContent({ pois, regions, systemId: 'system-cairn-2e', options: { treasureDensity: 'moderate', magicDensity: 'moderate', monsterDensity: 'off' }, rng: new SeededRandom('s') })
    for (const rid of ['rA', 'rB']) {
      const regionItems = pois.filter((p) => p.regionId === rid).flatMap((p) => p.treasure)
      expect(regionItems.length).toBeGreaterThan(0)
      expect(regionItems.some((t) => t.notable || t.isMagic)).toBe(true)
    }
    // dungeon and ruin POIs never seeded
    expect(pois.find((p) => p.type === 'dungeon')!.treasure.length).toBe(0)
    expect(pois.find((p) => p.type === 'ruin')!.treasure.length).toBe(0)
  })

  it('magic items are unique across regions (no duplicate compendiumId)', () => {
    const regions = [
      { id: 'r1', terrain: 'forest' } as any,
      { id: 'r2', terrain: 'mountains' } as any,
      { id: 'r3', terrain: 'grasslands' } as any,
    ]
    const pois = [
      ...Array.from({ length: 5 }, (_, i) => buildPOI({ regionId: 'r1', name: `r1-${i}`, type: 'landmark' })),
      ...Array.from({ length: 5 }, (_, i) => buildPOI({ regionId: 'r2', name: `r2-${i}`, type: 'shrine' })),
      ...Array.from({ length: 5 }, (_, i) => buildPOI({ regionId: 'r3', name: `r3-${i}`, type: 'camp' })),
    ]
    sprinkleRealmContent({ pois, regions, systemId: 'system-cairn-2e', options: { treasureDensity: 'moderate', magicDensity: 'frequent', monsterDensity: 'off' }, rng: new SeededRandom('magic-unique') })
    const allCompendiumIds = pois.flatMap((p) => p.treasure.filter((t) => t.isMagic).map((t) => t.compendiumId!))
    const uniqueIds = new Set(allCompendiumIds)
    expect(allCompendiumIds.length).toBeGreaterThan(0)
    expect(uniqueIds.size).toBe(allCompendiumIds.length)
  })

  it('places some finds on NPC inventories', () => {
    const regions = [{ id: 'rA', terrain: 'mountains' } as any]
    const pois = [buildPOI({ regionId: 'rA', name: 'a1', type: 'landmark' })]
    const npcs = Array.from({ length: 8 }, (_, i) => ({
      id: 'n' + i, worldId: 'w', name: 'n' + i, factionIds: [], regionId: 'rA', poiId: null,
      lifeStatus: 'alive', movementStatus: 'present', description: '', traits: [], motivation: '',
      appearance: '', voice: '', want: '', tags: [], imageUrl: null,
      systemBlock: { inventory: [] } as any, starred: false, createdAt: 1, updatedAt: 1,
    })) as any[]
    sprinkleRealmContent({ pois, npcs, regions, systemId: 'system-shadowdark', options: { treasureDensity: 'frequent', magicDensity: 'frequent', monsterDensity: 'off' }, rng: new SeededRandom('npc-seed') })
    const held = npcs.flatMap((n) => n.systemBlock.inventory)
    expect(held.length).toBeGreaterThan(0)
  })

  it('NPC-held magic compendiumId is unique across POIs and NPCs', () => {
    const regions = [{ id: 'rA', terrain: 'mountains' } as any]
    const pois = Array.from({ length: 5 }, (_, i) => buildPOI({ regionId: 'rA', name: 'p' + i, type: 'landmark' }))
    const npcs = Array.from({ length: 8 }, (_, i) => ({
      id: 'n' + i, worldId: 'w', name: 'n' + i, factionIds: [], regionId: 'rA', poiId: null,
      lifeStatus: 'alive', movementStatus: 'present', description: '', traits: [], motivation: '',
      appearance: '', voice: '', want: '', tags: [], imageUrl: null,
      systemBlock: { inventory: [] } as any, starred: false, createdAt: 1, updatedAt: 1,
    })) as any[]
    sprinkleRealmContent({ pois, npcs, regions, systemId: 'system-shadowdark', options: { treasureDensity: 'frequent', magicDensity: 'frequent', monsterDensity: 'off' }, rng: new SeededRandom('uniq-npc-seed') })
    const poiMagicIds = pois.flatMap((p) => p.treasure.filter((t) => t.isMagic).map((t) => t.compendiumId!))
    const npcMagicIds = npcs.flatMap((n) =>
      (n.systemBlock.inventory ?? [])
        .filter((item: any) => item.compendiumKind === 'magicItem' && item.compendiumId)
        .map((item: any) => item.compendiumId as string),
    )
    const all = [...poiMagicIds, ...npcMagicIds]
    expect(all.length).toBeGreaterThan(0)
    expect(new Set(all).size).toBe(all.length)
  })

  it('gives each non-party faction one notable great item at HQ or leader', () => {
    const hq = buildPOI({ regionId: 'rA', name: 'Hall', type: 'fortification' })
    const factions = [
      { id: 'f1', worldId: 'w', name: 'Iron Order', isParty: false, headquartersPoiId: hq.id, leaderNpcId: null } as any,
      { id: 'fp', worldId: 'w', name: 'The Party', isParty: true, headquartersPoiId: hq.id, leaderNpcId: null } as any,
    ]
    // No regions → per-region seeding skipped; only the faction pass adds notable items
    sprinkleRealmContent({ pois: [hq], factions, systemId: 'system-cairn-2e', options: { treasureDensity: 'off', magicDensity: 'moderate', monsterDensity: 'off' }, rng: new SeededRandom('fac') })
    const notable = hq.treasure.filter((t) => t.notable)
    expect(notable.length).toBeGreaterThanOrEqual(1) // at least the faction's great item
  })

  it('party faction never receives a faction great item', () => {
    const hq = buildPOI({ regionId: 'rA', name: 'Party HQ', type: 'fortification' })
    const factions = [
      { id: 'fp', worldId: 'w', name: 'The Party', isParty: true, headquartersPoiId: hq.id, leaderNpcId: null } as any,
    ]
    sprinkleRealmContent({ pois: [hq], factions, systemId: 'system-cairn-2e', options: { treasureDensity: 'off', magicDensity: 'moderate', monsterDensity: 'off' }, rng: new SeededRandom('party') })
    expect(hq.treasure.length).toBe(0)
  })

  it('faction with neither HQ nor leader is skipped', () => {
    const poi = buildPOI({ regionId: 'rA', name: 'Tavern', type: 'building' })
    const factions = [
      { id: 'f2', worldId: 'w', name: 'Ghosts', isParty: false, headquartersPoiId: null, leaderNpcId: null } as any,
    ]
    sprinkleRealmContent({ pois: [poi], factions, systemId: 'system-cairn-2e', options: { treasureDensity: 'off', magicDensity: 'moderate', monsterDensity: 'off' }, rng: new SeededRandom('skip') })
    expect(poi.treasure.length).toBe(0)
  })

  it('faction leader NPC gets notable item when no HQ POI', () => {
    const leader: any = {
      id: 'npc1', worldId: 'w', name: 'Baron', factionIds: [], regionId: 'rA', poiId: null,
      lifeStatus: 'alive', movementStatus: 'present', description: '', traits: [], motivation: '',
      appearance: '', voice: '', want: '', tags: [], imageUrl: null,
      systemBlock: { inventory: [] }, starred: false, createdAt: 1, updatedAt: 1,
    }
    const factions = [
      { id: 'f3', worldId: 'w', name: 'Barons', isParty: false, headquartersPoiId: null, leaderNpcId: 'npc1' } as any,
    ]
    sprinkleRealmContent({ pois: [], factions, npcs: [leader], systemId: 'system-cairn-2e', options: { treasureDensity: 'off', magicDensity: 'moderate', monsterDensity: 'off' }, rng: new SeededRandom('leader') })
    const notable = (leader.systemBlock.inventory ?? []).filter((i: any) => i.notable)
    expect(notable.length).toBeGreaterThanOrEqual(1)
  })

  it('monster seeding is deterministic regardless of magicDensity when no regions/factions', () => {
    const makePois = () => [poi('dungeon'), poi('camp'), poi('landmark'), poi('ruin'), poi('natural')]
    const base = { systemId: 'system-cairn-2e', options: { monsterDensity: 'moderate' as const, magicDensity: 'frequent' as const } }
    const run1 = makePois()
    sprinkleRealmContent({ pois: run1, ...base, rng: new SeededRandom('det-seed') })
    const run2 = makePois()
    sprinkleRealmContent({ pois: run2, ...base, rng: new SeededRandom('det-seed') })
    // Same seed + same inputs → same monster assignment
    expect(run1.map((p) => p.monsterRefs)).toEqual(run2.map((p) => p.monsterRefs))
    // No regions/factions → no treasure or magic
    expect(run1.every((p) => p.treasure.length === 0)).toBe(true)
  })

  it('faction magic item is unique vs region magic items (shared pool)', () => {
    const hq = buildPOI({ regionId: 'rA', name: 'Hall', type: 'fortification' })
    const regionPoi = buildPOI({ regionId: 'rA', name: 'Shrine', type: 'shrine' })
    const factions = [
      { id: 'f4', worldId: 'w', name: 'Knights', isParty: false, headquartersPoiId: hq.id, leaderNpcId: null } as any,
    ]
    sprinkleRealmContent({ pois: [hq, regionPoi], factions, regions: [{ id: 'rA', terrain: 'grasslands' } as any], systemId: 'system-cairn-2e', options: { treasureDensity: 'off', magicDensity: 'moderate', monsterDensity: 'off' }, rng: new SeededRandom('shared-pool') })
    const allMagicIds = [hq, regionPoi].flatMap((p) => p.treasure.filter((t) => t.isMagic).map((t) => t.compendiumId!))
    expect(new Set(allMagicIds).size).toBe(allMagicIds.length)
  })
})
