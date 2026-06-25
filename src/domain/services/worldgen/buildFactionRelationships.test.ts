import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildFactionRelationships } from './buildFactionRelationships'

const IDS = ['f1', 'f2', 'f3', 'f4']

describe('buildFactionRelationships', () => {
  it('creates a directional row for every ordered pair, none to self', () => {
    const rels = buildFactionRelationships(IDS, new SeededRandom('s'))
    // n*(n-1) ordered pairs
    expect(rels).toHaveLength(IDS.length * (IDS.length - 1))
    for (const r of rels) expect(r.factionId).not.toBe(r.targetId)
    const keys = new Set(rels.map((r) => `${r.factionId}:${r.targetId}`))
    expect(keys.size).toBe(rels.length) // no duplicate ordered pairs
  })

  it('scores stay within -6..6 and are symmetric across a pair', () => {
    const rels = buildFactionRelationships(IDS, new SeededRandom('s'))
    const byKey = new Map(rels.map((r) => [`${r.factionId}:${r.targetId}`, r.score]))
    for (const r of rels) {
      expect(r.score).toBeGreaterThanOrEqual(-6)
      expect(r.score).toBeLessThanOrEqual(6)
      expect(byKey.get(`${r.targetId}:${r.factionId}`)).toBe(r.score)
    }
  })

  it('starts with no relationship events', () => {
    const rels = buildFactionRelationships(IDS, new SeededRandom('s'))
    for (const r of rels) expect(r.events).toEqual([])
  })

  it('returns nothing for fewer than two factions', () => {
    expect(buildFactionRelationships([], new SeededRandom('s'))).toEqual([])
    expect(buildFactionRelationships(['only'], new SeededRandom('s'))).toEqual([])
  })

  it('is deterministic for a given seed', () => {
    const a = buildFactionRelationships(IDS, new SeededRandom('z')).map((r) => `${r.factionId}:${r.targetId}=${r.score}`)
    const b = buildFactionRelationships(IDS, new SeededRandom('z')).map((r) => `${r.factionId}:${r.targetId}=${r.score}`)
    expect(a).toEqual(b)
  })
})
