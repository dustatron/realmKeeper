import type { Disposition } from '@shared/constants'
import type { NPC } from '@domain/entities/NPC'

export interface EncounterRollResult {
  /** 1..N over the active sections */
  masterRoll: number
  /** hit category key (EncounterCategory) or custom section id */
  category: string
  categoryLabel: string
  entryIndex: number
  entryText: string
  /** npc/creature only */
  reaction?: Disposition
  reactionRoll?: number
  /** npc category: generated NPC, not yet promoted */
  npc?: NPC
  npcSavedId?: string | null
  /** creature category: matched compendium monster */
  monsterMatch?: { compendiumId: string; name: string } | null
  /** signOmen/discovery only: matched region POI */
  locationMatch?: { poiId: string; name: string } | null
  rolledAt: number
}
