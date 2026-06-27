import { describe, it, expect } from 'vitest'
import { getActiveSections } from './RollEncounter'
import type { EncounterTable } from '@domain/entities/EncounterTable'

const table: EncounterTable = {
  id: 't1', ownerPoiId: 'p1', ownerRegionId: null, worldId: 'w1',
  creature: ['Goblin'], signOmen: [], loss: [], npc: ['A merchant'],
  discovery: [], treasure: [], customSections: [{ id: 'cs1', name: 'Weird', entries: ['Glitch'] }],
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
