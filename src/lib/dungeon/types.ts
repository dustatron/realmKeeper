/**
 * Dungeon generator types — ported from hexbinder.
 * These are internal to the dungeon generation system.
 * The use case layer maps these to realmKeeper domain types.
 */

// === Core Dungeon Types ===

export type DungeonSize = 'lair' | 'small' | 'medium' | 'large' | 'megadungeon'

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

export type DiscoveryType = 'document' | 'evidence' | 'clue' | 'secret'

// === Grid Types ===

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

// === Room Content ===

export interface RoomFeature {
  name: string
  description: string
  interactive: boolean
}

/** Cairn-style hazard with telegraphed warnings and disarm methods */
export interface DungeonHazard {
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

export interface DungeonEncounter {
  id: string
  creatureType: string
  count: number
  behavior: 'hostile' | 'neutral' | 'negotiable' | 'fleeing'
  notes?: string
  defeated: boolean
}

export interface DungeonTreasureEntry {
  id: string
  type: 'coins' | 'gems' | 'art' | 'item' | 'magic_item'
  name: string
  value?: string
  description?: string
  looted: boolean
}

export interface Discovery {
  id: string
  type: DiscoveryType
  description: string
  content?: string
  linkedHookId?: string
  found: boolean
}

// === Spatial Layout ===

export interface SpatialRoom {
  id: string
  name: string
  description: string
  type: RoomType
  size: RoomSize
  depth: number
  bounds: GridRect
  encounters: DungeonEncounter[]
  treasure: DungeonTreasureEntry[]
  features: RoomFeature[]
  hazards: DungeonHazard[]
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
  connectionType: 'door' | 'archway' | 'passage' | 'stairs' | 'ladder' | 'secret'
  locked: boolean
  hidden: boolean
  trap?: DungeonHazard
  keyId?: string
}

// === Ecology ===

export interface HistoryLayer {
  era: string
  builders: string
  fate: string
  clueTypes: string[]
}

export interface DungeonEcology {
  builderCulture?: string
  currentInhabitants?: string
  history?: string
  factionInfluence?: Record<string, string[]>
  historyLayers?: HistoryLayer[]
}

// === Wandering Monsters (internal to generator) ===

export interface GeneratorWanderingMonsterEntry {
  creatureType: string
  count: string
  weight: number
  activity: string
}

export interface GeneratorWanderingMonsterTable {
  checkFrequency: string
  entries: GeneratorWanderingMonsterEntry[]
}

// === Key Locks ===

export interface KeyLockPair {
  keyId: string
  keyName: string
  keyRoomId: string
  lockedPassageId: string
}

// === Dungeon NPCs ===

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

export interface GeneratedDungeonNPC {
  npcId: string
  category: DungeonNPCCategory
  roomId: string
  disposition: DungeonNPCDisposition
  wants?: DungeonNPCWant[]
  hasInfo?: string
  wantsRescue?: boolean
  partySize?: number
}

// === Blueprint Types ===

export type ThemeRoomType =
  | 'entrance' | 'corridor' | 'chamber' | 'dead_end'
  // Tomb
  | 'sarcophagus_chamber' | 'embalming_room' | 'burial_niches' | 'offering_hall'
  | 'priest_quarters' | 'false_tomb' | 'guardian_chamber' | 'treasure_vault'
  // Cave
  | 'mushroom_garden' | 'underground_pool' | 'bat_roost' | 'crystal_grotto'
  | 'natural_chimney' | 'stalactite_hall' | 'collapsed_section' | 'creature_nest'
  // Temple
  | 'nave' | 'vestry' | 'meditation_cells' | 'altar_room' | 'clergy_quarters'
  | 'temple_library' | 'reliquary' | 'baptistery'
  // Mine
  | 'ore_vein' | 'cart_tracks' | 'collapsed_tunnel' | 'flooded_level'
  | 'equipment_room' | 'ore_processing' | 'shaft_entrance' | 'support_beams'
  // Fortress
  | 'barracks' | 'armory' | 'war_room' | 'prison_block' | 'mess_hall'
  | 'watchtower' | 'throne_room' | 'secret_escape'
  // Sewer
  | 'junction' | 'overflow_chamber' | 'maintenance_access' | 'rat_nest'
  | 'smuggler_cache' | 'toxic_pool' | 'drain_grate'
  // Crypt
  | 'ossuary' | 'charnel_pit' | 'memorial_hall' | 'burial_alcoves'
  | 'caretaker_quarters' | 'sealed_vault' | 'ritual_chamber'
  // Lair
  | 'nest' | 'feeding_area' | 'bone_pile' | 'sleeping_den' | 'trophy_room' | 'entrance_cave'
  // Shrine
  | 'sacred_pool' | 'meditation_garden' | 'offering_altar' | 'pilgrim_shelter'
  | 'oracle_chamber' | 'relic_display'
  // Bandit Hideout
  | 'lookout_post' | 'sleeping_quarters' | 'loot_storage' | 'planning_room'
  | 'escape_tunnel' | 'prisoner_hold' | 'common_area'
  // Cultist Lair
  | 'summoning_circle' | 'sacrifice_altar' | 'initiates_quarters' | 'leaders_chamber'
  | 'forbidden_library' | 'ritual_pool'
  // Witch Hut
  | 'potion_workshop' | 'ingredient_storage' | 'divination_room' | 'sleeping_loft'
  | 'garden_access' | 'familiar_den'
  // Sea Cave
  | 'tidal_pool' | 'smuggler_dock' | 'treasure_grotto' | 'kelp_garden'
  | 'shell_shrine' | 'underwater_passage'
  // Beast Den
  | 'primary_nest' | 'feeding_ground' | 'bone_yard' | 'young_nursery'
  | 'territorial_marker' | 'water_source'
  // Floating Keep
  | 'observation_deck' | 'arcane_engine' | 'sky_dock' | 'wind_shrine'
  | 'cloud_garden' | 'storm_chamber'

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

// === Generated Dungeon (stored on POI) ===

/** Output of the dungeon generator, stored on the dungeon POI */
export interface GeneratedDungeon {
  name: string
  size: DungeonSize
  theme: DungeonTheme
  depth: number
  gridWidth: number
  gridHeight: number
  rooms: SpatialRoom[]
  passages: Passage[]
  entranceRoomId: string
  ecology?: DungeonEcology
  wanderingMonsters?: GeneratorWanderingMonsterTable
  dungeonNPCs?: GeneratedDungeonNPC[]
  keyLockPairs?: KeyLockPair[]
  /** Maps generated room.id → child POI id (populated by use case after creating child POIs) */
  roomPoiMap?: Record<string, string>
  /** Room IDs that received generated treasure (populated by use case) */
  roomHasTreasure?: string[]
}

/** Options used to generate a dungeon — persisted for regen */
export interface DungeonGenOptions {
  seed: string
  theme: DungeonTheme
  size: DungeonSize
  treasureLevel: 'poor' | 'standard' | 'rich' | 'hoard'
  dangerLevel: 'low' | 'medium' | 'deadly' | 'very_deadly'
  includeWeapons: boolean
  includeGear: boolean
  magicItemCount: number
  spellCount: number
  exitPoiIds: string[]
}

// === Dimension constants ===

export const DUNGEON_GRID_SIZES: Record<DungeonSize, number> = {
  lair: 40,
  small: 60,
  medium: 80,
  large: 100,
  megadungeon: 150,
}
