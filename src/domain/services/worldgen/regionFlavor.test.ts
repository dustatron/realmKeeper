import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { cairnTableDefs } from '@domain/data/cairn-tables'
import { BIOMES } from '@domain/data/worldgen/biomes'
import { buildRegionFlavor } from './regionFlavor'

const textsOf = (id: string) =>
  cairnTableDefs.find((t) => t.id === id)!.entries.map((e) => e.text)

describe('buildRegionFlavor', () => {
  it('fills every structured flavor field for any biome', () => {
    for (const biome of BIOMES) {
      const f = buildRegionFlavor(biome, new SeededRandom('s'))
      expect(f.description.length).toBeGreaterThan(0)
      expect(f.features.length).toBeGreaterThanOrEqual(1)
      expect(f.dangers.length).toBeGreaterThanOrEqual(1)
      expect(f.resources.length).toBeGreaterThanOrEqual(1)
      expect(f.people.length).toBe(1)
    }
  })

  it('sources resources and people from the Cairn region tables', () => {
    const resourceTexts = textsOf('table-cairn-region-resources')
    const peopleTexts = textsOf('table-cairn-region-people')
    const f = buildRegionFlavor('forest', new SeededRandom('cairn'))
    for (const r of f.resources) expect(resourceTexts).toContain(r)
    for (const p of f.people) expect(peopleTexts).toContain(p)
  })

  it('picks one or two resources, no duplicates', () => {
    const f = buildRegionFlavor('desert', new SeededRandom('res'))
    expect(f.resources.length).toBeGreaterThanOrEqual(1)
    expect(f.resources.length).toBeLessThanOrEqual(2)
    expect(new Set(f.resources).size).toBe(f.resources.length)
  })

  it('is deterministic for a given seed and biome', () => {
    const a = buildRegionFlavor('marsh', new SeededRandom('z'))
    const b = buildRegionFlavor('marsh', new SeededRandom('z'))
    expect(a).toEqual(b)
  })

  it('description mentions a resource and the people', () => {
    const f = buildRegionFlavor('hills', new SeededRandom('desc'))
    expect(f.description.toLowerCase()).toContain(f.people[0].toLowerCase())
    expect(f.resources.some((r) => f.description.toLowerCase().includes(r.toLowerCase()))).toBe(true)
  })
})
