import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { cairnTexts } from './cairnPick'
import { buildFaction } from './buildFaction'

const INPUT = { worldId: 'w1', hqPoiId: 'poi-1', regionId: 'region-1' }

describe('buildFaction', () => {
  it('fills the core faction fields', () => {
    const f = buildFaction(INPUT, new SeededRandom('s'))
    expect(f.name.length).toBeGreaterThan(0)
    expect(f.type.length).toBeGreaterThan(0)
    expect(f.traits).toHaveLength(2)
    expect(f.obstacles).toHaveLength(1)
    expect(f.advantages.length).toBeGreaterThanOrEqual(1)
    expect(f.advantages.length).toBeLessThanOrEqual(4)
    expect(new Set(f.advantages.map((a) => a.description)).size).toBe(f.advantages.length)
  })

  it('rolls both immediate and long-term agenda goals', () => {
    const f = buildFaction(INPUT, new SeededRandom('agenda'))
    expect(f.agendaGoals.some((g) => g.timeframe === 'immediate')).toBe(true)
    expect(f.agendaGoals.some((g) => g.timeframe === 'long-term')).toBe(true)
  })

  it('anchors the faction to its HQ POI, region, and world (no NPCs yet)', () => {
    const f = buildFaction(INPUT, new SeededRandom('s'))
    expect(f.worldId).toBe('w1')
    expect(f.headquartersPoiId).toBe('poi-1')
    expect(f.regionId).toBe('region-1')
    expect(f.isParty).toBe(false)
    expect(f.status).toBe('active')
    expect(f.leaderNpcId).toBeNull()
    expect(f.agentNpcIds).toEqual([])
  })

  it('sources the faction type from the Cairn faction-type table', () => {
    const types = cairnTexts('table-cairn-faction-type')
    const f = buildFaction(INPUT, new SeededRandom('type'))
    expect(types).toContain(f.type)
  })

  it('is deterministic for a given seed', () => {
    const a = buildFaction(INPUT, new SeededRandom('z'))
    const b = buildFaction(INPUT, new SeededRandom('z'))
    const normalize = (f: typeof a) => ({
      ...f,
      id: '',
      createdAt: 0,
      updatedAt: 0,
      sortOrder: 0,
      agendaGoals: f.agendaGoals.map((g) => g.description),
      advantages: f.advantages.map((x) => x.description),
      obstacles: f.obstacles.map((x) => x.description),
    })
    expect(normalize(a)).toEqual(normalize(b))
  })
})
