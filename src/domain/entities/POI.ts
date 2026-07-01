import type { PoiType, PoiStatus } from '@shared/constants'
import type { WorldDate } from '@domain/value-objects/WorldDate'
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
import type { RuinSite } from '@domain/entities/RuinSite'
import type { LandmarkLore } from '@domain/entities/LandmarkLore'

/** Structured settlement flavor — rendered as a scannable data list instead of a
 * run-on prose block. Populated at generation (or backfilled from legacy prose by
 * the v46 migration). null = not a settlement / ungenerated. */
export interface SettlementFlavor {
  knownFor: string
  character: string
  notable: string
  tradition: string
}

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
  /** Exploration lifecycle. Kept in sync with `visited` (visited === status !== 'unexplored'). */
  status: PoiStatus
  /** World-date the party last visited; stamped when marked visited/explored. */
  lastVisitedDate: WorldDate | null
  /** GM threat rating 1 (safe) – 5 (deadly). null = unrated. */
  dangerLevel: number | null
  /** Economic role: the good this settlement produces and the goods it needs. null = no trade role. */
  trade: { produces: string; needs: string[] } | null
  /** Settlement wealth band, snapshotted at generation from the trade graph. null = not a settlement / ungenerated. */
  wealthBand: 'destitute' | 'poor' | 'modest' | 'prosperous' | 'rich' | null
  /** Structured settlement flavor for the overview data list. null = not a settlement / ungenerated. */
  settlementFlavor: SettlementFlavor | null
  /** Who/what currently holds this place right now (living-world state). */
  currentOccupant: string | null
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
  ruinSite: RuinSite | null
  landmarkLore: LandmarkLore | null
  poiGenOptions: { seed: string } | null
  starred: boolean
  createdAt: number
  updatedAt: number
}
