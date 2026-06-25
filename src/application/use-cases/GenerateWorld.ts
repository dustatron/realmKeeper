import { db } from '@infrastructure/dexie/db'
import { executeCreateRealm } from '@application/use-cases/CreateRealm'
import { executeGenerateDungeon, type GenerateDungeonDeps } from '@application/use-cases/GenerateDungeon'
import { generateWorld } from '@domain/services/worldgen/generateWorld'
import type { PoiDensity } from '@domain/services/worldgen/generateWorld'
import type { POI } from '@domain/entities/POI'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'

export interface GenerateWorldDeps extends GenerateDungeonDeps {
  realmRepo: IRealmRepository
  factionRepo: IFactionRepository
  realmNoteRepo: IRealmNoteRepository
}

// Cap how many dungeons are fully built at world creation; the rest stay lazy
// stubs that generate on first open. Keeps world-gen time/volume bounded.
const PREGEN_DUNGEON_CAP = 10

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
  factionTurnTrigger?: 'day' | 'week' | 'manual'
  poiDensity?: PoiDensity
  factionCount?: number
  loomingThreat?: boolean
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

  // Load the realm's system config up front (outside the transaction) so world
  // generation can roll system-correct NPC stat blocks. Generation degrades
  // gracefully (no NPCs) if the system is somehow missing.
  const systemConfig = await db.systemConfigs.get(input.systemId)

  // One atomic transaction: the realm (+ its party faction and main note,
  // written by executeCreateRealm via the repos, which join this transaction's
  // async context) and the hex map all commit together or roll back together —
  // no orphaned realm if a later write fails. Tables listed = every table the
  // enclosed writes touch.
  await db.transaction('rw', [db.worlds, db.factions, db.factionRelationships, db.npcs, db.connections, db.hooks, db.notices, db.rumors, db.worldEvents, db.realmNotes, db.gameMaps, db.regions, db.pois, db.paths], async () => {
    const realm = await executeCreateRealm(
      {
        name: input.name,
        systemId: input.systemId,
        description: input.description ?? '',
        watchesPerDay: input.watchesPerDay,
        daysPerSeason: input.daysPerSeason,
        daysPerWeek: input.daysPerWeek,
        factionTurnTrigger: input.factionTurnTrigger,
      },
      deps
    )
    const { gameMap, regions, pois, paths, factions, factionRelationships, npcs, connections, hooks, notices, rumors, worldEvents } = generateWorld(realm.id, input.seed, {
      cols: preset.cols,
      rows: preset.rows,
      poiDensity: input.poiDensity ?? 'normal',
      factionCount: input.factionCount,
      systemConfig,
      loomingThreat: input.loomingThreat ?? true,
      clock: {
        year: realm.currentYear,
        season: realm.currentSeason,
        day: realm.currentDay,
        watch: realm.currentWatch,
        daysPerSeason: realm.daysPerSeason,
      },
    })
    await db.gameMaps.put(gameMap)
    await db.regions.bulkPut(regions)
    await db.pois.bulkPut(pois)
    await db.paths.bulkPut(paths)
    await db.factions.bulkPut(factions)
    await db.factionRelationships.bulkPut(factionRelationships)
    await db.npcs.bulkPut(npcs)
    await db.connections.bulkPut(connections)
    await db.hooks.bulkPut(hooks)
    await db.notices.bulkPut(notices)
    await db.rumors.bulkPut(rumors)
    await db.worldEvents.bulkPut(worldEvents)
    realmId = realm.id
    mapId = gameMap.id
    dungeonStubs = pois.filter((p) => p.type === 'dungeon' && p.dungeonGenOptions != null)
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

  return { realmId, mapId }
}
