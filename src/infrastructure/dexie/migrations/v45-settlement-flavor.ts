import { parseLegacySettlementDescription } from '@domain/services/worldgen/parseLegacySettlementDescription'

// v45: Backfill POI.settlementFlavor from legacy stitched settlement descriptions.
// Older realms stored settlement flavor as one prose block ending in a
// "\n\nGM secret: ..." marker. This lifts the flavor into structured fields, moves
// the secret into gmNotes, and leaves only the lead prose in the description.
// Non-settlement POIs just gain `settlementFlavor: null`.
//
// Pure and idempotent (guarded on `settlementFlavor === undefined`) so it is safe
// inside a Dexie upgrade transaction.
export function withSettlementFlavorBackfill<T extends Record<string, unknown>>(
  poi: T,
): T {
  if (poi.settlementFlavor !== undefined) return poi
  const desc = typeof poi.description === 'string' ? poi.description : ''
  const hasSecret = desc.includes('\n\nGM secret:')
  const hasFlavorBlock = desc.includes('Known for ') && desc.includes('Its heart is ')
  if (!hasSecret && !hasFlavorBlock) {
    // Not a settlement description — only add the field.
    return { ...poi, settlementFlavor: null }
  }
  const parsed = parseLegacySettlementDescription(desc)
  const existingGm = typeof poi.gmNotes === 'string' ? poi.gmNotes : ''
  return {
    ...poi,
    description: parsed.description,
    settlementFlavor: parsed.settlementFlavor,
    gmNotes: parsed.gmNotes || existingGm,
  }
}
