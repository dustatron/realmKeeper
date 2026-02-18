import type { PoiType } from '@shared/constants'
import type { Service } from '@domain/value-objects/Service'
import type { Trap } from '@domain/value-objects/Trap'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { SessionLogEntry } from '@domain/value-objects/SessionLogEntry'
import type { CompendiumRef } from '@domain/entities/Compendium'
import type { LocationSeed } from '@domain/value-objects/LocationSeed'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'

export interface POI {
  id: string
  regionId: string
  parentPoiId: string | null
  name: string
  description: string
  type: PoiType
  subtypeLabel: string | null
  floor: number | null
  tags: string[]
  position: { x: number; y: number } | null
  mapRef: string | null
  markerColor: string | null
  readAloud: string
  gmNotes: string
  trouble: string
  mood: string
  sensory: string
  services: Service[]
  imageUrl: string | null
  monsterRefs: CompendiumRef[]
  magicItemRefs: CompendiumRef[]
  spellRefs: CompendiumRef[]
  equipmentRefs: CompendiumRef[]
  locationSeed: LocationSeed | null
  traps: Trap[]
  treasure: TreasureItem[]
  roomWidth: number | null
  roomLength: number | null
  visited: boolean
  lightLevel: 'bright' | 'dim' | 'dark' | null
  wanderingMonsters: WanderingMonsterEntry[]
  sessionLog: SessionLogEntry[]
  starred: boolean
  createdAt: number
  updatedAt: number
}
