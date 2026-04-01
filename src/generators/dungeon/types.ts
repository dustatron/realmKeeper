/**
 * Dungeon generator types - extracted from hexbinder models.
 * These are generation-only types (not stored in Dexie directly).
 */

export type DungeonTheme =
  | 'tomb'
  | 'cave'
  | 'temple'
  | 'mine'
  | 'fortress'
  | 'sewer'
  | 'crypt'
  | 'lair'
  | 'shrine'
  | 'bandit_hideout'
  | 'cultist_lair'
  | 'witch_hut'
  | 'sea_cave'
  | 'beast_den'
  | 'floating_keep'

export type DungeonSize = 'lair' | 'small' | 'medium' | 'large' | 'megadungeon'

export type RoomType =
  | 'entrance'
  | 'exit'
  | 'corridor'
  | 'chamber'
  | 'shrine'
  | 'treasury'
  | 'prison'
  | 'lair'
  | 'trap_room'

export type RoomSize = 'cramped' | 'small' | 'medium' | 'large' | 'vast'

export type RoomGeometry = 'corridor' | 'chamber' | 'gallery' | 'alcove'

export type CreatureActivity =
  | 'sleeping'
  | 'eating'
  | 'patrolling'
  | 'guarding'
  | 'worshipping'
  | 'working'
  | 'hiding'
  | 'fighting'
  | 'socializing'

export type CellState = 'empty' | 'room' | 'passage' | 'reserved' | 'blocked'

export type PlacementDirection = 'n' | 's' | 'e' | 'w'

export interface GridPoint {
  x: number
  y: number
}

export interface GridRect {
  x: number
  y: number
  width: number
  height: number
}

export const ROOM_DIMENSIONS: Record<
  RoomSize,
  { minW: number; maxW: number; minH: number; maxH: number }
> = {
  cramped: { minW: 2, maxW: 3, minH: 2, maxH: 3 },
  small: { minW: 3, maxW: 4, minH: 3, maxH: 4 },
  medium: { minW: 4, maxW: 6, minH: 4, maxH: 6 },
  large: { minW: 5, maxW: 8, minH: 5, maxH: 8 },
  vast: { minW: 6, maxW: 9, minH: 6, maxH: 9 },
}

export const DUNGEON_GRID_SIZES: Record<DungeonSize, number> = {
  lair: 40,
  small: 60,
  medium: 80,
  large: 100,
  megadungeon: 150,
}

export type EncounterBehavior = 'hostile' | 'neutral' | 'negotiable' | 'fleeing'

export interface Encounter {
  id: string
  creatureType: string
  count: number
  behavior: EncounterBehavior
  notes?: string
  defeated: boolean
}

export type TreasureType = 'coins' | 'gems' | 'art' | 'item' | 'magic_item'

export interface TreasureEntry {
  id: string
  type: TreasureType
  name: string
  value?: string
  description?: string
  looted: boolean
}

export interface RoomFeature {
  name: string
  description: string
  interactive: boolean
}

export interface Hazard {
  name: string
  description: string
  damage?: string
  save?: string
  disarmed: boolean
  trigger?: string
  passiveHint?: string
  activeHint?: string
  disarmMethods?: string[]
  consequence?: string
  targetAttribute?: 'STR' | 'DEX' | 'WIS' | 'CON'
}

export interface RoomSecret {
  description: string
  trigger: string
  reward?: string
  discovered: boolean
}

export type DiscoveryType = 'document' | 'evidence' | 'clue' | 'secret'

export interface Discovery {
  id: string
  type: DiscoveryType
  description: string
  content?: string
  linkedHookId?: string
  linkedItemId?: string
  found: boolean
}

