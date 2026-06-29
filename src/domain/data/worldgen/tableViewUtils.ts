import type { TableDef, TableEntry } from '@domain/entities/TableDef'

// Helpers for building browsable TableDef "views" over the const arrays that
// world generation already uses, so a single source feeds both the generator
// and the Tables-section UI. Entry order is preserved 1:1 with the source array,
// which keeps seeded generation byte-identical when a generator reads the table
// via the provider instead of the raw array.

/** One entry per list item (1dN flat table). */
export function listEntries(texts: readonly string[]): TableEntry[] {
  return texts.map((text, i) => ({ min: i + 1, max: i + 1, text }))
}

export function listTable(
  id: string,
  setId: string,
  name: string,
  texts: readonly string[],
  tags: string[] = [],
  systemId: string | null = null,
): TableDef {
  return {
    id,
    setId,
    name,
    diceFormula: `1d${Math.max(1, texts.length)}`,
    entries: listEntries(texts),
    tags,
    systemId,
  }
}

/**
 * Weighted table → TableDef where each entry spans a dice range equal to its
 * weight (weight 4 → a 4-wide range). The provider's pickWeighted reverses this
 * (weight = max - min + 1), so the distribution round-trips exactly.
 */
export function weightedTable(
  id: string,
  setId: string,
  name: string,
  weights: readonly { value: string; weight: number }[],
  tags: string[] = [],
  systemId: string | null = null,
): TableDef {
  let cursor = 1
  const entries: TableEntry[] = weights.map(({ value, weight }) => {
    const w = Math.max(1, Math.round(weight))
    const entry = { min: cursor, max: cursor + w - 1, text: value }
    cursor += w
    return entry
  })
  return { id, setId, name, diceFormula: `1d${cursor - 1}`, entries, tags, systemId }
}
