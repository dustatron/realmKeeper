import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Biome } from '@domain/data/worldgen/biomes'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { generateLandmark } from '~/lib/landmark/LandmarkGenerator'

export interface GenerateLandmarkInput {
  poiId: string
  seed: string
}

export interface GenerateLandmarkDeps {
  poiRepo: IPOIRepository
  regionRepo: IRegionRepository
}

export async function executeGenerateLandmark(
  input: GenerateLandmarkInput,
  deps: GenerateLandmarkDeps,
): Promise<void> {
  const poi = await deps.poiRepo.getById(input.poiId)
  if (!poi) return

  const region = await deps.regionRepo.getById(poi.regionId)
  const biome = (region?.terrain ?? 'grasslands') as Biome

  const lore = generateLandmark(input.seed, biome, new SeededRandom(input.seed))

  await deps.poiRepo.update({
    ...poi,
    landmarkLore: lore,
    poiGenOptions: { seed: input.seed },
    updatedAt: Date.now(),
  })
}
