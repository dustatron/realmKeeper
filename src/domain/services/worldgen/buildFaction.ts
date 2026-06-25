import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Faction, AgendaGoal } from '@domain/entities/Faction'
import { newId } from '@shared/ulid'
import { pickCairn, sampleCairn, cairnTexts } from './cairnPick'

export interface BuildFactionInput {
  worldId: string
  hqPoiId: string
  regionId: string
}

// Cairn's advantage-quantity roll: 1d20 → 1-7=1, 8-12=2, 13-17=3, 18-20=4.
function rollAdvantageCount(rng: SeededRandom): number {
  const roll = rng.between(1, 20)
  if (roll <= 7) return 1
  if (roll <= 12) return 2
  if (roll <= 17) return 3
  return 4
}

// Pure, seeded faction generator for world generation. Mirrors the Cairn faction
// procedure (type, two traits, advantages, an obstacle, immediate + long-term
// agenda goals) but reads the static Cairn tables and rolls via SeededRandom so
// generation stays deterministic. NPC leadership/agents are assigned later
// (generation stage 7), so leaderNpcId/agentNpcIds start empty.
export function buildFaction(input: BuildFactionInput, rng: SeededRandom): Faction {
  const now = Date.now()

  const type = pickCairn(rng, 'table-cairn-faction-type')
  const trait1 = pickCairn(rng, 'table-cairn-faction-trait')
  const trait2 = pickCairn(rng, 'table-cairn-faction-trait2')
  const traits = [trait1, trait2].filter(Boolean)

  const advantages = sampleCairn(rng, 'table-cairn-faction-advantage', rollAdvantageCount(rng)).map(
    (description) => ({ id: newId(), description }),
  )

  const obstacleText = pickCairn(rng, 'table-cairn-faction-obstacle')
  const obstacles = obstacleText ? [{ id: newId(), description: obstacleText }] : []

  // 1-2 immediate tactical goals + 2-3 long-term strategic goals.
  const immediate: AgendaGoal[] = sampleCairn(
    rng,
    'table-cairn-faction-immediate-agenda',
    rng.between(1, 2),
  ).map((description) => ({ id: newId(), description, completed: false, timeframe: 'immediate' }))
  const longTerm: AgendaGoal[] = sampleCairn(
    rng,
    'table-cairn-faction-agenda',
    rng.between(2, 3),
  ).map((description) => ({
    id: newId(),
    description,
    completed: false,
    timeframe: 'long-term',
    progress: 0,
    segments: 4,
  }))

  // Default to a non-empty name even if the type table is somehow missing.
  const name = (traits[0] ? `${traits[0]} ${type}` : type).trim() || 'Unnamed Faction'

  return {
    id: newId(),
    worldId: input.worldId,
    name,
    description: '',
    type: type || (cairnTexts('table-cairn-faction-type')[0] ?? ''),
    status: 'active',
    isParty: false,
    regionId: input.regionId,
    headquartersPoiId: input.hqPoiId,
    leaderNpcId: null,
    agentNpcIds: [],
    agendaGoals: [...immediate, ...longTerm],
    advantages,
    obstacles,
    traits,
    sortOrder: now,
    createdAt: now,
    updatedAt: now,
  }
}
