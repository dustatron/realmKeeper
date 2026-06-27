import { executeUpdatePOI } from '@application/use-cases/UpdatePOI'
import { executeCreateGameMap } from '@application/use-cases/CreateGameMap'
import { executeCreateRumor } from '@application/use-cases/CreateRumor'
import { executeUpdateRumor } from '@application/use-cases/UpdateRumor'
import { executeDeleteRumor } from '@application/use-cases/DeleteRumor'
import { executeCreateNotice } from '@application/use-cases/CreateNotice'
import { executeUpdateNotice } from '@application/use-cases/UpdateNotice'
import { executeDeleteNotice } from '@application/use-cases/DeleteNotice'
import { executeRollEncounter } from '@application/use-cases/RollEncounter'
import { executeCreateEncounterTable } from '@application/use-cases/CreateEncounterTable'
import { executeUpdateEncounterTable } from '@application/use-cases/UpdateEncounterTable'
import { executeUpdateNPC } from '@application/use-cases/UpdateNPC'
import { executeCreateNPC } from '@application/use-cases/CreateNPC'
import {
  executeEncounterCascade,
  type CascadeAction,
  type CascadeContext,
  type CascadeUseCaseDeps,
} from '@application/use-cases/RollEncounterCascade'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import type { POI } from '@domain/entities/POI'
import type { Region } from '@domain/entities/Region'
import type { NPC } from '@domain/entities/NPC'
import type { Trap } from '@domain/value-objects/Trap'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { EncounterRollResult } from '@domain/value-objects/EncounterRollResult'
import type { CompendiumRef } from '@domain/entities/Compendium'
import type { Rumor } from '@domain/entities/Rumor'
import type { Notice } from '@domain/entities/Notice'
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'
import type { WatabouDungeonData } from '@domain/value-objects/WatabouDungeonData'
import type { LocationSeed } from '@domain/value-objects/LocationSeed'
import type { NoticeType } from '@shared/constants'
import type { GeneratedDungeon } from '~/lib/dungeon/types'
import { executeDeletePOI } from '@application/use-cases/DeletePOI'

type Container = {
  poiRepo: Parameters<typeof executeUpdatePOI>[1]['poiRepo']
  gameMapRepo: Parameters<typeof executeCreateGameMap>[1]['gameMapRepo']
  rumorRepo: Parameters<typeof executeCreateRumor>[1]['rumorRepo']
  noticeRepo: Parameters<typeof executeCreateNotice>[1]['noticeRepo']
  encounterTableRepo: Parameters<typeof executeCreateEncounterTable>[1]['encounterTableRepo']
  npcRepo: Parameters<typeof executeUpdateNPC>[1]['npcRepo']
  tableRepo: Parameters<typeof executeGenerateNPC>[1]['tableRepo']
}

