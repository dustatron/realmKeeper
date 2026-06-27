import { describe, it, expect } from 'vitest'
import {
  rollCascade, rerollEntry, rerollReaction, rerollNpc,
  type CascadeSection, type CascadeEffects,
} from './encounterCascade'
import type { NPC } from '@domain/entities/NPC'

const sections: CascadeSection[] = [
  { category: 'creature', label: 'Creature', entries: ['Goblin', 'Wolf'], isCustom: false },
  { category: 'npc', label: 'NPC', entries: ['A merchant'], isCustom: false },
  { category: 'discovery', label: 'Discovery', entries: ['A locked chest'], isCustom: false },
]

const fakeNpc = { id: 'npc-1', name: 'Test NPC' } as unknown as NPC

function fx(over: Partial<CascadeEffects> = {}): CascadeEffects {
  return {
    rollDie: (sides) => sides,                                   // always max
    rollReaction: () => ({ roll: 7, disposition: 'curious' }),
    generateNpc: async () => fakeNpc,
    matchMonster: () => ({ compendiumId: 'mon-1', name: 'Goblin' }),
    now: () => 123,
    ...over,
  }
}

describe('rollCascade', () => {
  it('rolls master, then an entry, with timestamp', async () => {
    const r = await rollCascade(sections, fx({ rollDie: () => 1 }))
    expect(r.masterRoll).toBe(1)
    expect(r.category).toBe('creature')
    expect(r.entryText).toBe('Goblin')   // rollDie=1 → index 0
    expect(r.rolledAt).toBe(123)
  })

  it('enriches creature with reaction + monster match', async () => {
    const r = await rollCascade(sections, fx({ rollDie: () => 1 }))
    expect(r.reaction).toBe('curious')
    expect(r.reactionRoll).toBe(7)
    expect(r.monsterMatch).toEqual({ compendiumId: 'mon-1', name: 'Goblin' })
    expect(r.npc).toBeUndefined()
  })

  it('enriches npc with reaction + generated npc + null savedId', async () => {
    // master roll lands on section index 2 (npc), entry index 1 → clamp via entries len 1
    const r = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 2 : 1) }))
    expect(r.category).toBe('npc')
    expect(r.npc).toBe(fakeNpc)
    expect(r.npcSavedId).toBeNull()
    expect(r.reaction).toBe('curious')
    expect(r.monsterMatch).toBeUndefined()
  })

  it('leaves other categories as plain text (no reaction/npc/monster)', async () => {
    const r = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 3 : 1) }))
    expect(r.category).toBe('discovery')
    expect(r.reaction).toBeUndefined()
    expect(r.npc).toBeUndefined()
    expect(r.monsterMatch).toBeUndefined()
  })
})

describe('reroll slices', () => {
  it('rerollEntry keeps category and preserves an existing reaction', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: () => 1 }))  // creature, curious
    let reactionCalls = 0
    const r = await rerollEntry(prev, sections, fx({
      rollDie: () => 2,                                           // entry index 1 → 'Wolf'
      rollReaction: () => { reactionCalls++; return { roll: 2, disposition: 'hostile' } },
    }))
    expect(r.category).toBe('creature')
    expect(r.entryText).toBe('Wolf')
    expect(r.reaction).toBe('curious')                           // preserved
    expect(reactionCalls).toBe(0)
  })

  it('rerollReaction changes only the reaction', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: () => 1 }))
    const r = rerollReaction(prev, fx({ rollReaction: () => ({ roll: 12, disposition: 'helpful' }) }))
    expect(r.reaction).toBe('helpful')
    expect(r.entryText).toBe(prev.entryText)
  })

  it('rerollNpc regenerates the npc and resets savedId', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 2 : 1) }))
    const other = { id: 'npc-2', name: 'Other' } as unknown as NPC
    const r = await rerollNpc({ ...prev, npcSavedId: 'saved-x' }, fx({ generateNpc: async () => other }))
    expect(r.npc).toBe(other)
    expect(r.npcSavedId).toBeNull()
  })
})
