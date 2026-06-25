import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { cairnTableDefs } from '@domain/data/cairn-tables'

// Shared accessors for the static Cairn tables used by world generation. The
// Cairn tables are our only region/faction/setting tables, so worldgen draws
// from them for every system (picked deterministically via SeededRandom).
export function cairnTexts(id: string): string[] {
  const table = cairnTableDefs.find((t) => t.id === id)
  return table ? table.entries.map((e) => e.text) : []
}

export function pickCairn(rng: SeededRandom, id: string): string {
  const texts = cairnTexts(id)
  return texts.length > 0 ? rng.pick(texts) : ''
}

export function sampleCairn(rng: SeededRandom, id: string, n: number): string[] {
  return rng.sample(cairnTexts(id), n)
}
