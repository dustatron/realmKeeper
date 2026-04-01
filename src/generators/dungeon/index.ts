/**
 * Dungeon generator adapter for realmKeeper.
 * Wraps hexbinder's spatial dungeon generator.
 */

import { newId } from '@shared/ulid'
import { SeededRandom, createWeightedTable } from './SeededRandom'
import { DungeonLayoutGenerator, markDeadEnds } from './DungeonLayoutEngine'
import { applyBlueprint } from './dungeon/BlueprintEngine'
import { placeTraps } from './dungeon/TrapGenerator'
import { generateDungeonEcology } from './dungeon/DungeonEcologyGenerator'
import { generateWanderingMonsters } from './dungeon/WanderingMonsterGenerator'
import { generateDungeonNPCs } from './dungeon/DungeonNPCGenerator'
import { generateKeyLocks } from './dungeon/KeyLockGenerator'
import { generateDungeonHistory } from './dungeon/DungeonHistoryGenerator'
import type {
  DungeonTheme,
  DungeonSize,
  SpatialDungeon,
  SpatialRoom,
  RoomFeature,
  RoomSecret,
} from './types'

export type { DungeonTheme, DungeonSize, SpatialDungeon, SpatialRoom }
export type { Passage, GridRect, GridPoint, WanderingMonsterTable, DungeonEcology, HistoryLayer } from './types'

// === Generation Config ===

export interface DungeonGenerationConfig {
  theme: DungeonTheme | 'random'
  size: DungeonSize | 'random'
  treasureLevel: 'scarce' | 'modest' | 'rich' | 'hoard' | 'random'
  magicItems: 'none' | 'rare' | 'some' | 'plentiful' | 'random'
  monsterDanger: 'nuisance' | 'dangerous' | 'deadly' | 'legendary' | 'random'
}

export interface ResolvedDungeonConfig {
  theme: DungeonTheme
  size: DungeonSize
  treasureLevel: 'scarce' | 'modest' | 'rich' | 'hoard'
  magicItems: 'none' | 'rare' | 'some' | 'plentiful'
  monsterDanger: 'nuisance' | 'dangerous' | 'deadly' | 'legendary'
}

const THEME_WEIGHTS = createWeightedTable<DungeonTheme>({
  tomb: 20,
  cave: 20,
  temple: 15,
  mine: 10,
  fortress: 10,
  sewer: 10,
  crypt: 10,
  lair: 5,
  shrine: 10,
  bandit_hideout: 5,
  cultist_lair: 5,
  witch_hut: 3,
  sea_cave: 3,
  beast_den: 5,
  floating_keep: 3,
})

const SIZE_WEIGHTS = createWeightedTable<DungeonSize>({
  lair: 30,
  small: 35,
  medium: 25,
  large: 8,
  megadungeon: 2,
})

const DUNGEON_ADJECTIVES = [
  'Forsaken', 'Sunken', 'Ruined', 'Shadowed', 'Haunted', 'Lost',
  'Ancient', 'Cursed', 'Hidden', 'Forgotten', 'Blighted', 'Twisted',
]

const DUNGEON_NOUNS: Record<DungeonTheme, string[]> = {
  tomb: ['Tomb', 'Mausoleum', 'Crypt', 'Barrow', 'Sepulcher'],
  cave: ['Cavern', 'Grotto', 'Caves', 'Chasm', 'Depths'],
  temple: ['Temple', 'Sanctuary', 'Shrine', 'Chapel', 'Cathedral'],
  mine: ['Mines', 'Quarry', 'Pit', 'Excavation', 'Tunnels'],
  fortress: ['Fortress', 'Keep', 'Stronghold', 'Bastion', 'Citadel'],
  sewer: ['Sewers', 'Undercity', 'Drains', 'Warrens', 'Tunnels'],
  crypt: ['Crypt', 'Ossuary', 'Charnel House', 'Vault', 'Catacombs'],
  lair: ['Lair', 'Den', 'Nest', 'Burrow', 'Hideout'],
  shrine: ['Shrine', 'Sanctum', 'Fane', 'Holy Place', 'Sacred Grove'],
  bandit_hideout: ['Hideout', 'Camp', 'Stronghold', 'Outpost', 'Den'],
  cultist_lair: ['Sanctum', 'Temple', 'Lair', 'Altar', 'Chamber'],
  witch_hut: ['Hut', 'Cottage', 'Hovel', 'Dwelling', 'Sanctum'],
  sea_cave: ['Grotto', 'Cove', 'Cavern', 'Hideaway', 'Lair'],
  beast_den: ['Den', 'Lair', 'Nest', 'Warren', 'Cave'],
  floating_keep: ['Keep', 'Citadel', 'Tower', 'Fortress', 'Spire'],
}

const ROOM_FEATURES: RoomFeature[] = [
  { name: 'Broken Furniture', description: 'Broken furniture scattered about', interactive: false },
  { name: 'Ancient Altar', description: 'An ancient stone altar', interactive: true },
  { name: 'Faded Murals', description: 'Faded murals on the walls', interactive: false },
  { name: 'Bone Pile', description: 'Piles of bones in the corners', interactive: true },
  { name: 'Glowing Fungi', description: 'Glowing fungi provide dim light', interactive: false },
  { name: 'Unnatural Torches', description: 'Torches burn with an unnatural flame', interactive: true },
  { name: 'Stagnant Pool', description: 'A pool of stagnant water', interactive: true },
  { name: 'Dripping Ceiling', description: 'Water drips from the ceiling', interactive: false },
  { name: 'Rubble', description: 'Rubble blocks part of the room', interactive: false },
  { name: 'Collapsed Pillars', description: 'Collapsed pillars', interactive: false },
]

