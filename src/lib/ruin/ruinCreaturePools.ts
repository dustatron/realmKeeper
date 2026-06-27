import type { RuinState } from '@domain/entities/RuinSite'

export const RUIN_CREATURE_POOLS: Record<Exclude<RuinState, 'empty'>, readonly string[]> = {
  'beast-claimed': ['wolf', 'bear', 'boar', 'giant_spider', 'giant_rat', 'serpent'],
  'haunted': ['skeleton', 'zombie', 'ghost', 'wraith', 'specter'],
  'cult-site': ['cultist', 'acolyte', 'cult_fanatic', 'summoned_horror'],
  'faction-held': ['bandit', 'soldier', 'mercenary', 'brigand', 'thug'],
}

export function ruinCreatureLevel(
  tier: 'easy' | 'tough' | 'perilous',
  systemId: string
): number {
  if (systemId === 'system-cairn-2e') {
    // resolveCreature caps cairn HP at levelCap*6 → 6/12/24 HP-ish
    return tier === 'easy' ? 1 : tier === 'tough' ? 2 : 4
  }
  // shadowdark: direct level cap
  return tier === 'easy' ? 2 : tier === 'tough' ? 4 : 6
}
