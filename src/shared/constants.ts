export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const
export type Season = (typeof SEASONS)[number]

// Watches are numeric (1-based). No named constants — count is per-realm via watchesPerDay.
export type Watch = number
export const DEFAULT_WATCHES_PER_DAY = 3

export const DEFAULT_DAYS_PER_SEASON = 30

export const RELATIONSHIP_SCALE = {
  '-6': 'Blood Feud',
  '-5': 'Hatred',
  '-4': 'Hostility',
  '-3': 'Animosity',
  '-2': 'Distrust',
  '-1': 'Suspicion',
  '0': 'Neutral',
  '1': 'Curiosity',
  '2': 'Respect',
  '3': 'Friendship',
  '4': 'Alliance',
  '5': 'Devotion',
  '6': 'Unbreakable Bond',
} as const

export const FACTION_STATUSES = ['active', 'dormant', 'disbanded', 'destroyed'] as const
export type FactionStatus = (typeof FACTION_STATUSES)[number]

export const POI_TYPES = [
  'settlement', 'building', 'interior', 'fortification',
  'dungeon', 'natural', 'landmark', 'district',
  'zone', 'ruin', 'camp', 'shrine', 'other',
] as const
export type PoiType = (typeof POI_TYPES)[number]

export const PATH_TYPES = [
  'road', 'trail', 'river', 'sea_route',
  'door', 'stairs', 'hallway', 'passage',
  'ladder', 'portal', 'bridge', 'gate', 'other',
] as const
export type PathType = (typeof PATH_TYPES)[number]

export const TERRAIN_TYPES = [
  'plains', 'forest', 'hills', 'mountain',
  'swamp', 'desert', 'coast', 'road',
  'highlands', 'fields', 'wetlands',
] as const
export type TerrainType = (typeof TERRAIN_TYPES)[number]

export const NPC_RACES = ['human', 'elf', 'dwarf', 'halfling', 'half-orc', 'half-elf', 'goblin', 'other'] as const
export type NPCRace = (typeof NPC_RACES)[number]

export const NPC_LIFE_STATUSES = ['alive', 'dead', 'undead', 'ghost'] as const
export type LifeStatus = (typeof NPC_LIFE_STATUSES)[number]

export const NPC_MOVEMENT_STATUSES = ['present', 'traveling', 'missing', 'captured', 'hiding', 'escaping'] as const
export type MovementStatus = (typeof NPC_MOVEMENT_STATUSES)[number]

export const FACTION_PRESENCE_TYPES = ['controls', 'operates', 'contests', 'patrols', 'hidden'] as const
export type FactionPresenceType = (typeof FACTION_PRESENCE_TYPES)[number]

export const POI_EVENT_TYPES = [
  'festival', 'market', 'ceremony', 'disaster',
  'siege', 'weather', 'migration', 'political',
  'supernatural', 'custom',
] as const
export type POIEventType = (typeof POI_EVENT_TYPES)[number]

export const NOTICE_TYPES = ['bounty', 'job', 'warning', 'announcement', 'request'] as const
export type NoticeType = (typeof NOTICE_TYPES)[number]

export const ENCOUNTER_CATEGORIES = ['creature', 'signOmen', 'loss', 'npc', 'discovery', 'treasure'] as const
export type EncounterCategory = (typeof ENCOUNTER_CATEGORIES)[number]