const SECRETS: Omit<RoomSecret, 'discovered'>[] = [
  { description: 'A secret door behind a tapestry', trigger: 'Perception DC 14' },
  { description: 'A concealed passage in the floor', trigger: 'Investigation DC 15' },
  { description: 'A hidden compartment in the wall', trigger: 'Perception DC 12', reward: '50 gp' },
  { description: 'A false bottom in a chest', trigger: 'Investigation DC 13', reward: 'gems' },
  { description: 'A narrow crawlway hidden by rubble', trigger: 'Perception DC 14' },
  { description: 'A hidden lever opens a secret door', trigger: 'Investigation DC 16' },
]

export function resolveConfig(config: DungeonGenerationConfig, seed: string): ResolvedDungeonConfig {
  const rng = new SeededRandom(`${seed}-resolve`)
  return {
    theme: config.theme === 'random' ? rng.pickWeighted(THEME_WEIGHTS) : config.theme,
    size: config.size === 'random' ? rng.pickWeighted(SIZE_WEIGHTS) : config.size,
    treasureLevel: config.treasureLevel === 'random'
      ? rng.pick(['scarce', 'modest', 'rich', 'hoard'] as const)
      : config.treasureLevel,
    magicItems: config.magicItems === 'random'
      ? rng.pick(['none', 'rare', 'some', 'plentiful'] as const)
      : config.magicItems,
    monsterDanger: config.monsterDanger === 'random'
      ? rng.pick(['nuisance', 'dangerous', 'deadly', 'legendary'] as const)
      : config.monsterDanger,
  }
}

export function generateSpatialDungeon(
  config: ResolvedDungeonConfig,
  seed?: string
): SpatialDungeon {
  const s = seed ?? newId()
  const rng = new SeededRandom(`${s}-dungeon-gen`)
  const { theme, size } = config
  const id = `dungeon-${newId()}`
  const name = generateDungeonName(rng, theme)
  const roomCount = getRoomCountForSize(rng, size)
  const depth = getDepthForSize(size)

  // Generate spatial layout
  const layoutGenerator = new DungeonLayoutGenerator(s)
  const layout = layoutGenerator.generate(size, theme, roomCount)

  // Mark dead-end rooms
  markDeadEnds(layout.rooms, layout.passages)

  // Apply blueprint-based theme room types
  applyBlueprint(theme, layout.rooms, layout.passages, s)

  // Add content (features, hazards, secrets) to each room
  const rooms = layout.rooms.map((room) => addRoomContent(rng, room))

  // Place traps
  placeTraps(theme, rooms, layout.passages, s)

  // Generate ecology
  const ecology = generateDungeonEcology(theme, rooms, s)

  // Generate history
  const historyLayers = generateDungeonHistory(theme, rooms, [], s)
  if (historyLayers.length > 0) {
    ecology.historyLayers = historyLayers
  }

  // Generate wandering monsters
  const wanderingMonsters = generateWanderingMonsters(theme, depth, s)

  // Generate dungeon NPCs
  const dungeonNPCs = generateDungeonNPCs(theme, rooms, [], s)

  // Generate key-lock pairs
  const keyLockPairs = generateKeyLocks(theme, rooms, layout.passages, s)

  return {
    id,
    name,
    type: 'dungeon',
    description: `${name}, a ${size} ${theme}.`,
    tags: [size, theme],
    size,
    theme,
    depth,
    gridWidth: layout.gridWidth,
    gridHeight: layout.gridHeight,
    rooms,
    passages: layout.passages,
    entranceRoomId: rooms[0]?.id ?? '',
    cleared: false,
    linkedHookIds: [],
    ecology,
    wanderingMonsters,
    dungeonNPCs,
    keyLockPairs,
  }
}

function addRoomContent(rng: SeededRandom, room: SpatialRoom): SpatialRoom {
  const features: RoomFeature[] = []
  const secrets: RoomSecret[] = []

  const featureCount = rng.between(0, 2)
  if (featureCount > 0) {
    features.push(...rng.sample(ROOM_FEATURES, featureCount))
  }

  if (rng.chance(0.15)) {
    const secret = rng.pick(SECRETS)
    secrets.push({ ...secret, discovered: false })
  }

  return {
    ...room,
    features,
    hazards: [],
    secrets,
  }
}

function generateDungeonName(rng: SeededRandom, theme: DungeonTheme): string {
  const adj = rng.pick(DUNGEON_ADJECTIVES)
  const noun = rng.pick(DUNGEON_NOUNS[theme])
  return `The ${adj} ${noun}`
}

function getRoomCountForSize(rng: SeededRandom, size: DungeonSize): number {
  const ranges: Record<DungeonSize, [number, number]> = {
    lair: [3, 5],
    small: [5, 8],
    medium: [8, 12],
    large: [12, 20],
    megadungeon: [20, 30],
  }
  const [min, max] = ranges[size]
  return rng.between(min, max)
}

function getDepthForSize(size: DungeonSize): number {
  const depths: Record<DungeonSize, number> = {
    lair: 1,
    small: 1,
    medium: 2,
    large: 3,
    megadungeon: 5,
  }
  return depths[size]
}
