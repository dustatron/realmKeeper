import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { NPC } from '@domain/entities/NPC'
import type { ITableRepository } from '@application/ports/ITableRepository'
import { rollDisposition } from '@shared/dice'
import { newId } from '@shared/ulid'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildNpc } from '@domain/services/worldgen/buildNpc'

export interface GenerateNPCInput {
  worldId: string
  systemConfig: SystemConfig
  factionId?: string
  regionId?: string
  customRaces?: string[]
}

export interface GenerateNPCDeps {
  tableRepo: ITableRepository
}

/**
 * Generate a single, fully-fleshed NPC on demand (encounter cascade, faction
 * agents, "Generate NPC" buttons). Delegates to the same rich worldgen builder
 * used during realm generation, so a rolled-up NPC carries the full flavor:
 * Cairn appearance traits + the Realm Keeper NPC tables (profession, personality,
 * motivation, physical quirk, flaw) and the extra detail tables (memorable
 * appearance, mannerism, pocket item, secret). Seeded with a fresh id so each
 * call differs; tables come from the central provider so custom edits apply.
 */
export async function executeGenerateNPC(
  input: GenerateNPCInput,
  deps: GenerateNPCDeps,
): Promise<NPC> {
  const tables = await deps.tableRepo.resolveAll()
  const rng = new SeededRandom(newId())
  const npc = buildNpc(
    {
      worldId: input.worldId,
      factionId: input.factionId,
      regionId: input.regionId,
      customRaces: input.customRaces,
      tables,
    },
    input.systemConfig,
    rng,
  )
  // Live NPCs get an immediate disposition; the encounter cascade still rolls its
  // own 2d6 reaction on top when the NPC appears in an encounter.
  return { ...npc, disposition: rollDisposition() }
}
