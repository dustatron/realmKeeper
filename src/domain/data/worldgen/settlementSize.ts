export type SettlementSize = 'small' | 'medium' | 'large'

const LARGE = new Set(['City', 'Citadel', 'Fortress', 'Stronghold'])
const SMALL = new Set(['Hamlet', 'Outpost', 'Farmstead', 'Caravan', 'Commune', 'Villa', 'Prison'])

export function settlementSize(subtype: string | null): SettlementSize {
  if (subtype && LARGE.has(subtype)) return 'large'
  if (subtype && SMALL.has(subtype)) return 'small'
  return 'medium'
}
