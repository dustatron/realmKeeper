import { describe, it, expect } from 'vitest'
import {
  buildTradeConnections,
  type SettlementNode,
} from './buildTradeConnections'

const bulk = (name: string) => ({ name, weightClass: 'bulk' as const })
const luxury = (name: string) => ({ name, weightClass: 'luxury' as const })

const WORLD = 'world-1'

describe('buildTradeConnections', () => {
  it('connects a bulk producer within ≤2 hops but not 3+ hops away', () => {
    // Chain: prod -- a -- b -- consumer (consumer is 3 hops from prod)
    const nodes: SettlementNode[] = [
      { id: 'prod', regionId: 'r', produces: bulk('grain'), needs: [], neighbors: ['a'] },
      { id: 'a', regionId: 'r', produces: null, needs: [], neighbors: ['prod', 'b'] },
      { id: 'b', regionId: 'r', produces: null, needs: [], neighbors: ['a', 'consumer'] },
      { id: 'consumer', regionId: 'r', produces: null, needs: ['grain'], neighbors: ['b'] },
    ]
    const { connections, unmetNeeds } = buildTradeConnections(nodes, WORLD)
    expect(connections).toHaveLength(0)
    expect(unmetNeeds).toEqual([{ settlementId: 'consumer', good: 'grain' }])
  })

  it('connects a bulk producer exactly 2 hops away', () => {
    // prod -- a -- consumer (2 hops)
    const nodes: SettlementNode[] = [
      { id: 'prod', regionId: 'r', produces: bulk('grain'), needs: [], neighbors: ['a'] },
      { id: 'a', regionId: 'r', produces: null, needs: [], neighbors: ['prod', 'consumer'] },
      { id: 'consumer', regionId: 'r', produces: null, needs: ['grain'], neighbors: ['a'] },
    ]
    const { connections, unmetNeeds } = buildTradeConnections(nodes, WORLD)
    expect(unmetNeeds).toHaveLength(0)
    expect(connections).toHaveLength(1)
    expect(connections[0]).toMatchObject({
      fromType: 'poi',
      fromId: 'prod',
      toType: 'poi',
      toId: 'consumer',
      kind: 'supplies',
      label: 'supplies grain to',
      status: 'active',
      hookId: null,
      worldId: WORLD,
    })
  })

  it('connects a luxury producer anywhere reachable (far away)', () => {
    // Same 4-node chain; luxury good crosses the whole graph (3 hops).
    const nodes: SettlementNode[] = [
      { id: 'prod', regionId: 'r', produces: luxury('gems'), needs: [], neighbors: ['a'] },
      { id: 'a', regionId: 'r', produces: null, needs: [], neighbors: ['prod', 'b'] },
      { id: 'b', regionId: 'r', produces: null, needs: [], neighbors: ['a', 'consumer'] },
      { id: 'consumer', regionId: 'r', produces: null, needs: ['gems'], neighbors: ['b'] },
    ]
    const { connections, unmetNeeds } = buildTradeConnections(nodes, WORLD)
    expect(unmetNeeds).toHaveLength(0)
    expect(connections).toHaveLength(1)
    expect(connections[0]).toMatchObject({
      fromId: 'prod',
      toId: 'consumer',
      kind: 'supplies',
      label: 'supplies gems to',
    })
  })

  it('reports unmet need when no producer exists', () => {
    const nodes: SettlementNode[] = [
      { id: 'a', regionId: 'r', produces: null, needs: ['iron'], neighbors: ['b'] },
      { id: 'b', regionId: 'r', produces: bulk('grain'), needs: [], neighbors: ['a'] },
    ]
    const { connections, unmetNeeds } = buildTradeConnections(nodes, WORLD)
    expect(connections).toHaveLength(0)
    expect(unmetNeeds).toEqual([{ settlementId: 'a', good: 'iron' }])
  })

  it('reports unmet need for an unreachable luxury producer', () => {
    // Two disconnected components: consumer cannot reach the producer.
    const nodes: SettlementNode[] = [
      { id: 'prod', regionId: 'r', produces: luxury('gems'), needs: [], neighbors: [] },
      { id: 'consumer', regionId: 'r', produces: null, needs: ['gems'], neighbors: [] },
    ]
    const { connections, unmetNeeds } = buildTradeConnections(nodes, WORLD)
    expect(connections).toHaveLength(0)
    expect(unmetNeeds).toEqual([{ settlementId: 'consumer', good: 'gems' }])
  })

  it('never self-supplies', () => {
    const nodes: SettlementNode[] = [
      {
        id: 'a',
        regionId: 'r',
        produces: bulk('grain'),
        needs: ['grain'],
        neighbors: [],
      },
    ]
    const { connections, unmetNeeds } = buildTradeConnections(nodes, WORLD)
    expect(connections).toHaveLength(0)
    expect(unmetNeeds).toEqual([{ settlementId: 'a', good: 'grain' }])
  })

  it('picks the nearest producer, tie-breaking by id', () => {
    // Two producers equidistant (1 hop) from consumer: 'p-a' and 'p-z'.
    const nodes: SettlementNode[] = [
      { id: 'p-z', regionId: 'r', produces: bulk('grain'), needs: [], neighbors: ['consumer'] },
      { id: 'p-a', regionId: 'r', produces: bulk('grain'), needs: [], neighbors: ['consumer'] },
      { id: 'consumer', regionId: 'r', produces: null, needs: ['grain'], neighbors: ['p-z', 'p-a'] },
    ]
    const { connections } = buildTradeConnections(nodes, WORLD)
    expect(connections).toHaveLength(1)
    expect(connections[0].fromId).toBe('p-a')
  })

  it('prefers a closer producer over a farther one', () => {
    // near is 1 hop, far is 2 hops; both bulk.
    const nodes: SettlementNode[] = [
      { id: 'near', regionId: 'r', produces: bulk('grain'), needs: [], neighbors: ['consumer'] },
      { id: 'mid', regionId: 'r', produces: null, needs: [], neighbors: ['consumer', 'far'] },
      { id: 'far', regionId: 'r', produces: bulk('grain'), needs: [], neighbors: ['mid'] },
      { id: 'consumer', regionId: 'r', produces: null, needs: ['grain'], neighbors: ['near', 'mid'] },
    ]
    const { connections } = buildTradeConnections(nodes, WORLD)
    expect(connections).toHaveLength(1)
    expect(connections[0].fromId).toBe('near')
  })

  it('produces deterministic output across runs', () => {
    const nodes: SettlementNode[] = [
      { id: 'a', regionId: 'r', produces: bulk('grain'), needs: ['ore'], neighbors: ['b'] },
      { id: 'b', regionId: 'r', produces: luxury('ore'), needs: ['grain'], neighbors: ['a'] },
    ]
    const first = buildTradeConnections(nodes, WORLD)
    const second = buildTradeConnections(nodes, WORLD)
    const strip = (r: ReturnType<typeof buildTradeConnections>) =>
      r.connections.map((c) => ({ fromId: c.fromId, toId: c.toId, label: c.label }))
    expect(strip(first)).toEqual(strip(second))
    expect(strip(first)).toEqual([
      { fromId: 'b', toId: 'a', label: 'supplies ore to' },
      { fromId: 'a', toId: 'b', label: 'supplies grain to' },
    ])
    expect(first.unmetNeeds).toEqual([])
  })
})
