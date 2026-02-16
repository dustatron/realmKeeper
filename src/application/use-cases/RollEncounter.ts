import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { EncounterCategory } from '@shared/constants'
import { rollDice } from '@shared/dice'
import { DEFAULT_ENCOUNTER_ENTRIES } from '@domain/data/default-encounter-tables'
import { ENCOUNTER_CATEGORIES } from '@shared/constants'

const CATEGORY_LABELS: Record<EncounterCategory, string> = {
  creature: 'Creature',
  signOmen: 'Sign / Omen',
  loss: 'Loss',
  npc: 'NPC',
  discovery: 'Discovery',
  treasure: 'Treasure',
}

export interface RollEncounterResult {
  categoryRoll: number
  categoryLabel: string
  result: string
}

/** Build the ordered list of active sections for a given encounter table (or defaults). */
export function getActiveSections(table: EncounterTable | null): Array<{ label: string; entries: string[] }> {
  const disabled = new Set(table?.disabledCategories ?? [])
  const sections: Array<{ label: string; entries: string[] }> = []

  for (const cat of ENCOUNTER_CATEGORIES) {
    if (disabled.has(cat)) continue
    const entries = table?.[cat]?.length ? table[cat] : [...DEFAULT_ENCOUNTER_ENTRIES[cat]]
    sections.push({ label: CATEGORY_LABELS[cat], entries })
  }

  if (table?.customSections) {
    for (const cs of table.customSections) {
      if (cs.entries.length > 0) {
        sections.push({ label: cs.name, entries: cs.entries })
      }
    }
  }

  return sections
}

export async function executeRollEncounter(
  input: { poiId: string | null; regionId: string | null; worldId: string },
  deps: { encounterTableRepo: IEncounterTableRepository }
): Promise<RollEncounterResult> {
  // Cascade: POI → Region → null (defaults)
  let table: EncounterTable | null = null

  if (input.poiId) {
    const poiTable = await deps.encounterTableRepo.getByPoiId(input.poiId)
    if (poiTable) table = poiTable
  }

  if (!table && input.regionId) {
    const regionTable = await deps.encounterTableRepo.getByRegionId(input.regionId)
    if (regionTable) table = regionTable
  }

  const sections = getActiveSections(table)
  if (sections.length === 0) {
    return { categoryRoll: 1, categoryLabel: 'Nothing', result: 'Nothing happens' }
  }

  const { total: categoryRoll } = rollDice(`1d${sections.length}`)
  const section = sections[categoryRoll - 1]
  const idx = Math.floor(Math.random() * section.entries.length)
  const result = section.entries[idx] ?? 'Nothing happens'

  return { categoryRoll, categoryLabel: section.label, result }
}
