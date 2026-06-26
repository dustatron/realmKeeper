import type { DungeonTheme, GeneratorWanderingMonsterTable, GeneratorWanderingMonsterEntry } from '../types'
import { SeededRandom } from '../SeededRandom'
import { getBlueprint } from './DungeonBlueprints'

const WANDERING_ACTIVITIES = [
  'patrolling the area', 'searching for food', 'investigating a noise',
  'returning to their lair', 'dragging a recent kill', 'arguing with each other',
  'performing a ritual', 'sleeping in the passage', 'guarding a key location',
  'fleeing from something else',
]

const THEME_ACTIVITIES: Partial<Record<DungeonTheme, string[]>> = {
  tomb: ['shambling aimlessly', 'guarding the dead', 'moaning in eternal torment', 'sensing the living'],
  temple: ['conducting a ceremony', 'praying to dark gods', 'purifying the halls', 'seeking heretics'],
  sewer: ['swimming through filth', 'feeding on refuse', 'marking territory', 'avoiding the light'],
  cultist_lair: ['chanting ritual words', 'preparing a sacrifice', 'drawing blood sigils', 'summoning dark forces'],
  bandit_hideout: ['counting stolen loot', 'drinking and gambling', 'keeping watch', 'planning the next raid'],
  fortress: ['on patrol', 'changing guard shifts', 'drilling combat formations', 'reporting to superiors'],
}

const COUNT_BY_DEPTH: Record<number, string[]> = {
  0: ['1', '1d2', '1d3'],
  1: ['1d2', '1d3', '1d4'],
  2: ['1d3', '1d4', '1d6'],
  3: ['1d4', '1d6', '2d4'],
  4: ['1d6', '2d4', '2d6'],
}

export function generateWanderingMonsters(
  theme: DungeonTheme,
  dungeonDepth: number,
  seed: string,
  inhabitantCreature?: string,
): GeneratorWanderingMonsterTable {
  const rng = new SeededRandom(`${seed}-wandering`)
  const creaturePool = getBlueprint(theme).creaturePool
  const entries: GeneratorWanderingMonsterEntry[] = []
  const entryCount = rng.between(4, 8)
  const effectiveDepth = Math.min(dungeonDepth, 4)

  // Build a shuffled activity pool so entries don't repeat activities
  const themeActivities = THEME_ACTIVITIES[theme]
  const basePool = [...WANDERING_ACTIVITIES]
  const themePool = themeActivities ? [...themeActivities] : []
  // Interleave theme-specific and generic activities, then shuffle
  const mixedPool = rng.shuffle([...themePool, ...themePool, ...basePool])
  let activityIdx = 0

  for (let i = 0; i < entryCount; i++) {
    // The dungeon's current inhabitants are the most common wandering encounter,
    // so they lead the table (highest weight); the rest are theme-pool intruders.
    const creature = inhabitantCreature && i === 0 ? inhabitantCreature : rng.pick(creaturePool)
    const countOptions = COUNT_BY_DEPTH[effectiveDepth] ?? COUNT_BY_DEPTH[0]
    const count = rng.pick(countOptions)
    const activity = mixedPool[activityIdx % mixedPool.length]
    activityIdx++
    entries.push({ creatureType: creature, count, weight: entryCount - i, activity })
  }

  const activeThemes: DungeonTheme[] = ['fortress', 'bandit_hideout', 'cultist_lair']
  const quietThemes: DungeonTheme[] = ['tomb', 'crypt', 'shrine']
  let checkFrequency = 'every 3 turns or on loud noise'
  if (activeThemes.includes(theme)) checkFrequency = 'every 2 turns or on loud noise'
  if (quietThemes.includes(theme)) checkFrequency = 'every 4 turns or on desecration'

  return { checkFrequency, entries }
}
