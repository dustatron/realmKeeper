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
  /** creature/npc only: what they are doing right now (secondary roll) */
  activity?: string
  activityRoll?: number
  /** npc category: generated NPC, not yet promoted */
  npc?: NPC
  npcSavedId?: string | null
  /** creature category: matched compendium monster */
  monsterMatch?: { compendiumId: string; name: string } | null
  /** signOmen only: matched region POI */
  locationMatch?: { poiId: string; name: string } | null
  /** areaEffect only: creature/npc turned up by a {creature}/{npc} token */
  chained?: EncounterRollResult | null
  /** set on a chained {creature?}/{npc?} find: is it a live threat or a carcass */
  condition?: 'dead' | 'alive'
  rolledAt: number
}
