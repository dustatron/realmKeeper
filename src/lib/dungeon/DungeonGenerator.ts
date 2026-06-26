import type {
  DungeonTheme,
  DungeonSize,
  SpatialRoom,
  RoomFeature,
  RoomSecret,
  GeneratedDungeon,
  DungeonGenOptions,
} from './types'
import { SeededRandom } from './SeededRandom'
import { DungeonLayoutGenerator, markDeadEnds } from './DungeonLayoutEngine'
import { applyBlueprint } from './dungeon/BlueprintEngine'
import { placeTraps } from './dungeon/TrapGenerator'
import { generateDungeonEcology } from './dungeon/DungeonEcologyGenerator'
import { generateWanderingMonsters } from './dungeon/WanderingMonsterGenerator'
import { generateDungeonNPCs } from './dungeon/DungeonNPCGenerator'
import { generateKeyLocks } from './dungeon/KeyLockGenerator'
import { generateDungeonHistory } from './dungeon/DungeonHistoryGenerator'

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
]

const SIZE_ROOM_COUNTS: Record<DungeonSize, [number, number]> = {
  lair: [3, 5],
  small: [5, 8],
  medium: [8, 12],
  large: [12, 20],
  megadungeon: [20, 30],
}

const SIZE_DEPTHS: Record<DungeonSize, number> = {
  lair: 1,
  small: 1,
  medium: 2,
  large: 3,
  megadungeon: 5,
}

/**
 * Generate a dungeon from the given options.
 * Returns a GeneratedDungeon suitable for storing on a POI.
 */
export function generateDungeon(seed: string, options: DungeonGenOptions): GeneratedDungeon {
  const { theme, size } = options
  const rng = new SeededRandom(`${seed}-dungeon-gen`)

  const name = generateDungeonName(rng, theme)
  const [minRooms, maxRooms] = SIZE_ROOM_COUNTS[size]
  const roomCount = rng.between(minRooms, maxRooms)
  const depth = SIZE_DEPTHS[size]

  // Generate spatial layout
  const layoutGenerator = new DungeonLayoutGenerator(seed)
  const layout = layoutGenerator.generate(size, theme, roomCount)

  // Mark dead-end rooms
  markDeadEnds(layout.rooms, layout.passages)

  // Apply theme room types via blueprint
  applyBlueprint(theme, layout.rooms, layout.passages, seed)

  // Add content (features, secrets) to each room
  const rooms = layout.rooms.map((room) => addRoomContent(rng, room))

  // Place Cairn-style traps
  placeTraps(theme, rooms, layout.passages, seed)

  // Generate dungeon ecology
  const ecology = generateDungeonEcology(theme, rooms, seed)

  // Generate history layers and distribute clues to rooms
  const historyLayers = generateDungeonHistory(theme, rooms, seed)
  if (historyLayers.length > 0) {
    ecology.historyLayers = historyLayers
  }

  // Generate wandering monster table, led by the dungeon's current inhabitants
  const wanderingMonsters = generateWanderingMonsters(theme, depth, seed, ecology.inhabitantCreature)

  // Generate dungeon NPCs
  const dungeonNPCs = generateDungeonNPCs(theme, rooms, seed)

  // Generate key-lock pairs
  const keyLockPairs = generateKeyLocks(theme, rooms, layout.passages, seed)

  return {
    name,
    size,
    theme,
    depth,
    gridWidth: layout.gridWidth,
    gridHeight: layout.gridHeight,
    rooms,
    passages: layout.passages,
    entranceRoomId: rooms[0]?.id ?? '',
    ecology,
    wanderingMonsters,
    dungeonNPCs,
    keyLockPairs,
  }
}

function addRoomContent(rng: SeededRandom, room: SpatialRoom): SpatialRoom {
  const features: RoomFeature[] = []
  const featureCount = rng.between(0, 2)
  if (featureCount > 0) features.push(...rng.sample(ROOM_FEATURES, featureCount))

  const secrets: RoomSecret[] = []
  if (rng.chance(0.15)) {
    const secret = rng.pick(SECRETS)
    secrets.push({ ...secret, discovered: false })
  }

  return { ...room, features, hazards: [], secrets }
}

function generateDungeonName(rng: SeededRandom, theme: DungeonTheme): string {
  const adj = rng.pick(DUNGEON_ADJECTIVES)
  const noun = rng.pick(DUNGEON_NOUNS[theme])
  return `The ${adj} ${noun}`
}
