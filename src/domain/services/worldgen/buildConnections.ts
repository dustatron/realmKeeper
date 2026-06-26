import type { Faction } from '@domain/entities/Faction'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import type { Connection, ConnectionKind } from '@domain/entities/Connection'
import { newId } from '@shared/ulid'

// Thresholds on the -6..6 relationship scale for turning faction sentiment into
// a connection between the two factions' leaders.
const ENEMY_AT = -4
const RIVAL_AT = -2
const ALLY_AT = 4

function leaderTie(score: number): { kind: ConnectionKind; label: string } | null {
  if (score <= ENEMY_AT) return { kind: 'enemy', label: 'sworn enemy of' }
  if (score <= RIVAL_AT) return { kind: 'rival', label: 'rival of' }
  if (score >= ALLY_AT) return { kind: 'ally', label: 'ally of' }
  return null
}

// Seeded narrative connections among the generated NPCs:
//  - every agent serves their faction leader (ally edge),
//  - leaders of strongly-disposed factions are tied as enemies/rivals/allies,
//    derived from the pairwise faction relationship scores.
// Pure and deterministic; NPC↔NPC edges only (fromType/toType = 'npc').
export function buildConnections(
  factions: Faction[],
  relationships: FactionRelationship[],
  worldId: string,
): Connection[] {
  const now = Date.now()
  const conns: Connection[] = []
  const edge = (fromId: string, toId: string, kind: ConnectionKind, label: string): void => {
    if (fromId === toId) return
    conns.push({
      id: newId(),
      worldId,
      fromType: 'npc',
      fromId,
      toType: 'npc',
      toId,
      kind,
      label,
      status: 'active',
      hookId: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  // Intra-faction: each agent serves the leader.
  for (const faction of factions) {
    if (!faction.leaderNpcId) continue
    for (const agentId of faction.agentNpcIds) {
      edge(agentId, faction.leaderNpcId, 'ally', 'serves')
    }
  }

  // Inter-faction: leaders tied by faction sentiment. Dedupe to one edge per
  // unordered faction pair.
  const leaderOf = new Map(factions.map((f) => [f.id, f.leaderNpcId]))
  const seenPairs = new Set<string>()
  for (const rel of relationships) {
    const pairKey = [rel.factionId, rel.targetId].sort().join('|')
    if (seenPairs.has(pairKey)) continue
    seenPairs.add(pairKey)
    const tie = leaderTie(rel.score)
    if (!tie) continue
    const fromLeader = leaderOf.get(rel.factionId)
    const toLeader = leaderOf.get(rel.targetId)
    if (!fromLeader || !toLeader) continue
    edge(fromLeader, toLeader, tie.kind, tie.label)
  }

  return conns
}
