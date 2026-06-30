import type { Connection } from '@domain/entities/Connection'
import { newId } from '@shared/ulid'

/**
 * Abstract settlement node for the trade graph. Deliberately decoupled from the
 * resource catalog so the trade-matching logic can be built and tested in
 * isolation: it knows only an id, region, what it produces (with a weight class
 * that sets trade range), what it needs, and which settlements it connects to.
 */
export interface SettlementNode {
  id: string
  regionId: string
  produces: { name: string; weightClass: 'bulk' | 'luxury' } | null
  needs: string[]
  /** road/river-connected settlement ids (undirected). */
  neighbors: string[]
}

export interface UnmetNeed {
  settlementId: string
  good: string
}

export interface TradeResult {
  connections: Connection[]
  unmetNeeds: UnmetNeed[]
}

// A bulk good is heavy/cheap: it only travels a couple of hops. A luxury good is
// valuable enough to cross the whole reachable network.
const BULK_MAX_HOPS = 2

/**
 * BFS hop distances from `start` over the undirected neighbor graph.
 * Returns a map of settlement id -> hop count (0 for start itself).
 */
function hopDistances(
  start: string,
  adjacency: Map<string, string[]>,
): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]])
  const queue: string[] = [start]
  let head = 0
  while (head < queue.length) {
    const current = queue[head++]
    const currentDist = dist.get(current)!
    for (const next of adjacency.get(current) ?? []) {
      if (dist.has(next)) continue
      dist.set(next, currentDist + 1)
      queue.push(next)
    }
  }
  return dist
}

/**
 * Match settlement needs to producers along the road/river network and emit
 * supplier→consumer `'supplies'` connections.
 *
 * Rules:
 *  - A **bulk** good satisfies a need only if a producer sits within ≤2 hops.
 *  - A **luxury** good satisfies a need if a producer is anywhere reachable.
 *  - The nearest qualifying producer wins; ties break by producer id for
 *    determinism.
 *  - Never self-supply (a node does not satisfy its own need).
 *  - Needs with no qualifying producer are reported as unmet.
 *
 * Pure and deterministic aside from `newId()` / `Date.now()` (mirrors
 * buildConnections.ts).
 */
export function buildTradeConnections(
  nodes: SettlementNode[],
  worldId: string,
): TradeResult {
  const now = Date.now()
  const connections: Connection[] = []
  const unmetNeeds: UnmetNeed[] = []

  // Build undirected adjacency. Defensive: dedupe and symmetrize neighbors so a
  // one-sided neighbor entry still yields a usable graph.
  const ids = new Set(nodes.map((n) => n.id))
  const adjacency = new Map<string, Set<string>>()
  for (const node of nodes) adjacency.set(node.id, new Set())
  for (const node of nodes) {
    for (const neighbor of node.neighbors) {
      if (neighbor === node.id || !ids.has(neighbor)) continue
      adjacency.get(node.id)!.add(neighbor)
      adjacency.get(neighbor)!.add(node.id)
    }
  }
  const adjacencyList = new Map<string, string[]>()
  for (const [id, set] of adjacency) adjacencyList.set(id, [...set])

  // Index producers by the good they produce, with their weight class.
  const producersByGood = new Map<
    string,
    { id: string; weightClass: 'bulk' | 'luxury' }[]
  >()
  for (const node of nodes) {
    if (!node.produces) continue
    const list = producersByGood.get(node.produces.name) ?? []
    list.push({ id: node.id, weightClass: node.produces.weightClass })
    producersByGood.set(node.produces.name, list)
  }

  // Iterate consumers in input order for deterministic output ordering.
  for (const consumer of nodes) {
    const distances = hopDistances(consumer.id, adjacencyList)
    for (const good of consumer.needs) {
      const candidates = producersByGood.get(good) ?? []
      let best: { id: string; hops: number } | null = null
      for (const producer of candidates) {
        if (producer.id === consumer.id) continue // never self-supply
        const hops = distances.get(producer.id)
        if (hops === undefined) continue // not reachable
        if (producer.weightClass === 'bulk' && hops > BULK_MAX_HOPS) continue
        if (
          best === null ||
          hops < best.hops ||
          (hops === best.hops && producer.id < best.id)
        ) {
          best = { id: producer.id, hops }
        }
      }
      if (best === null) {
        unmetNeeds.push({ settlementId: consumer.id, good })
        continue
      }
      connections.push({
        id: newId(),
        worldId,
        fromType: 'poi',
        fromId: best.id,
        toType: 'poi',
        toId: consumer.id,
        kind: 'supplies',
        label: `supplies ${good} to`,
        status: 'active',
        hookId: null,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  return { connections, unmetNeeds }
}
