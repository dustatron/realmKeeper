import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { seedStories, type StorySettlement, type StoryRegion, type SeedStoriesInput } from './seedStories'

const sett = (
  id: string,
  regionId: string,
  wealthBand: StorySettlement['wealthBand'],
  produces: string | null = null,
): StorySettlement => ({ id, regionId, wealthBand, produces, needs: [], trouble: 'troubled' })

const region = (id: string, definingResource: string | null): StoryRegion => ({ id, definingResource })

const baseInput = (rng: SeededRandom): SeedStoriesInput => ({
  settlements: [
    sett('rich1', 'rA', 'rich', 'gemstones'),
    sett('poor1', 'rB', 'poor', 'peat'),
    sett('modest1', 'rA', 'modest', 'grain'),
  ],
  regions: [region('rA', 'gemstones'), region('rB', 'peat')],
  worldId: 'w1',
  rng,
})

describe('seedStories', () => {
  it('rich settlements yield acquisitive-tone hooks', () => {
    const { notices } = seedStories(baseInput(new SeededRandom('s')))
    const richNotice = notices.find((n) => n.poiId === 'rich1' && n.tags.includes('wealth'))
    expect(richNotice?.tags).toContain('acquisitive')
  })

  it('poor settlements yield desperation-tone hooks', () => {
    const { notices } = seedStories(baseInput(new SeededRandom('s')))
    const poorNotice = notices.find((n) => n.poiId === 'poor1' && n.tags.includes('wealth'))
    expect(poorNotice?.tags).toContain('desperation')
  })

  it('emits one wealth-band hook per settlement', () => {
    const { hooks } = seedStories(baseInput(new SeededRandom('s')))
    // 3 settlements + 2 contested (one per region) = 5 hooks
    const wealthHooks = hooks.filter((h) => !h.title.startsWith('The struggle for'))
    expect(wealthHooks.length).toBe(3)
  })

  it('guarantees a contested-resource story per region', () => {
    const { hooks, notices } = seedStories(baseInput(new SeededRandom('s')))
    for (const r of ['rA', 'rB']) {
      const contestedNotice = notices.find((n) => n.regionId === r && n.tags.includes('contested'))
      expect(contestedNotice).toBeDefined()
    }
    const contestedHooks = hooks.filter((h) => h.title.startsWith('The struggle for'))
    expect(contestedHooks.length).toBe(2) // one per region
  })

  it('produces a cross-map rumor from a poor town toward a rich town elsewhere', () => {
    const { rumors } = seedStories(baseInput(new SeededRandom('s')))
    const crossMap = rumors.find((r) => r.poiId === 'poor1' && r.tags.includes('cross-map') && r.tags.includes('wealth'))
    expect(crossMap).toBeDefined()
  })

  it('handles null wealth bands gracefully (neutral tone)', () => {
    const input: SeedStoriesInput = {
      settlements: [sett('x', 'rA', null, null)],
      regions: [region('rA', null)],
      worldId: 'w1',
      rng: new SeededRandom('s'),
    }
    const { hooks, notices } = seedStories(input)
    expect(hooks.length).toBeGreaterThan(0)
    const n = notices.find((nn) => nn.poiId === 'x')
    expect(n?.tags).toContain('neutral')
  })

  it('is deterministic for a given seed', () => {
    const a = seedStories(baseInput(new SeededRandom('seed-xyz')))
    const b = seedStories(baseInput(new SeededRandom('seed-xyz')))
    // ids use newId() (ULID) so compare the deterministic content fields only.
    const strip = (bundle: ReturnType<typeof seedStories>) => ({
      hooks: bundle.hooks.map((h) => ({ type: h.type, title: h.title, detail: h.secret.detail })),
      notices: bundle.notices.map((n) => ({ title: n.title, description: n.description, tags: n.tags, poiId: n.poiId })),
      rumors: bundle.rumors.map((r) => ({ text: r.text, tags: r.tags, poiId: r.poiId })),
    })
    expect(strip(a)).toEqual(strip(b))
  })
})
