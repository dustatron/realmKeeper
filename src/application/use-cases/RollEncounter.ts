import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { EncounterCategory } from '@shared/constants'
import { rollDice } from '@shared/dice'
import { DEFAULT_ENCOUNTER_ENTRIES } from '@domain/data/default-encounter-tables'

const CATEGORY_MAP: Record<number, EncounterCategory> = {
  1: 'creature',
  2: 'signOmen',
  3: 'loss',
  4: 'npc',
  5: 'discovery',
  6: 'treasure',
}

export interface RollEncounterResult {
  category: EncounterCategory
  categoryRoll: number
  result: string
}

export async function executeRollEncounter(
  input: { poiId: string | null; regionId: string | null; worldId: string },
  deps: { encounterTableRepo: IEncounterTableRepository }
): Promise<RollEncounterResult> {
  const { total: categoryRoll } = rollDice('1d6')
  const category = CATEGORY_MAP[categoryRoll]

  // Cascade: POI → Region → Default
  let entries: string[] = []

  if (input.poiId) {
    const poiTable = await deps.encounterTableRepo.getByPoiId(input.poiId)
    if (poiTable) entries = poiTable[category]
  }

  if (entries.length === 0 && input.regionId) {
    const regionTable = await deps.encounterTableRepo.getByRegionId(input.regionId)
    if (regionTable) entries = regionTable[category]
  }

  if (entries.length === 0) {
    entries = [...DEFAULT_ENCOUNTER_ENTRIES[category]]
  }

  const idx = Math.floor(Math.random() * entries.length)
  const result = entries[idx] ?? 'Nothing happens'

  return { category, categoryRoll, result }
}
