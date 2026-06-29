import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Faction, AgendaGoal } from '@domain/entities/Faction'
import { newId } from '@shared/ulid'
import { pickCairn, sampleCairn, cairnTexts } from './cairnPick'
import { pickFactionName } from '~/domain/data/worldgen/names'
import type { ResolvedTables } from './TableProvider'
import {
  FACTION_MOTIVATION_TABLE_ID, NOBLE_SECRET_TABLE_ID,
  FACTION_MOTIVATIONS, NOBLE_SECRETS,
} from '~/domain/data/worldgen/faction.tables'

function pickFlavor(rng: SeededRandom, tables: ResolvedTables | undefined, id: string, fallback: readonly string[]): string {
  const t = tables?.texts(id)
  return rng.pick(t && t.length > 0 ? t : fallback)
}

export interface BuildFactionInput {
  worldId: string
  hqPoiId: string
  regionId: string
  /** When provided, the generated name is kept unique within the set (and added). */
  usedNames?: Set<string>
  /** Central table registry, so faction-name pools can be customized. */
  tables?: ResolvedTables
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

  // Evocative proper name (e.g. "The Crimson Hand", "House Vane"), kept unique
  // within the world when a usedNames set is supplied. The old "<Trait> <Type>"
  // phrase becomes the description/subtitle.
  const resolvedType = type || (cairnTexts('table-cairn-faction-type')[0] ?? '')
  const makeName = (): string => pickFactionName(resolvedType, rng, input.tables)
  let name = makeName()
  if (input.usedNames) {
    for (let i = 0; i < 20 && input.usedNames.has(name); i++) name = makeName()
    if (input.usedNames.has(name)) {
      const base = name
      let k = 2
      while (input.usedNames.has(name)) name = `${base} ${k++}`
    }
    input.usedNames.add(name)
  }

  // Motivation (all factions) + a secret (Noble Houses). Drawn from CHILD rngs so
  // they don't advance the main stream — faction names stay deterministic.
  const motivation = pickFlavor(rng.child('faction-motivation'), input.tables, FACTION_MOTIVATION_TABLE_ID, FACTION_MOTIVATIONS)
  const secret = resolvedType === 'Noble House'
    ? pickFlavor(rng.child('noble-secret'), input.tables, NOBLE_SECRET_TABLE_ID, NOBLE_SECRETS)
    : null
  const description =
    (traits[0] ? `${traits[0]} ${resolvedType}` : resolvedType).trim() +
    ` They seek to ${motivation}.` +
    (secret ? ` Secret: ${secret}.` : '')

  return {
    id: newId(),
    worldId: input.worldId,
    name,
    description,
    type: resolvedType,
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
