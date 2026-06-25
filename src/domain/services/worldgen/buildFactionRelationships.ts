import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import { clampScore } from '@domain/value-objects/RelationshipScore'
import { newId } from '@shared/ulid'

// Seeded pairwise relationship scores among the generated factions. Mirrors the
// app's convention of one directional row per ordered pair (A→B and B→A), here
// kept symmetric so a pair reads the same from both sides at generation time.
//
// Scores follow a triangular distribution (average of two -6..6 rolls), so most
// factions start mildly disposed toward each other with a few strong
// rivalries/alliances at the tails. Party-faction relationships are handled
// elsewhere (it never auto-rolls).
export function buildFactionRelationships(
  factionIds: string[],
  rng: SeededRandom,
): FactionRelationship[] {
  const now = Date.now()
  const rels: FactionRelationship[] = []
  for (let i = 0; i < factionIds.length; i++) {
    for (let j = i + 1; j < factionIds.length; j++) {
      const score = clampScore((rng.between(-6, 6) + rng.between(-6, 6)) / 2)
      rels.push({
        id: newId(),
        factionId: factionIds[i],
        targetId: factionIds[j],
        score,
        events: [],
        updatedAt: now,
      })
      rels.push({
        id: newId(),
        factionId: factionIds[j],
        targetId: factionIds[i],
        score,
        events: [],
        updatedAt: now,
      })
    }
  }
  return rels
}
