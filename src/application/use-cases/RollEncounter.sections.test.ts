import { describe, it, expect } from 'vitest'
import { getActiveSections } from './RollEncounter'
import type { EncounterTable } from '@domain/entities/EncounterTable'

const table: EncounterTable = {
  id: 't1', ownerPoiId: 'p1', ownerRegionId: null, worldId: 'w1',
  creature: ['Goblin'], signOmen: [], areaEffect: [], loss: [], npc: ['A merchant'],
  treasure: [], customSections: [{ id: 'cs1', name: 'Weird', entries: ['Glitch'] }],
  disabledCategories: ['treasure'], lastResult: null, createdAt: 0, updatedAt: 0,
}

describe('getActiveSections category metadata', () => {
  it('tags each built-in section with its category key', () => {
    const sections = getActiveSections(table)
    const npc = sections.find((s) => s.label === 'NPC')
    expect(npc?.category).toBe('npc')
    expect(npc?.isCustom).toBe(false)
  })

  it('tags custom sections with their id and isCustom=true', () => {
    const custom = getActiveSections(table).find((s) => s.label === 'Weird')
    expect(custom?.category).toBe('cs1')
    expect(custom?.isCustom).toBe(true)
  })

  it('omits disabled categories', () => {
    expect(getActiveSections(table).some((s) => s.category === 'treasure')).toBe(false)
  })
})

describe('getActiveSections terrain/locale section', () => {
  it('adds no terrain section without context', () => {
    expect(getActiveSections(table).some((s) => s.category === 'terrain-flavor')).toBe(false)
  })

  it('appends a biome section for a known terrain, last in order', () => {
    const sections = getActiveSections(table, { terrain: 'swamp' })
    const terrain = sections.find((s) => s.category === 'terrain-flavor')
    expect(terrain?.label).toBe('Swamp')
    expect(terrain?.isCustom).toBe(true)
    expect(terrain!.entries.length).toBeGreaterThan(0)
    expect(sections[sections.length - 1]).toBe(terrain)
  })

  it('prefers the town-street section for settlement POIs over terrain', () => {
    const terrain = getActiveSections(table, { terrain: 'swamp', poiType: 'settlement' })
      .find((s) => s.category === 'terrain-flavor')
    expect(terrain?.label).toBe('Town Street')
  })

  it('adds nothing for an unmapped terrain', () => {
    expect(getActiveSections(table, { terrain: 'other' }).some((s) => s.category === 'terrain-flavor')).toBe(false)
  })
})
