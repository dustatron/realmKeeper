import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { cairnTableDefs } from '@domain/data/cairn-tables'
import type { PoiKind } from '@domain/data/worldgen/poiKinds'
import { buildPoiFlavor } from './poiFlavor'

const textsOf = (id: string) =>
  cairnTableDefs.find((t) => t.id === id)!.entries.map((e) => e.text)

const KINDS: PoiKind[] = ['settlement', 'dungeon', 'ruin', 'landmark']

describe('buildPoiFlavor', () => {
  it('fills structured flavor that names the POI for every kind', () => {
    for (const kind of KINDS) {
      const f = buildPoiFlavor(kind, 'Testholt', 'forest', new SeededRandom('s'))
      expect(f.subtypeLabel.length).toBeGreaterThan(0)
      expect(f.tags).toHaveLength(1)
      expect(f.description.length).toBeGreaterThan(0)
      expect(f.readAloud).toContain('Testholt')
      // clean grammar: feature is a tag, not jammed into the sentence
      expect(f.readAloud.toLowerCase()).not.toContain(f.tags[0].toLowerCase())
    }
  })

  it('is deterministic for a given seed, kind, name, and biome', () => {
    const a = buildPoiFlavor('settlement', 'Oakmoor', 'hills', new SeededRandom('z'))
    const b = buildPoiFlavor('settlement', 'Oakmoor', 'hills', new SeededRandom('z'))
    expect(a).toEqual(b)
  })

  it('sources a settlement subtype + tag from the Cairn settlement tables', () => {
    const types = textsOf('table-cairn-settlement')
    const features = textsOf('table-cairn-settlement-feature')
    const f = buildPoiFlavor('settlement', 'Place', 'grasslands', new SeededRandom('c'))
    expect(types).toContain(f.subtypeLabel)
    expect(features).toContain(f.tags[0])
  })

  it('sources a landmark subtype from the Cairn curiosity tables', () => {
    const types = textsOf('table-cairn-curiosity')
    const f = buildPoiFlavor('landmark', 'Place', 'desert', new SeededRandom('c'))
    expect(types).toContain(f.subtypeLabel)
  })

  it('uses the correct article and capitalizes the description', () => {
    const f = buildPoiFlavor('ruin', 'Place', 'desert', new SeededRandom('s'))
    expect(/^(A|An) /.test(f.description)).toBe(true)
    expect(f.description).toContain('desert')
  })
})