export type ThemeRoomType =
  | 'entrance'
  | 'corridor'
  | 'chamber'
  | 'dead_end'
  | 'sarcophagus_chamber'
  | 'embalming_room'
  | 'burial_niches'
  | 'offering_hall'
  | 'priest_quarters'
  | 'false_tomb'
  | 'guardian_chamber'
  | 'treasure_vault'
  | 'mushroom_garden'
  | 'underground_pool'
  | 'bat_roost'
  | 'crystal_grotto'
  | 'natural_chimney'
  | 'stalactite_hall'
  | 'collapsed_section'
  | 'creature_nest'
  | 'nave'
  | 'vestry'
  | 'meditation_cells'
  | 'altar_room'
  | 'clergy_quarters'
  | 'temple_library'
  | 'reliquary'
  | 'baptistery'
  | 'ore_vein'
  | 'cart_tracks'
  | 'collapsed_tunnel'
  | 'flooded_level'
  | 'equipment_room'
  | 'ore_processing'
  | 'shaft_entrance'
  | 'support_beams'
  | 'barracks'
  | 'armory'
  | 'war_room'
  | 'prison_block'
  | 'mess_hall'
  | 'watchtower'
  | 'throne_room'
  | 'secret_escape'
  | 'junction'
  | 'overflow_chamber'
  | 'maintenance_access'
  | 'rat_nest'
  | 'smuggler_cache'
  | 'toxic_pool'
  | 'drain_grate'
  | 'ossuary'
  | 'charnel_pit'
  | 'memorial_hall'
  | 'burial_alcoves'
  | 'caretaker_quarters'
  | 'sealed_vault'
  | 'ritual_chamber'
  | 'nest'
  | 'feeding_area'
  | 'bone_pile'
  | 'sleeping_den'
  | 'trophy_room'
  | 'entrance_cave'
  | 'sacred_pool'
  | 'meditation_garden'
  | 'offering_altar'
  | 'pilgrim_shelter'
  | 'oracle_chamber'
  | 'relic_display'
  | 'lookout_post'
  | 'sleeping_quarters'
  | 'loot_storage'
  | 'planning_room'
  | 'escape_tunnel'
  | 'prisoner_hold'
  | 'common_area'
  | 'summoning_circle'
  | 'sacrifice_altar'
  | 'initiates_quarters'
  | 'leaders_chamber'
  | 'forbidden_library'
  | 'ritual_pool'
  | 'potion_workshop'
  | 'ingredient_storage'
  | 'divination_room'
  | 'sleeping_loft'
  | 'garden_access'
  | 'familiar_den'
  | 'tidal_pool'
  | 'smuggler_dock'
  | 'treasure_grotto'
  | 'kelp_garden'
  | 'shell_shrine'
  | 'underwater_passage'
  | 'primary_nest'
  | 'feeding_ground'
  | 'bone_yard'
  | 'young_nursery'
  | 'territorial_marker'
  | 'water_source'
  | 'observation_deck'
  | 'arcane_engine'
  | 'sky_dock'
  | 'wind_shrine'
  | 'cloud_garden'
  | 'storm_chamber'

export interface ThemeRoomConfig {
  type: ThemeRoomType
  names: string[]
  description: string
  geometries: RoomGeometry[]
  minSize?: RoomSize
  features?: string[]
  treasureBonus: number
  encounterBonus: number
}

export interface AdjacencyRule {
  roomType: ThemeRoomType
  preferred: ThemeRoomType[]
  forbidden: ThemeRoomType[]
}

export interface TrapTemplate {
  name: string
  description: string
  damage: string
  save: string
  themes: (DungeonTheme | '*')[]
  locations: ('room' | 'passage')[]
  trigger: string
  passiveHint: string
  activeHint: string
  disarmMethods: string[]
  consequence: string
  targetAttribute: 'STR' | 'DEX' | 'WIS' | 'CON'
}

export interface DungeonBlueprint {
  theme: DungeonTheme
  requiredRooms: ThemeRoomType[]
  optionalRooms: ThemeRoomType[]
  bossRoom: ThemeRoomType
  adjacencyRules: AdjacencyRule[]
  creaturePool: string[]
  trapPool: TrapTemplate[]
  emptyRoomDescriptions: string[]
}

