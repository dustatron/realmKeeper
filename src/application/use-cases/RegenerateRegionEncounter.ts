import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { newId } from '@shared/ulid'
import { buildRegionEncounterContent } from '@domain/services/worldgen/regionEncounter'

export interface RegenerateRegionEncounterInput {
  regionId: string
  worldId: string
  systemId: string
  seed?: string
}

export interface RegenerateRegionEncounterDeps {
  encounterTableRepo: IEncounterTableRepository
  poiRepo: IPOIRepository
  factionRepo: IFactionRepository
  regionRepo: IRegionRepository
}

export async function executeRegenerateRegionEncounter(
  input: RegenerateRegionEncounterInput,
  deps: RegenerateRegionEncounterDeps,
): Promise<EncounterTable> {
  const region = await deps.regionRepo.getById(input.regionId)
  if (!region) throw new Error('Region not found')

  const pois = await deps.poiRepo.getByRegionId(input.regionId)
  const factions = await deps.factionRepo.getByRealmId(input.worldId)

  const content = buildRegionEncounterContent({
    region: { terrain: region.terrain },
    pois,
    factions,
    systemId: input.systemId,
    rng: new SeededRandom(input.seed ?? `${input.regionId}-encounter`),
  })

  const now = Date.now()
  const existing = await deps.encounterTableRepo.getByRegionId(input.regionId)

  if (existing) {
    const updated: EncounterTable = { ...existing, ...content, lastResult: null, updatedAt: now }
    await deps.encounterTableRepo.update(updated)
    return updated
  }

  const created: EncounterTable = {
    id: newId(),
    ownerPoiId: null,
    ownerRegionId: input.regionId,
    worldId: input.worldId,
    ...content,
    customSections: [],
    disabledCategories: [],
    lastResult: null,
    createdAt: now,
    updatedAt: now,
  }
  await deps.encounterTableRepo.create(created)
  return created
}
