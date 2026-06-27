import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { pickSiteHistory, BUILDER_CULTURES, ERAS, FATES } from './siteHistory'

describe('pickSiteHistory', () => {
  it('returns populated fields', () => {
    const h = pickSiteHistory(new SeededRandom('s'))
    expect(BUILDER_CULTURES).toContain(h.builderCulture)
    expect(ERAS).toContain(h.era)
    expect(FATES).toContain(h.fate)
  })

  it('avoids repeating builder/fate already in the used set when possible', () => {
    const used = new Set<string>()
    const first = pickSiteHistory(new SeededRandom('a'), used)
    const second = pickSiteHistory(new SeededRandom('b'), used)
    // With distinct seeds and a populated table, the second should differ on at least one axis.
    expect(`${first.builderCulture}|${first.fate}`).not.toBe(`${second.builderCulture}|${second.fate}`)
  })
})
