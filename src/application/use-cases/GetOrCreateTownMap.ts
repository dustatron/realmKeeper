import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { GameMap } from '@domain/entities/GameMap'
import { newId } from '@shared/ulid'

export interface GetOrCreateTownMapInput {
  poiId: string
  name: string
  /** Backdrop image URL (a bundled Watabou city PNG). */
  imageUrl: string
  width: number
  height: number
}

/**
 * Get (or create) a settlement's generated town map. The map is an image-backed
 * `kind:'town'` GameMap whose backdrop is a bundled Watabou city PNG; POIs are
 * placed on it like any image map. Idempotent per settlement.
 */
export async function executeGetOrCreateTownMap(
  input: GetOrCreateTownMapInput,
  deps: { gameMapRepo: IGameMapRepository },
): Promise<GameMap> {
  const existing = (await deps.gameMapRepo.getByPoiId(input.poiId)).find((m) => m.kind === 'town')
  if (existing) {
    // Migrate an older imageless town map (e.g. an earlier schematic one) to the
    // picked backdrop so it renders as a real map.
    if (!existing.imageUrl) {
      const updated: GameMap = {
        ...existing,
        imageUrl: input.imageUrl,
        width: input.width,
        height: input.height,
        townData: null,
        updatedAt: Date.now(),
      }
      await deps.gameMapRepo.update(updated)
      return updated
    }
    return existing
  }

  const now = Date.now()
  const map: GameMap = {
    id: newId(),
    name: `${input.name} — Town`,
    ownerRealmId: null,
    ownerPoiId: input.poiId,
    imageUrl: input.imageUrl,
    kind: 'town',
    hexCols: null,
    hexRows: null,
    hexSize: null,
    hexOrientation: null,
    width: input.width,
    height: input.height,
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
