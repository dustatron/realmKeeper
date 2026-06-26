import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { cairnSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import type { POI } from '@domain/entities/POI'
import { buildSettlementBuildings } from './buildSettlement'

const settlement = (subtype: string): POI =>
  ({ id: 'sett-1', regionId: 'reg-1', name: 'Ashford', type: 'settlement', subtypeLabel: subtype }) as POI

describe('buildSettlementBuildings', () => {
  it('creates child building POIs parented to the settlement, each with a proprietor', () => {
    const { buildings, proprietors } = buildSettlementBuildings(settlement('Town'), 'w1', cairnSystemConfig, new SeededRandom('s'))
    expect(buildings.length).toBeGreaterThan(0)
    for (const b of buildings) {
      expect(b.type).toBe('building')
      expect(b.parentPoiId).toBe('sett-1')
      expect(b.subtypeLabel).toBeTruthy()
      expect(b.regionId).toBe('reg-1')
      // each building has exactly one proprietor living in it
      const occupant = proprietors.filter((n) => n.poiId === b.id)
      expect(occupant).toHaveLength(1)
      expect(occupant[0].worldId).toBe('w1')
      expect(occupant[0].want.length).toBeGreaterThan(0)
    }
    // distinct building types
    expect(new Set(buildings.map((b) => b.subtypeLabel)).size).toBe(buildings.length)
  })

  it('scales building count by settlement size (city > hamlet)', () => {
    const city = buildSettlementBuildings(settlement('City'), 'w1', cairnSystemConfig, new SeededRandom('s'))
    const hamlet = buildSettlementBuildings(settlement('Hamlet'), 'w1', cairnSystemConfig, new SeededRandom('s'))
    expect(city.buildings.length).toBeGreaterThan(hamlet.buildings.length)
  })

  it('is deterministic for a given seed', () => {
    const a = buildSettlementBuildings(settlement('Village'), 'w1', cairnSystemConfig, new SeededRandom('z'))
    const b = buildSettlementBuildings(settlement('Village'), 'w1', cairnSystemConfig, new SeededRandom('z'))
    expect(a.buildings.map((x) => x.subtypeLabel)).toEqual(b.buildings.map((x) => x.subtypeLabel))
  })
})
