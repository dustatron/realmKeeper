import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildHumanoidFlavor, buildCreatureNpc } from './npcFactory'
import { getMonsterDescription } from '~/lib/worldgen/compendium-utils'

describe('buildHumanoidFlavor', () => {
  it('is deterministic for the same seed', () => {
    const a = buildHumanoidFlavor(new SeededRandom('test-flavor'))
    const b = buildHumanoidFlavor(new SeededRandom('test-flavor'))
    expect(a).toEqual(b)
  })

  it('fills appearance, voice, traits[2], and motivation as non-empty strings', () => {
    const f = buildHumanoidFlavor(new SeededRandom('flavor-check'))
    expect(f.appearance.length).toBeGreaterThan(0)
    expect(f.voice.length).toBeGreaterThan(0)
    expect(f.traits).toHaveLength(2)
    expect(f.traits[0].length).toBeGreaterThan(0)
    expect(f.traits[1].length).toBeGreaterThan(0)
    expect(f.motivation.length).toBeGreaterThan(0)
  })
})

describe('buildCreatureNpc', () => {
  const baseInput = {
    worldId: 'w1',
    regionId: 'r1',
    poiId: 'p1',
    systemId: 'system-cairn-2e',
    name: 'Wolf',
  }

  it('with a known compendiumId: appearance = bestiary description, description starts with Activity:', () => {
    const compendiumId = 'cairn-monster-wolf'
    const npc = buildCreatureNpc({ ...baseInput, compendiumId, activity: 'hunting' }, new SeededRandom('wolf-test'))
    expect(npc.appearance).toBe(getMonsterDescription(compendiumId))
    expect(npc.appearance.length).toBeGreaterThan(0)
    expect(npc.description).toMatch(/^Activity:/)
    expect(npc.systemBlock).toBeDefined()
    expect(npc.disposition).toBe('hostile')
  })

  it('with compendiumId null: appearance is empty string, systemBlock from fallback', () => {
    const npc = buildCreatureNpc({ ...baseInput, compendiumId: null, depth: 1, dangerLevel: 'medium' }, new SeededRandom('null-test'))
    expect(npc.appearance).toBe('')
    expect(npc.systemBlock).toBeDefined()
    expect(npc.systemBlock.hp).toBeGreaterThan(0)
  })
})
