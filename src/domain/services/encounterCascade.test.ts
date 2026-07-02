import { describe, it, expect } from 'vitest'
import {
  rollCascade, rerollEntry, rerollReaction, rerollActivity, rerollNpc,
  pickMaster, pickEntryAt, pickReaction, parseChainToken,
  type CascadeSection, type CascadeEffects,
} from './encounterCascade'
import type { NPC } from '@domain/entities/NPC'

const sections: CascadeSection[] = [
  { category: 'creature', label: 'Creature', entries: ['Goblin', 'Wolf'], isCustom: false },
  { category: 'npc', label: 'NPC', entries: ['A merchant'], isCustom: false },
  { category: 'treasure', label: 'Treasure', entries: ['A locked chest'], isCustom: false },
]

const fakeNpc = { id: 'npc-1', name: 'Test NPC' } as unknown as NPC

function fx(over: Partial<CascadeEffects> = {}): CascadeEffects {
  return {
    rollDie: (sides) => sides,                                   // always max
    rollReaction: () => ({ roll: 7, disposition: 'curious' }),
    generateNpc: async () => fakeNpc,
    matchMonster: () => ({ compendiumId: 'mon-1', name: 'Goblin' }),
    rollActivity: (kind) => ({ text: `${kind}-doing`, roll: 1 }),
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

  it('represents an npc with just the generated npc (no archetype reaction)', async () => {
    // master roll lands on section index 2 (npc)
    const r = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 2 : 1) }))
    expect(r.category).toBe('npc')
    expect(r.npc).toBe(fakeNpc)
    expect(r.npcSavedId).toBeNull()
    // NPCs carry their own disposition; no separate 2d6 reaction, and the summary
    // text is the NPC's name.
    expect(r.reaction).toBeUndefined()
    expect(r.entryText).toBe('Test NPC')
    expect(r.monsterMatch).toBeUndefined()
  })

  it('leaves other categories as plain text (no reaction/npc/monster)', async () => {
    const r = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 3 : 1) }))
    expect(r.category).toBe('treasure')
    expect(r.reaction).toBeUndefined()
    expect(r.npc).toBeUndefined()
    expect(r.monsterMatch).toBeUndefined()
  })

  it('rolls a "what they are doing" activity for creatures and npcs', async () => {
    const cr = await rollCascade(sections, fx({ rollDie: () => 1 }))
    expect(cr.activity).toBe('creature-doing')
    const np = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 2 : 1) }))
    expect(np.activity).toBe('npc-doing')
  })
})

describe('parseChainToken', () => {
  it('extracts creature / npc / either tokens and strips them', () => {
    expect(parseChainToken('Rockfall {creature}')).toEqual({ text: 'Rockfall', token: 'creature', uncertain: false })
    expect(parseChainToken('A trap {npc}')).toEqual({ text: 'A trap', token: 'npc', uncertain: false })
    expect(parseChainToken('A snare {creature|npc}')).toEqual({ text: 'A snare', token: 'either', uncertain: false })
  })
  it('flags the uncertain-state variant with a trailing ?', () => {
    expect(parseChainToken('A sprung trap, something caught {creature?}'))
      .toEqual({ text: 'A sprung trap, something caught', token: 'creature', uncertain: true })
    expect(parseChainToken('A pit trap {creature|npc?}'))
      .toEqual({ text: 'A pit trap', token: 'either', uncertain: true })
  })
  it('returns null token for plain entries', () => {
    expect(parseChainToken('Sudden downpour')).toEqual({ text: 'Sudden downpour', token: null, uncertain: false })
  })
})

