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
  const realm = await executeCreateRealm(
    { name: input.name, systemId: input.systemId, description: '' },
    deps
  )

  const gameMap = buildTinyHexMap(realm.id, input.seed)

  await db.transaction('rw', db.gameMaps, async () => {
    await db.gameMaps.put(gameMap)
  })

  return { realmId: realm.id, mapId: gameMap.id }
}
