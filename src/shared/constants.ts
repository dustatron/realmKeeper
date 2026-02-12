export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const
export type Season = (typeof SEASONS)[number]

export const WATCHES = ['morning', 'afternoon', 'night'] as const
export type Watch = (typeof WATCHES)[number]

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

export const POI_TYPES = ['settlement', 'dungeon', 'landmark', 'ruin', 'camp', 'shrine', 'other'] as const
export type PoiType = (typeof POI_TYPES)[number]
