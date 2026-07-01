import { db } from '@infrastructure/dexie/db'
import { executeCreateRealm } from '@application/use-cases/CreateRealm'
import { executeGenerateDungeon, type GenerateDungeonDeps } from '@application/use-cases/GenerateDungeon'
import { executeGenerateLandmark } from '@application/use-cases/GenerateLandmark'
import { executeGenerateRuin } from '@application/use-cases/GenerateRuin'
import { generateWorld } from '@domain/services/worldgen/generateWorld'
import type { PoiDensity } from '@domain/services/worldgen/generateWorld'
import type { LootDensity } from '@domain/services/worldgen/lootDensity'
import type { POI } from '@domain/entities/POI'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { IHookRepository } from '@application/ports/IHookRepository'
import type { IRumorRepository } from '@application/ports/IRumorRepository'
import type { INoticeRepository } from '@application/ports/INoticeRepository'
import type { ITableRepository } from '@application/ports/ITableRepository'
import { executeGenerateTreasureLeads } from './GenerateTreasureLeads'

export interface GenerateWorldDeps extends GenerateDungeonDeps {
  realmRepo: IRealmRepository
  factionRepo: IFactionRepository
  realmNoteRepo: IRealmNoteRepository
  regionRepo: IRegionRepository
  hookRepo: IHookRepository
  rumorRepo: IRumorRepository
  noticeRepo: INoticeRepository
  tableRepo: ITableRepository
}

// Cap how many dungeons are fully built at world creation; the rest stay lazy
// stubs that generate on first open. Keeps world-gen time/volume bounded.
const PREGEN_DUNGEON_CAP = 10
const PREGEN_LANDMARK_CAP = 12
const PREGEN_RUIN_CAP = 8

export type WorldSize = 'small' | 'medium' | 'large'

// World size → hex grid dimensions. This is the live generation knob: it changes
// how big the generated map is. Other planned knobs (factions/danger/density) are
// not yet threaded here — they activate as their generation stages are built.
const SIZE_PRESETS: Record<WorldSize, { cols: number; rows: number }> = {
  small: { cols: 8, rows: 8 },
  medium: { cols: 12, rows: 12 },
  large: { cols: 16, rows: 16 },
}

export interface GenerateWorldInput {
  name: string
  systemId: string
  seed: string
  size: WorldSize
  description?: string
  watchesPerDay?: number
  daysPerSeason?: number
  daysPerWeek?: number
  moonCycleLength?: number
  factionTurnTrigger?: 'day' | 'week' | 'manual'
  poiDensity?: PoiDensity
  factionCount?: number
  loomingThreat?: boolean
  portals?: boolean
  worldTreasureDensity?: LootDensity
  worldMagicDensity?: LootDensity
  worldMonsterDensity?: LootDensity
  /** Chosen raw-resource names — the spine of terrain generation. */
  resources?: string[]
  /** Enabled theme packs (used by the form to propose resources; forward-compat). */
  packs?: string[]
  /** Forward-compat for later phases; accepted now, consumed in P2/P5/P6. */
  unclaimedDeposits?: boolean
  leyLines?: boolean
  doom?: string
  /** Draw NPC names from the large app-owned expanded pool. */
  expandedNames?: boolean
}