export interface RoomConnection {
  fromRoomId: string
  toRoomId: string
  type: 'door' | 'archway' | 'passage' | 'stairs' | 'ladder' | 'secret'
  locked: boolean
  hidden: boolean
}

export interface SpatialRoom {
  id: string
  name: string
  description: string
  type: RoomType
  size: RoomSize
  depth: number
  bounds: GridRect
  encounters: Encounter[]
  treasure: TreasureEntry[]
  features: RoomFeature[]
  hazards: Hazard[]
  secrets: RoomSecret[]
  discoveries?: Discovery[]
  explored: boolean
  themeRoomType?: ThemeRoomType
  geometry?: RoomGeometry
  isDeadEnd?: boolean
  activity?: CreatureActivity
  historicalClues?: string[]
}

export interface Passage {
  id: string
  fromRoomId: string
  toRoomId: string
  waypoints: GridPoint[]
  connectionType: RoomConnection['type']
  locked: boolean
  hidden: boolean
  trap?: Hazard
  keyId?: string
}

export interface WanderingMonsterEntry {
  creatureType: string
  count: string
  weight: number
  activity: string
}

export interface WanderingMonsterTable {
  checkFrequency: string
  entries: WanderingMonsterEntry[]
}

export interface KeyLockPair {
  keyId: string
  keyName: string
  keyRoomId: string
  lockedPassageId: string
  keyDescription?: string
  lockRoomId?: string
  lockDescription?: string
  clueText?: string
}

export interface HistoryLayer {
  era: string
  builders: string
  fate: string
  clueTypes: string[]
}

export interface DungeonFactionProfile {
  name: string
  factionId?: string
  creaturePool: string[]
  leaderCreature: string
  organization: 'tribal' | 'military' | 'horde' | 'cult' | 'solitary'
}

export interface RoomActivityAssignment {
  roomId: string
  creatures: string[]
  count: number
  activity: CreatureActivity
  schedule?: 'day' | 'night' | 'always'
}

export interface DungeonEcology {
  builderCulture?: string
  currentInhabitants?: string
  history?: string
  factionInfluence?: Record<string, string[]>
  builders?: DungeonFactionProfile
  historyLayers?: HistoryLayer[]
  inhabitants?: DungeonFactionProfile
  activities?: RoomActivityAssignment[]
}

export type DungeonNPCCategory =
  | 'rival_party'
  | 'prisoner'
  | 'hermit'
  | 'ghost'
  | 'refugee'
  | 'faction_leader'
  | 'faction_lieutenant'
  | 'faction_member'
  | 'rival_scout'

export type DungeonNPCDisposition = 'hostile' | 'wary' | 'neutral' | 'friendly'

export type DungeonNPCWant =
  | 'food'
  | 'safety'
  | 'wealth'
  | 'revenge'
  | 'freedom'
  | 'information'
  | 'companionship'
  | 'power'

export interface DungeonNPC {
  npcId: string
  category: DungeonNPCCategory
  roomId: string
  disposition: DungeonNPCDisposition
  wants?: DungeonNPCWant[]
  hasInfo?: string
  hasItem?: string
  wantsRescue?: boolean
  partySize?: number
  factionId?: string
  isBoss?: boolean
  scoutingFor?: string
}

export interface SpatialDungeon {
  id: string
  name: string
  type: 'dungeon'
  description: string
  tags: string[]
  size: DungeonSize
  theme: DungeonTheme
  depth: number
  gridWidth: number
  gridHeight: number
  rooms: SpatialRoom[]
  passages: Passage[]
  entranceRoomId: string
  cleared: boolean
  linkedHookIds: string[]
  ecology?: DungeonEcology
  wanderingMonsters?: WanderingMonsterTable
  dungeonNPCs?: DungeonNPC[]
  keyLockPairs?: KeyLockPair[]
}
