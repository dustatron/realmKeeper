import type { TableDef } from '@domain/entities/TableDef'
import type { SeededRandom, WeightedTable } from '~/lib/dungeon/SeededRandom'

// A pure, synchronous view over a set of TableDefs, used by world generation to
// draw flavor text from the central table registry (built-ins + user custom
// tables). Generalizes the cairnPick.ts accessors so every generator can read
// from the same tables the Tables-section UI shows. No Dexie, no async — resolve
// the merged TableDef list once in the use-case layer, then pass the snapshot
// into the pure domain generators (the systemConfig injection pattern).
//
// Every accessor takes an optional `fallback` (the generator's original literal
// array) so a missing or empty custom table can never crash generation or pick
// from nothing. When a table resolves to the same texts in the same order as the
// original array, the SeededRandom call sequence is byte-identical — generation
// stays deterministic.
export interface ResolvedTables {
  has(id: string): boolean
  def(id: string): TableDef | undefined
  /** Entry texts in table order; [] for an unknown id. */
  texts(id: string): string[]
  pick(rng: SeededRandom, id: string, fallback?: readonly string[]): string
  sample(rng: SeededRandom, id: string, n: number, fallback?: readonly string[]): string[]
  /** Weighted pick where each entry's weight is its dice-range width (max - min + 1). */
  pickWeighted(rng: SeededRandom, id: string, fallback?: readonly string[]): string
}

/**
 * Resolve a pool from the provider, falling back to the generator's built-in
 * array when the table is missing or empty. Shared by the worldgen builders so
 * the provider-or-fallback rule lives in exactly one place.
 */
export function resolvePool(
  tables: ResolvedTables | undefined,
  id: string,
  fallback: readonly string[],
): readonly string[] {
  const texts = tables?.texts(id)
  return texts && texts.length > 0 ? texts : fallback
}

export function createTableProvider(tables: readonly TableDef[]): ResolvedTables {
  // Insertion order matters: callers pass static defs first, then Dexie custom
  // defs, so a custom table with the same id overrides the built-in.
  const byId = new Map<string, TableDef>()
  for (const t of tables) byId.set(t.id, t)

  const textsOf = (id: string): string[] => {
    const t = byId.get(id)
    return t ? t.entries.map((e) => e.text) : []
  }

  const poolFor = (id: string, fallback?: readonly string[]): readonly string[] => {
    const arr = textsOf(id)
    return arr.length > 0 ? arr : fallback ?? []
  }

  return {
    has: (id) => byId.has(id),
    def: (id) => byId.get(id),
    texts: textsOf,
    pick: (rng, id, fallback) => {
      const pool = poolFor(id, fallback)
      return pool.length > 0 ? rng.pick(pool) : ''
    },
    sample: (rng, id, n, fallback) => {
      return rng.sample(poolFor(id, fallback), n)
    },
    pickWeighted: (rng, id, fallback) => {
      const t = byId.get(id)
      if (!t || t.entries.length === 0) {
        const pool = fallback ?? []
        return pool.length > 0 ? rng.pick(pool) : ''
      }
      const weighted: WeightedTable<string> = {
        entries: t.entries.map((e) => ({
          value: e.text,
          weight: Math.max(1, e.max - e.min + 1),
        })),
      }
      return rng.pickWeighted(weighted)
    },
  }
}
