import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { seedRegionGear } from './seedTreasureHelpers'
import { buildPOI } from './buildPoi'
import { getEquipmentBySystemId } from '@domain/data/compendium'

function makePOIs(count: number) {
  return Array.from({ length: count }, (_, i) =>
    buildPOI({ regionId: 'r1', name: `poi-${i}`, type: 'landmark' })
  )
}

function makeNPCs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `npc-${i}`,
    worldId: 'w',
    name: `NPC ${i}`,
    factionIds: [],
    regionId: 'r1',
    poiId: null,
    lifeStatus: 'alive',
    movementStatus: 'present',
    description: '',
    traits: [],
    motivation: '',
    appearance: '',
    voice: '',
    want: '',
    tags: [],
    imageUrl: null,
    systemBlock: { inventory: [] as any[] },
    starred: false,
    createdAt: 1,
    updatedAt: 1,
  })) as any[]
}

describe('seedRegionGear', () => {
  it('is deterministic — same seed produces identical output', () => {
    const systemId = 'system-cairn-2e'
    const seed = 'gear-det-test'

    const pois1 = makePOIs(10)
    const npcs1 = makeNPCs(20)
    seedRegionGear(pois1, npcs1, systemId, new SeededRandom(seed))

    const pois2 = makePOIs(10)
    const npcs2 = makeNPCs(20)
    seedRegionGear(pois2, npcs2, systemId, new SeededRandom(seed))

    expect(pois1.map((p) => p.equipmentRefs)).toEqual(pois2.map((p) => p.equipmentRefs))
    // Exclude the per-item ULID `id` (newId() is time-based, not seeded).
    // The determinism check verifies the RNG picks — which compendium item, which NPC/POI.
    const stripId = (inv: any[]) => inv.map(({ id: _id, ...rest }) => rest)
    expect(npcs1.map((n) => stripId(n.systemBlock.inventory))).toEqual(
      npcs2.map((n) => stripId(n.systemBlock.inventory))
    )
  })

  it('seeds at least one NPC equipment item and at least one POI equipmentRef (system-cairn-2e)', () => {
    // Verify system-cairn-2e actually has equipment (otherwise skip with a clear message)
    const items = getEquipmentBySystemId('system-cairn-2e')
    if (items.length === 0) {
      console.warn('system-cairn-2e has no equipment — test skipped')
      return
    }

    const systemId = 'system-cairn-2e'
    const pois = makePOIs(20)
    const npcs = makeNPCs(20)
    seedRegionGear(pois, npcs, systemId, new SeededRandom('gear-presence'))

    const npcItems = npcs.flatMap((n) => n.systemBlock.inventory)
      .filter((item: any) => item.compendiumKind === 'equipment')
    const poiRefs = pois.flatMap((p) => p.equipmentRefs ?? [])

    expect(npcItems.length).toBeGreaterThan(0)
    expect(poiRefs.length).toBeGreaterThan(0)
  })
})
