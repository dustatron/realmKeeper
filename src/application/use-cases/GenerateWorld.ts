import { db } from '@infrastructure/dexie/db'
import { executeCreateRealm } from '@application/use-cases/CreateRealm'
import { buildTinyHexMap } from '@domain/services/worldgen/generateTinyWorld'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'

export interface GenerateWorldDeps {
  realmRepo: IRealmRepository
  factionRepo: IFactionRepository
  realmNoteRepo: IRealmNoteRepository
}

export async function executeGenerateWorld(
  input: { name: string; systemId: string; seed: string },
  deps: GenerateWorldDeps
): Promise<{ realmId: string; mapId: string }> {
  let realmId = ''
  let mapId = ''

  // One atomic transaction: the realm (+ its party faction and main note,
  // written by executeCreateRealm via the repos, which join this transaction's
  // async context) and the hex map all commit together or roll back together —
  // no orphaned realm if a later write fails. Tables listed = every table the
  // enclosed writes touch.
  await db.transaction('rw', db.worlds, db.factions, db.realmNotes, db.gameMaps, async () => {
    const realm = await executeCreateRealm(
      { name: input.name, systemId: input.systemId, description: '' },
      deps
    )
    const gameMap = buildTinyHexMap(realm.id, input.seed)
    await db.gameMaps.put(gameMap)
    realmId = realm.id
    mapId = gameMap.id
  })

  return { realmId, mapId }
}
