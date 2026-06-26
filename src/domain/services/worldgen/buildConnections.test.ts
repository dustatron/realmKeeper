import { describe, it, expect } from 'vitest'
import type { Faction } from '@domain/entities/Faction'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import { buildConnections } from './buildConnections'

const faction = (id: string, leader: string, agents: string[]): Faction =>
  ({ id, leaderNpcId: leader, agentNpcIds: agents }) as Faction

const rel = (a: string, b: string, score: number): FactionRelationship =>
  ({ id: `${a}-${b}`, factionId: a, targetId: b, score, events: [], updatedAt: 0 })

describe('buildConnections', () => {
  const factions = [faction('fA', 'lA', ['a1', 'a2']), faction('fB', 'lB', ['b1'])]

  it('links each agent to its leader as an ally', () => {
    const conns = buildConnections(factions, [], 'w1')
    const serves = conns.filter((c) => c.fromId === 'a1' && c.toId === 'lA')
    expect(serves).toHaveLength(1)
    expect(serves[0].kind).toBe('ally')
    expect(serves[0].fromType).toBe('npc')
    expect(serves[0].toType).toBe('npc')
    expect(serves[0].worldId).toBe('w1')
    // every agent serves its leader
    for (const [agent, leader] of [['a1', 'lA'], ['a2', 'lA'], ['b1', 'lB']]) {
      expect(conns.some((c) => c.fromId === agent && c.toId === leader)).toBe(true)
    }
  })

  it('makes leaders of strongly hostile factions enemies (single edge)', () => {
    const conns = buildConnections(factions, [rel('fA', 'fB', -5), rel('fB', 'fA', -5)], 'w1')
    const between = conns.filter(
      (c) => (c.fromId === 'lA' && c.toId === 'lB') || (c.fromId === 'lB' && c.toId === 'lA'),
    )
    expect(between).toHaveLength(1)
    expect(between[0].kind).toBe('enemy')
  })

  it('makes leaders of strongly allied factions allies', () => {
    const conns = buildConnections(factions, [rel('fA', 'fB', 5), rel('fB', 'fA', 5)], 'w1')
    const between = conns.find(
      (c) => (c.fromId === 'lA' && c.toId === 'lB') || (c.fromId === 'lB' && c.toId === 'lA'),
    )
    expect(between?.kind).toBe('ally')
  })

  it('creates no leader-leader edge for neutral factions', () => {
    const conns = buildConnections(factions, [rel('fA', 'fB', 0), rel('fB', 'fA', 0)], 'w1')
    const between = conns.filter((c) => [c.fromId, c.toId].includes('lA') && [c.fromId, c.toId].includes('lB'))
    expect(between).toHaveLength(0)
  })

  it('never connects a node to itself, and is deterministic', () => {
    const a = buildConnections(factions, [rel('fA', 'fB', -5), rel('fB', 'fA', -5)], 'w1')
    const b = buildConnections(factions, [rel('fA', 'fB', -5), rel('fB', 'fA', -5)], 'w1')
    for (const c of a) expect(c.fromId).not.toBe(c.toId)
    expect(a.map((c) => `${c.fromId}-${c.toId}-${c.kind}`)).toEqual(b.map((c) => `${c.fromId}-${c.toId}-${c.kind}`))
  })
})