export async function executeGenerateWorld(
  input: GenerateWorldInput,
  deps: GenerateWorldDeps
): Promise<{ realmId: string; mapId: string }> {
  const preset = SIZE_PRESETS[input.size]
  let realmId = ''
  let mapId = ''
  // Dungeon stubs to fully build after the main transaction commits (the dungeon
  // generator reads the committed POI). Captured inside the transaction.
  let dungeonStubs: POI[] = []
  let landmarkStubs: POI[] = []
  let ruinStubs: POI[] = []

  // Load the realm's system config up front (outside the transaction) so world
  // generation can roll system-correct NPC stat blocks. Generation degrades
  // gracefully (no NPCs) if the system is somehow missing.
  const systemConfig = await db.systemConfigs.get(input.systemId)

  // Resolve the table registry (built-ins + user custom tables) once, then pass
  // the pure snapshot into the domain generator. Live custom-table edits drive
  // generation; built-ins are the fallback.
  const tables = await deps.tableRepo.resolveAll()

  // One atomic transaction: the realm (+ its party faction and main note,
  // written by executeCreateRealm via the repos, which join this transaction's
  // async context) and the hex map all commit together or roll back together —
  // no orphaned realm if a later write fails. Tables listed = every table the
  // enclosed writes touch.
  await db.transaction('rw', [db.worlds, db.factions, db.factionPresences, db.factionRelationships, db.npcs, db.connections, db.hooks, db.notices, db.rumors, db.worldEvents, db.poiEvents, db.realmNotes, db.gameMaps, db.regions, db.pois, db.paths, db.dooms], async () => {
    const realm = await executeCreateRealm(
      {
        name: input.name,
        systemId: input.systemId,
        description: input.description ?? '',
        watchesPerDay: input.watchesPerDay,
        daysPerSeason: input.daysPerSeason,
        daysPerWeek: input.daysPerWeek,
        moonCycleLength: input.moonCycleLength,
        factionTurnTrigger: input.factionTurnTrigger,
      },
      deps
    )
    const { gameMap, regions, pois, paths, factions, factionPresences, factionRelationships, npcs, connections, hooks, notices, rumors, worldEvents, poiEvents, doom } = generateWorld(realm.id, input.seed, {
      cols: preset.cols,
      rows: preset.rows,
      systemId: input.systemId,
      poiDensity: input.poiDensity ?? 'normal',
      factionCount: input.factionCount,
      systemConfig,
      tables,
      resources: input.resources,
      unclaimedDeposits: input.unclaimedDeposits,
      loomingThreat: input.loomingThreat ?? true,
      doom: input.doom,
      expandedNames: input.expandedNames ?? false,
      portals: input.portals ?? true,
      realmContent: {
        treasureDensity: input.worldTreasureDensity ?? 'moderate',
        magicDensity: input.worldMagicDensity ?? 'moderate',
        monsterDensity: input.worldMonsterDensity ?? 'moderate',
      },
      clock: {
        year: realm.currentYear,
        season: realm.currentSeason,
        day: realm.currentDay,
        watch: realm.currentWatch,
        daysPerSeason: realm.daysPerSeason,
        watchesPerDay: realm.watchesPerDay,
      },
    })
    await db.gameMaps.put(gameMap)
    await db.regions.bulkPut(regions)
    await db.pois.bulkPut(pois)
    await db.paths.bulkPut(paths)
    await db.factions.bulkPut(factions)
    await db.factionPresences.bulkPut(factionPresences)
    await db.factionRelationships.bulkPut(factionRelationships)
    await db.npcs.bulkPut(npcs)
    await db.connections.bulkPut(connections)
    await db.hooks.bulkPut(hooks)
    await db.notices.bulkPut(notices)
    await db.rumors.bulkPut(rumors)
    await db.worldEvents.bulkPut(worldEvents)
    await db.poiEvents.bulkPut(poiEvents)
    if (doom) await db.dooms.put(doom)
    realmId = realm.id
    mapId = gameMap.id
    dungeonStubs = pois.filter((p) => p.type === 'dungeon' && p.dungeonGenOptions != null)
    landmarkStubs = pois.filter((p) => p.type === 'landmark')
    ruinStubs = pois.filter((p) => p.type === 'ruin')
  })

  // Pre-generate dungeons (rooms, monsters, treasure, paths) up to the cap, so
  // they open ready instead of as stubs. Runs after the main transaction since
  // executeGenerateDungeon reads each committed POI; the rest stay lazy stubs.
  for (const stub of dungeonStubs.slice(0, PREGEN_DUNGEON_CAP)) {
    await executeGenerateDungeon(
      {
        poiId: stub.id,
        worldId: realmId,
        systemId: input.systemId,
        options: stub.dungeonGenOptions!,
      },
      deps
    )
  }

  // Pre-generate landmarks (lore) up to the cap, so they open ready instead of
  // as blank stubs. Runs after the main transaction since executeGenerateLandmark
  // reads each committed POI and its region.
  for (const stub of landmarkStubs.slice(0, PREGEN_LANDMARK_CAP)) {
    await executeGenerateLandmark(
      { poiId: stub.id, seed: `${input.seed}-landmark-${stub.id}` },
      { poiRepo: deps.poiRepo, regionRepo: deps.regionRepo },
    )
  }

  // Pre-generate ruins (areas, occupants, loot) up to the cap. A shared
  // usedHistory Set deduplicates builder culture + fate across ruins in the realm.
  const usedHistory = new Set<string>()
  for (const stub of ruinStubs.slice(0, PREGEN_RUIN_CAP)) {
    await executeGenerateRuin(
      { poiId: stub.id, worldId: realmId, systemId: input.systemId, seed: `${input.seed}-ruin-${stub.id}`, usedHistory },
      { poiRepo: deps.poiRepo, npcRepo: deps.npcRepo, regionRepo: deps.regionRepo, factionRepo: deps.factionRepo }
    )
  }

  // Post-pass: generate treasure leads now that POIs/NPCs are fully seeded
  await executeGenerateTreasureLeads(
    { worldId: realmId, seed: `${input.seed}-leads` },
    { poiRepo: deps.poiRepo, npcRepo: deps.npcRepo, regionRepo: deps.regionRepo, hookRepo: deps.hookRepo, rumorRepo: deps.rumorRepo, noticeRepo: deps.noticeRepo, factionRepo: deps.factionRepo },
  )

  return { realmId, mapId }
}
