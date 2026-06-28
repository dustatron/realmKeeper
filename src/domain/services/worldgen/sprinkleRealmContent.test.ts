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
})
