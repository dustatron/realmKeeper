export interface WanderingMonsterCustomStats {
  ac: number | null
  hp: number | null
  attacks: string
}

export interface WanderingMonsterEntry {
  /** Display name, e.g. "Goblins" */
  name: string
  /** Creature type/race, e.g. "monster", "undead", "Fish Folk" */
  creatureType: string
  /** Dice or number, e.g. "1d4", "2" */
  count: string
  /** What they're doing, e.g. "patrolling the corridors" */
  activity: string
  /** Optional compendium monster id for stats lookup */
  compendiumId: string | null
  /** Optional NPC id for denizen-sourced entries */
  npcId: string | null
  /** Manual stats for fully custom entries (used when no compendiumId) */
  customStats: WanderingMonsterCustomStats | null
}