describe('area effect chaining', () => {
  const withArea: CascadeSection[] = [
    { category: 'creature', label: 'Creature', entries: ['Goblin'], isCustom: false },
    { category: 'npc', label: 'NPC', entries: ['A merchant'], isCustom: false },
    { category: 'areaEffect', label: 'Area Effect', entries: ['Rockfall {creature}'], isCustom: false },
  ]

  it('auto-rolls the flushed-out creature and strips the token from display', async () => {
    // land on areaEffect (index 3 → section 2)
    const r = await rollCascade(withArea, fx({ rollDie: (s) => (s === withArea.length ? 3 : 1) }))
    expect(r.category).toBe('areaEffect')
    expect(r.entryText).toBe('Rockfall')                        // token stripped
    expect(r.chained?.category).toBe('creature')
    expect(r.chained?.entryText).toBe('Goblin')
  })

  it('leaves chained null when the target section is absent', async () => {
    const noCreature: CascadeSection[] = [
      { category: 'areaEffect', label: 'Area Effect', entries: ['Rockfall {creature}'], isCustom: false },
    ]
    const r = await rollCascade(noCreature, fx({ rollDie: () => 1 }))
    expect(r.category).toBe('areaEffect')
    expect(r.chained).toBeNull()
  })

  const uncertain: CascadeSection[] = [
    { category: 'creature', label: 'Creature', entries: ['Goblin'], isCustom: false },
    { category: 'areaEffect', label: 'Area Effect', entries: ['A sprung trap {creature?}'], isCustom: false },
  ]

  it('marks an uncertain {creature?} find dead on an odd d4, stripping behaviour', async () => {
    // master → areaEffect (section 2); d4 → odd (1) → dead
    const land = await rollCascade(uncertain, fx({ rollDie: (s) => (s === uncertain.length ? 2 : 1) }))
    expect(land.chained?.condition).toBe('dead')
    expect(land.chained?.reaction).toBeUndefined()
    expect(land.chained?.activity).toBeUndefined()
    expect(land.chained?.entryText).toBe('Goblin')
  })

  it('marks an uncertain {creature?} find alive on an even d4, keeping reaction/activity', async () => {
    // master → areaEffect (2); entry → 1; d4 → even (2) → alive
    let calls = 0
    const rollDie = (s: number) => {
      calls++
      if (s === uncertain.length) return 2 // master → areaEffect
      if (s === 4) return 2 // d4 → even → alive
      return 1
    }
    const land = await rollCascade(uncertain, fx({ rollDie }))
    expect(land.chained?.condition).toBe('alive')
    expect(land.chained?.reaction).toBe('curious')
    expect(land.chained?.activity).toBe('creature-doing')
    expect(calls).toBeGreaterThan(0)
  })
})

describe('rerollActivity', () => {
  it('re-rolls only the activity for a creature', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: () => 1 }))
    const r = rerollActivity(prev, fx({ rollActivity: () => ({ text: 'new-activity', roll: 3 }) }))
    expect(r.activity).toBe('new-activity')
    expect(r.entryText).toBe(prev.entryText)
  })
  it('is a no-op for non-agent categories', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: (s) => (s === sections.length ? 3 : 1) }))
    expect(rerollActivity(prev, fx())).toBe(prev)
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

describe('manual row selection', () => {
  it('pickMaster lands on the chosen category and rolls within it', async () => {
    const r = await pickMaster('treasure', sections, fx({ rollDie: () => 1 }))
    expect(r.category).toBe('treasure')
    expect(r.masterRoll).toBe(3) // treasure is the 3rd section
    expect(r.entryText).toBe('A locked chest')
  })

  it('pickMaster on the npc category generates the npc', async () => {
    const r = await pickMaster('npc', sections, fx())
    expect(r.category).toBe('npc')
    expect(r.npc).toBe(fakeNpc)
    expect(r.reaction).toBeUndefined()
  })

  it('pickEntryAt forces the chosen entry, keeping the category', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: () => 1 })) // creature → Goblin
    const r = await pickEntryAt(prev, sections, fx(), 1)
    expect(r.category).toBe('creature')
    expect(r.entryIndex).toBe(1)
    expect(r.entryText).toBe('Wolf')
  })

  it('pickReaction sets the chosen disposition for a creature', async () => {
    const prev = await rollCascade(sections, fx({ rollDie: () => 1 }))
    const r = pickReaction(prev, 'hostile', 2)
    expect(r.reaction).toBe('hostile')
    expect(r.reactionRoll).toBe(2)
  })
})
