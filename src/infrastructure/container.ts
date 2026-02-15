import { RealmRepository } from '@infrastructure/dexie/repositories/RealmRepository'
import { RegionRepository } from '@infrastructure/dexie/repositories/RegionRepository'
import { FactionRepository } from '@infrastructure/dexie/repositories/FactionRepository'
import { NPCRepository } from '@infrastructure/dexie/repositories/NPCRepository'
import { FactionRelationshipRepository } from '@infrastructure/dexie/repositories/FactionRelationshipRepository'
import { WorldEventRepository } from '@infrastructure/dexie/repositories/WorldEventRepository'
import { WeatherRepository } from '@infrastructure/dexie/repositories/WeatherRepository'
import { RealmNoteRepository } from '@infrastructure/dexie/repositories/RealmNoteRepository'
import { POIRepository } from '@infrastructure/dexie/repositories/POIRepository'
import { PathRepository } from '@infrastructure/dexie/repositories/PathRepository'
import { TableRepository } from '@infrastructure/dexie/repositories/TableRepository'
import { RollHistoryRepository } from '@infrastructure/dexie/repositories/RollHistoryRepository'
import { SystemConfigRepository } from '@infrastructure/dexie/repositories/SystemConfigRepository'
import { FactionPresenceRepository } from '@infrastructure/dexie/repositories/FactionPresenceRepository'
import { POIEventRepository } from '@infrastructure/dexie/repositories/POIEventRepository'
import { GameMapRepository } from '@infrastructure/dexie/repositories/GameMapRepository'
import { RumorRepository } from '@infrastructure/dexie/repositories/RumorRepository'
import { NoticeRepository } from '@infrastructure/dexie/repositories/NoticeRepository'
import { EncounterTableRepository } from '@infrastructure/dexie/repositories/EncounterTableRepository'
import { EventBus } from '@infrastructure/event-bus/EventBus'

export function createContainer() {
  return {
    realmRepo: new RealmRepository(),
    regionRepo: new RegionRepository(),
    factionRepo: new FactionRepository(),
    npcRepo: new NPCRepository(),
    factionRelationshipRepo: new FactionRelationshipRepository(),
    worldEventRepo: new WorldEventRepository(),
    weatherRepo: new WeatherRepository(),
    realmNoteRepo: new RealmNoteRepository(),
    poiRepo: new POIRepository(),
    pathRepo: new PathRepository(),
    tableRepo: new TableRepository(),
    rollHistoryRepo: new RollHistoryRepository(),
    systemConfigRepo: new SystemConfigRepository(),
    factionPresenceRepo: new FactionPresenceRepository(),
    poiEventRepo: new POIEventRepository(),
    gameMapRepo: new GameMapRepository(),
    rumorRepo: new RumorRepository(),
    noticeRepo: new NoticeRepository(),
    encounterTableRepo: new EncounterTableRepository(),
    eventBus: new EventBus(),
  } as const
}

export type Container = ReturnType<typeof createContainer>