export function usePOIActions(poi: POI | null | undefined, region: Region | null | undefined, encounterTable: EncounterTable | null | undefined, container: Container, systemConfig: SystemConfig | null | undefined) {
  const handleUpdateTraps = async (traps: Trap[]) => {
    if (!poi) return
    await executeUpdatePOI({ ...poi, traps }, { poiRepo: container.poiRepo })
  }

  const handleToggleTrapDisarmed = async (trapId: string) => {
    if (!poi) return
    const updatedTraps = poi.traps.map((t) =>
      t.id === trapId ? { ...t, disarmed: !t.disarmed } : t
    )
    await executeUpdatePOI({ ...poi, traps: updatedTraps }, { poiRepo: container.poiRepo })
  }

  const handleUploadMap = async (data: { name: string; imageUrl: string; width: number; height: number }) => {
    if (!poi) return
    await executeCreateGameMap({ ...data, ownerPoiId: poi.id }, { gameMapRepo: container.gameMapRepo })
  }

  const handleCreateRumor = async (input: { text: string; source: string; isQuestHook: boolean }) => {
    if (!poi || !region) return
    await executeCreateRumor(
      { poiId: poi.id, regionId: poi.regionId, worldId: region.worldId, ...input },
      { rumorRepo: container.rumorRepo }
    )
  }

  const handleToggleRumorUsed = async (rumor: Rumor) => {
    await executeUpdateRumor({ ...rumor, isUsed: !rumor.isUsed }, { rumorRepo: container.rumorRepo })
  }

  const handleDeleteRumor = async (id: string) => {
    await executeDeleteRumor(id, { rumorRepo: container.rumorRepo })
  }

  const handleCreateNotice = async (input: { title: string; description: string; type: NoticeType; reward: string }) => {
    if (!poi || !region) return
    await executeCreateNotice(
      { poiId: poi.id, regionId: poi.regionId, worldId: region.worldId, ...input },
      { noticeRepo: container.noticeRepo }
    )
  }

  const handleToggleNoticeUsed = async (notice: Notice) => {
    await executeUpdateNotice({ ...notice, isUsed: !notice.isUsed }, { noticeRepo: container.noticeRepo })
  }

  const handleDeleteNotice = async (id: string) => {
    await executeDeleteNotice(id, { noticeRepo: container.noticeRepo })
  }

  const handleRollEncounter = async () => {
    if (!poi || !region) throw new Error('No POI/region')
    return executeRollEncounter(
      { poiId: poi.id, regionId: poi.regionId, worldId: region.worldId },
      { encounterTableRepo: container.encounterTableRepo }
    )
  }

  const handleSaveEncounterTable = async (entries: Pick<EncounterTable, 'creature' | 'signOmen' | 'loss' | 'npc' | 'discovery' | 'treasure' | 'customSections' | 'disabledCategories'>) => {
    if (!poi || !region) return
    if (encounterTable) {
      await executeUpdateEncounterTable(
        { ...encounterTable, ...entries },
        { encounterTableRepo: container.encounterTableRepo }
      )
    } else {
      await executeCreateEncounterTable(
        { ownerPoiId: poi.id, worldId: region.worldId, ...entries },
        { encounterTableRepo: container.encounterTableRepo }
      )
    }
  }

  // Lazily create a persistable encounter-table row for this POI when none exists,
  // so the cascade's lastResult can be saved. An empty row is fine — getActiveSections
  // falls back to default entries per category.
  const ensureEncounterTableForPoi = async (p: POI, r: Region): Promise<EncounterTable> => {
    if (encounterTable) return encounterTable
    return executeCreateEncounterTable(
      { ownerPoiId: p.id, worldId: r.worldId },
      { encounterTableRepo: container.encounterTableRepo }
    )
  }

  const handleEncounterCascade = async (action: CascadeAction): Promise<EncounterRollResult> => {
    if (!poi || !region || !systemConfig) throw new Error('Missing context for encounter cascade')
    const table = await ensureEncounterTableForPoi(poi, region)
    const ctx: CascadeContext = {
      table,
      poiId: poi.id,
      regionId: poi.regionId,
      worldId: region.worldId,
      systemConfig,
    }
    const deps: CascadeUseCaseDeps = {
      encounterTableRepo: container.encounterTableRepo,
      tableRepo: container.tableRepo,
    }
    return executeEncounterCascade(action, ctx, deps)
  }

  const handleSaveEncounterNpc = async (): Promise<void> => {
    const result = encounterTable?.lastResult
    if (!poi || !result?.npc || result.npcSavedId) return
    const npc = { ...result.npc, poiId: poi.id }
    await executeCreateNPC(npc, { npcRepo: container.npcRepo })
    await container.encounterTableRepo.update({
      ...encounterTable!,
      lastResult: { ...result, npcSavedId: npc.id },
      updatedAt: Date.now(),
    })
  }

  const handleUpdateNPC = async (npc: NPC) => {
    await executeUpdateNPC(npc, { npcRepo: container.npcRepo })
  }

  const handleUpdateTreasure = async (treasure: TreasureItem[]) => {
    if (!poi) return
    await executeUpdatePOI({ ...poi, treasure }, { poiRepo: container.poiRepo })
  }

  const handleUpdateCompendiumRefs = async (refs: { monsterRefs: CompendiumRef[]; magicItemRefs: CompendiumRef[]; spellRefs: CompendiumRef[]; equipmentRefs: CompendiumRef[] }) => {
    if (!poi) return
    await executeUpdatePOI({ ...poi, ...refs }, { poiRepo: container.poiRepo })
  }

  const handleImportWatabou = async (data: WatabouCityData | WatabouDungeonData, seed: string | null) => {
    if (!poi) return
    await executeUpdatePOI(
      { ...poi, watabouData: data, watabouSeed: seed, watabouGenerator: data.type === 'mfcg' ? 'mfcg' : 'opd' },
      { poiRepo: container.poiRepo }
    )
  }

  const handleClearWatabou = async () => {
    if (!poi) return
    await executeUpdatePOI(
      { ...poi, watabouData: null, watabouSeed: null, watabouGenerator: null },
      { poiRepo: container.poiRepo }
    )
  }

  const handleUpdateLocationSeed = async (seed: LocationSeed) => {
    if (!poi) return
    await executeUpdatePOI({ ...poi, locationSeed: seed }, { poiRepo: container.poiRepo })
  }

  const handleUpdateSpatialDungeon = async (dungeon: GeneratedDungeon, deletedRoomIds?: string[]) => {
    if (!poi) return
    // Delete child POIs for any rooms that were removed from the map
    if (deletedRoomIds && deletedRoomIds.length > 0 && poi.spatialDungeon?.roomPoiMap) {
      const childPoiIds = deletedRoomIds
        .map(id => poi.spatialDungeon!.roomPoiMap![id])
        .filter(Boolean)
      await Promise.all(childPoiIds.map(id => executeDeletePOI(id, { poiRepo: container.poiRepo })))
    }
    await executeUpdatePOI({ ...poi, spatialDungeon: dungeon }, { poiRepo: container.poiRepo })
  }

  return {
    handleUpdateTraps,
    handleToggleTrapDisarmed,
    handleUploadMap,
    handleCreateRumor,
    handleToggleRumorUsed,
    handleDeleteRumor,
    handleCreateNotice,
    handleToggleNoticeUsed,
    handleDeleteNotice,
    handleRollEncounter,
    handleSaveEncounterTable,
    handleEncounterCascade,
    handleSaveEncounterNpc,
    handleUpdateNPC,
    handleUpdateTreasure,
    handleUpdateCompendiumRefs,
    handleImportWatabou,
    handleClearWatabou,
    handleUpdateLocationSeed,
    handleUpdateSpatialDungeon,
  }
}
