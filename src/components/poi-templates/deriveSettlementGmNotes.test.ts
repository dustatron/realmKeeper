import { describe, it, expect } from 'vitest'
import {
  deriveSettlementGmNotes,
  type GmNoteContext,
} from './deriveSettlementGmNotes'

const oakfall: GmNoteContext = {
  produces: 'Textiles',
  needs: ['Wool'],
  wealthBand: 'rich',
  trouble: 'A mine… releasing warm air and distant singing',
  tags: ['Built on Bones of Giants'],
  factions: [
    {
      name: 'The Kell Conclave',
      type: 'Cabal',
      leaderName: 'Larenwe',
      currentMove: 'Arm the locals and incite a riot',
      leaderWant: 'clear their name with the local authority',
    },
  ],
  routes: [{ name: 'Stonefall' }],
  topTreasure: 'Staff of Sparks',
  knownFor: "a saint's relic",
  notable: 'famous for its forges…',
}

const emptyCtx: GmNoteContext = {
  produces: null,
  needs: [],
  wealthBand: null,
  trouble: null,
  tags: [],
  factions: [],
  routes: [],
  topTreasure: null,
  knownFor: null,
  notable: null,
}

describe('deriveSettlementGmNotes', () => {
  it('empty context yields empty array', () => {
    expect(deriveSettlementGmNotes(emptyCtx)).toEqual([])
  })

  it('oakfall: yields a SQUEEZE note mentioning Wool and "owns the town"', () => {
    const notes = deriveSettlementGmNotes(oakfall)
    const squeeze = notes.find((n) => n.title === 'THE SQUEEZE')
    expect(squeeze).toBeDefined()
    expect(squeeze!.body).toContain('Wool')
    expect(squeeze!.body).toContain('owns the town')
  })

  it('only surfaces SQUEEZE and GROUNDING — RIOT and PAYOFF are dropped', () => {
    const titles = deriveSettlementGmNotes(oakfall).map((n) => n.title)
    expect(titles).not.toContain('THE RIOT')
    expect(titles).not.toContain('THE PAYOFF')
    expect(new Set(titles)).toEqual(new Set(['THE SQUEEZE', 'THE PRIZE']))
  })

  it('all oakfall note bodies are under 25 words and non-empty', () => {
    const notes = deriveSettlementGmNotes(oakfall)
    expect(notes.length).toBeGreaterThan(0)
    for (const note of notes) {
      expect(note.body.trim()).not.toBe('')
      const wordCount = note.body.trim().split(/\s+/).length
      expect(wordCount).toBeLessThan(25)
    }
  })

  it('missing signals do not crash', () => {
    const partialCtx: GmNoteContext = {
      ...emptyCtx,
      needs: ['Iron'],
      wealthBand: 'poor',
    }
    expect(() => deriveSettlementGmNotes(partialCtx)).not.toThrow()
    expect(deriveSettlementGmNotes(partialCtx)).toEqual([])
  })

  it('poor wealthBand does not trigger SQUEEZE', () => {
    const ctx: GmNoteContext = { ...emptyCtx, needs: ['Wool'], wealthBand: 'poor' }
    const notes = deriveSettlementGmNotes(ctx)
    expect(notes.find((n) => n.title === 'THE SQUEEZE')).toBeUndefined()
  })

  it('GROUNDING fires when topTreasure and knownFor present', () => {
    const ctx: GmNoteContext = {
      ...emptyCtx,
      topTreasure: 'Obsidian Blade',
      knownFor: 'its swordsmiths',
    }
    const notes = deriveSettlementGmNotes(ctx)
    const grounding = notes.find((n) => n.title === 'THE PRIZE')
    expect(grounding).toBeDefined()
    expect(grounding!.body).toContain('Obsidian Blade')
    expect(grounding!.body).toContain('noticed')
  })
})
