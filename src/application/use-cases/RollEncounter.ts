import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { EncounterCategory } from '@shared/constants'
import { rollDice } from '@shared/dice'
import { DEFAULT_ENCOUNTER_ENTRIES } from '@domain/data/default-encounter-tables'
import { ENCOUNTER_CATEGORIES, type Terrain } from '@shared/constants'
import { FOREST_ENCOUNTERS, SETTLEMENT_ENCOUNTERS } from '@domain/data/worldgen/encounters.tables'
import { TRAVEL_ENCOUNTERS } from '@domain/data/worldgen/travel.tables'
import {
  SWAMP_ENCOUNTERS,
  DESERT_ENCOUNTERS,
  COAST_ENCOUNTERS,
  MOUNTAIN_ENCOUNTERS,
  PLAINS_ENCOUNTERS,
  TUNDRA_ENCOUNTERS,
} from '@domain/data/worldgen/biomeEncounters.tables'

const CATEGORY_LABELS: Record<EncounterCategory, string> = {
  creature: 'Creature',
  signOmen: 'Sign / Omen',
  loss: 'Loss',
  npc: 'NPC',
  discovery: 'Discovery',
  treasure: 'Treasure',
}

/** Synthetic category id for the context-driven terrain/locale encounter section. */
export const TERRAIN_FLAVOR_CATEGORY = 'terrain-flavor'

/**
 * Region terrain → flat encounter list (+ label) for the cascade's locale section.
 * Exhaustive over Terrain (null = no biome list) so adding a new terrain to
 * TERRAIN_OPTIONS fails the build here until it's mapped — no terrain can
 * silently end up with zero encounters.
 */
const TERRAIN_ENCOUNTERS: Record<Terrain, { label: string; entries: readonly string[] } | null> = {
  forest: { label: 'Forest', entries: FOREST_ENCOUNTERS },
  road: { label: 'Roadside', entries: TRAVEL_ENCOUNTERS },
  swamp: { label: 'Swamp', entries: SWAMP_ENCOUNTERS },
  desert: { label: 'Desert', entries: DESERT_ENCOUNTERS },
  coast: { label: 'Coast', entries: COAST_ENCOUNTERS },
  mountain: { label: 'Mountain', entries: MOUNTAIN_ENCOUNTERS },
  hills: { label: 'Hills', entries: MOUNTAIN_ENCOUNTERS },
  plains: { label: 'Plains', entries: PLAINS_ENCOUNTERS },
  tundra: { label: 'Tundra', entries: TUNDRA_ENCOUNTERS },
  other: null,
}

export interface EncounterSectionContext {
  /** Region terrain (e.g. 'forest', 'swamp'); see TERRAIN_OPTIONS. */
  terrain?: string | null
  /** POI type — 'settlement' surfaces the town-street locale section. */
  poiType?: string | null
}

/**
 * Build the context-driven "locale" section: a settlement POI gets town-street
 * encounters; otherwise the region's terrain picks a matching biome list. Returns
 * null when nothing matches (e.g. terrain 'other'). Non-enriched (isCustom) so the
 * cascade engine treats it like a custom section — no reaction/NPC/monster match.
 */
export function getTerrainEncounterSection(
  context?: EncounterSectionContext,
): { category: string; label: string; entries: string[]; isCustom: boolean } | null {
  if (!context) return null
  if (context.poiType === 'settlement') {
    return { category: TERRAIN_FLAVOR_CATEGORY, label: 'Town Street', entries: [...SETTLEMENT_ENCOUNTERS], isCustom: true }
  }
  // Cast is safe: an unknown terrain string indexes to undefined and falls through.
  const terrain = context.terrain ? TERRAIN_ENCOUNTERS[context.terrain as Terrain] : undefined
  if (!terrain) return null
  return { category: TERRAIN_FLAVOR_CATEGORY, label: terrain.label, entries: [...terrain.entries], isCustom: true }
}

export interface RollEncounterResult {
  categoryRoll: number
  categoryLabel: string
  result: string
}

/**
 * Build the ordered list of active sections for a given encounter table (or defaults).
 * When `context` is supplied, a terrain/locale section is appended last so the master
 * roll can land on region-specific encounters (forest/swamp/town-street/…).
 */
export function getActiveSections(
  table: EncounterTable | null,
  context?: EncounterSectionContext,
): Array<{ category: string; label: string; entries: string[]; isCustom: boolean }> {
  const disabled = new Set(table?.disabledCategories ?? [])
  const sections: Array<{ category: string; label: string; entries: string[]; isCustom: boolean }> = []

  for (const cat of ENCOUNTER_CATEGORIES) {
    if (disabled.has(cat)) continue
    const entries = table?.[cat]?.length ? table[cat] : [...DEFAULT_ENCOUNTER_ENTRIES[cat]]
    sections.push({ category: cat, label: CATEGORY_LABELS[cat], entries, isCustom: false })
  }

  if (table?.customSections) {
    for (const cs of table.customSections) {
      if (cs.entries.length > 0) {
        sections.push({ category: cs.id, label: cs.name, entries: cs.entries, isCustom: true })
      }
    }
  }

  const terrainSection = getTerrainEncounterSection(context)
  if (terrainSection) sections.push(terrainSection)

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
