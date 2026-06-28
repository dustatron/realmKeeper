import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildRegionEncounterContent } from './regionEncounter'
import { buildPOI } from './buildPoi'
import { getMonstersBySystemId } from '@domain/data/compendium'

describe('buildRegionEncounterContent', () => {
  it('seeds creatures from region monsters + tier top-up; discovery/omen reference real sites', () => {
    const mon = getMonstersBySystemId('system-cairn-2e')[0]
    const lair = buildPOI({ regionId: 'r', name: 'The Sunken Grotto', type: 'dungeon' })
    const camp = buildPOI({ regionId: 'r', name: 'Wolf Camp', type: 'camp' })
    camp.monsterRefs = [{ id: mon.id, quantity: 2 }]
    const c = buildRegionEncounterContent({ region: { terrain: 'mountains' }, pois: [lair, camp], systemId: 'system-cairn-2e', rng: new SeededRandom('s') })
    // creature includes the seeded monster's name + topped up to >= 6
    expect(c.creature).toContain(mon.name)
    expect(c.creature.length).toBeGreaterThanOrEqual(6)
    // discovery references the real site
    expect(c.discovery.some((d) => d.includes('The Sunken Grotto'))).toBe(true)
    // at least one omen points to a real site
    expect(c.signOmen.some((o) => o.includes('The Sunken Grotto') || o.includes('Wolf Camp'))).toBe(true)
    // every category non-empty
    for (const k of ['creature','signOmen','loss','npc','discovery','treasure'] as const) expect(c[k].length).toBeGreaterThan(0)
  })
  it('guarantees creature.length >= 6 with no region monsters (empty pois)', () => {
    const c = buildRegionEncounterContent({ region: { terrain: 'swamp' }, pois: [], systemId: 'system-cairn-2e', rng: new SeededRandom('no-monsters') })
    expect(c.creature.length).toBeGreaterThanOrEqual(6)
    for (const k of ['creature','signOmen','loss','npc','discovery','treasure'] as const) expect(c[k].length).toBeGreaterThan(0)
  })
  it('is deterministic', () => {
    const a = buildRegionEncounterContent({ region: { terrain: 'forest' }, pois: [], systemId: 'system-shadowdark', rng: new SeededRandom('z') })
    const b = buildRegionEncounterContent({ region: { terrain: 'forest' }, pois: [], systemId: 'system-shadowdark', rng: new SeededRandom('z') })
    expect(a).toEqual(b)
  })
})
