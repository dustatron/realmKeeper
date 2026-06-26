import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { GameMap } from '@domain/entities/GameMap'
import { newId } from '@shared/ulid'

const TOWN_CANVAS = 1000

export interface GetOrCreateTownMapInput {
  poiId: string
  name: string
  width?: number
  height?: number
}

export async function executeGetOrCreateTownMap(
  input: GetOrCreateTownMapInput,
  deps: { gameMapRepo: IGameMapRepository },
): Promise<GameMap> {
  const existing = (await deps.gameMapRepo.getByPoiId(input.poiId)).find((m) => m.kind === 'town')
  if (existing) return existing

  const now = Date.now()
  const map: GameMap = {
    id: newId(),
    name: `${input.name} — Town`,
    ownerRealmId: null,
    ownerPoiId: input.poiId,
    imageUrl: '',
    kind: 'town',
    hexCols: null,
    hexRows: null,
    hexSize: null,
    hexOrientation: null,
    width: input.width ?? TOWN_CANVAS,
    height: input.height ?? TOWN_CANVAS,
    townData: null,
    townPreset: null,
    townSeed: null,
    townWalled: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  }
  await deps.gameMapRepo.create(map)
  return map
}
