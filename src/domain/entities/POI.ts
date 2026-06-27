import type { PoiType } from '@shared/constants'
import type { Service } from '@domain/value-objects/Service'
import type { Trap } from '@domain/value-objects/Trap'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { SessionLogEntry } from '@domain/value-objects/SessionLogEntry'
import type { CompendiumRef } from '@domain/entities/Compendium'
import type { LocationSeed } from '@domain/value-objects/LocationSeed'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'
import type { WatabouDungeonData } from '@domain/value-objects/WatabouDungeonData'
import type { GeneratedDungeon, DungeonGenOptions } from '~/lib/dungeon/types'

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
  /** Encounter-check chance denominator: roll 1dN, encounter on a 1. null = default (6). */
  encounterChance: number | null
  watabouSeed: string | null
  watabouGenerator: 'mfcg' | 'opd' | null
  watabouData: WatabouCityData | WatabouDungeonData | null
  sessionLog: SessionLogEntry[]
  spatialDungeon: GeneratedDungeon | null
  dungeonGenOptions: DungeonGenOptions | null
  starred: boolean
  createdAt: number
  updatedAt: number
}
