import type { Store } from '@livestore/livestore'
import type { schema } from '@infrastructure/livestore/schema'
import { RealmRepository } from '@infrastructure/livestore/repositories/RealmRepository'
import { RegionRepository } from '@infrastructure/livestore/repositories/RegionRepository'
import { FactionRepository } from '@infrastructure/livestore/repositories/FactionRepository'
import { NPCRepository } from '@infrastructure/livestore/repositories/NPCRepository'
import { FactionRelationshipRepository } from '@infrastructure/livestore/repositories/FactionRelationshipRepository'
import { WorldEventRepository } from '@infrastructure/livestore/repositories/WorldEventRepository'
import { WeatherRepository } from '@infrastructure/livestore/repositories/WeatherRepository'
import { RealmNoteRepository } from '@infrastructure/livestore/repositories/RealmNoteRepository'
import { POIRepository } from '@infrastructure/livestore/repositories/POIRepository'
import { PathRepository } from '@infrastructure/livestore/repositories/PathRepository'
import { TableRepository } from '@infrastructure/livestore/repositories/TableRepository'
import { RollHistoryRepository } from '@infrastructure/livestore/repositories/RollHistoryRepository'
import { SystemConfigRepository } from '@infrastructure/livestore/repositories/SystemConfigRepository'
import { FactionPresenceRepository } from '@infrastructure/livestore/repositories/FactionPresenceRepository'
import { POIEventRepository } from '@infrastructure/livestore/repositories/POIEventRepository'
import { GameMapRepository } from '@infrastructure/livestore/repositories/GameMapRepository'
import { RumorRepository } from '@infrastructure/livestore/repositories/RumorRepository'
import { NoticeRepository } from '@infrastructure/livestore/repositories/NoticeRepository'
import { EncounterTableRepository } from '@infrastructure/livestore/repositories/EncounterTableRepository'
import { EntityNoteRepository } from '@infrastructure/livestore/repositories/EntityNoteRepository'
import { CustomCompendiumRepository } from '@infrastructure/livestore/repositories/CustomCompendiumRepository'
import { EventBus } from '@infrastructure/event-bus/EventBus'

export function createContainer(store: Store<typeof schema>) {
  return {
    realmRepo: new RealmRepository(store),
    regionRepo: new RegionRepository(store),
    factionRepo: new FactionRepository(store),
    npcRepo: new NPCRepository(store),
    factionRelationshipRepo: new FactionRelationshipRepository(store),
    worldEventRepo: new WorldEventRepository(store),
    weatherRepo: new WeatherRepository(store),
    realmNoteRepo: new RealmNoteRepository(store),
    poiRepo: new POIRepository(store),
    pathRepo: new PathRepository(store),
    tableRepo: new TableRepository(store),
    rollHistoryRepo: new RollHistoryRepository(store),
    systemConfigRepo: new SystemConfigRepository(store),
    factionPresenceRepo: new FactionPresenceRepository(store),
    poiEventRepo: new POIEventRepository(store),
    gameMapRepo: new GameMapRepository(store),
    rumorRepo: new RumorRepository(store),
    noticeRepo: new NoticeRepository(store),
    encounterTableRepo: new EncounterTableRepository(store),
    entityNoteRepo: new EntityNoteRepository(store),
    customCompendiumRepo: new CustomCompendiumRepository(store),
    eventBus: new EventBus(),
  } as const
}

export type Container = ReturnType<typeof createContainer>
