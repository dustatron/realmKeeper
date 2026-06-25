import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { cairnTableDefs } from '@domain/data/cairn-tables'
import type { PoiKind } from '@domain/data/worldgen/poiKinds'
import { describePoi } from './poiFlavor'

const textsOf = (id: string) =>
  cairnTableDefs.find((t) => t.id === id)!.entries.map((e) => e.text)

const KINDS: PoiKind[] = ['settlement', 'dungeon', 'ruin', 'landmark']

describe('describePoi', () => {
  it('produces a non-empty description that names the POI for every kind', () => {
    for (const kind of KINDS) {
      const desc = describePoi(kind, 'Testholt', 'forest', new SeededRandom('s'))
      expect(desc.length).toBeGreaterThan(0)
      expect(desc).toContain('Testholt')
    }
  })

  it('is deterministic for a given seed, kind, name, and biome', () => {
    const a = describePoi('settlement', 'Oakmoor', 'hills', new SeededRandom('z'))
    const b = describePoi('settlement', 'Oakmoor', 'hills', new SeededRandom('z'))
    expect(a).toBe(b)
  })

  it('draws a settlement description from the Cairn settlement tables', () => {
    const types = textsOf('table-cairn-settlement').map((t) => t.toLowerCase())
    const desc = describePoi('settlement', 'Place', 'grasslands', new SeededRandom('c')).toLowerCase()
    expect(types.some((t) => desc.includes(t.toLowerCase()))).toBe(true)
  })

  it('draws a landmark description from the Cairn curiosity tables', () => {
    const types = textsOf('table-cairn-curiosity').map((t) => t.toLowerCase())
    const desc = describePoi('landmark', 'Place', 'desert', new SeededRandom('c')).toLowerCase()
    expect(types.some((t) => desc.includes(t.toLowerCase()))).toBe(true)
  })
})
