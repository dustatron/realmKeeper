import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { cairnTexts, pickCairn, sampleCairn } from './cairnPick'

describe('cairnPick', () => {
  it('returns the entry texts of a known Cairn table', () => {
    const texts = cairnTexts('table-cairn-region-people')
    expect(texts.length).toBe(20)
    expect(texts).toContain('Organized bandits')
  })

  it('returns an empty array for an unknown table id', () => {
    expect(cairnTexts('nope')).toEqual([])
  })

  it('pickCairn draws a member of the table, deterministically', () => {
    const texts = cairnTexts('table-cairn-faction-type')
    const a = pickCairn(new SeededRandom('s'), 'table-cairn-faction-type')
    const b = pickCairn(new SeededRandom('s'), 'table-cairn-faction-type')
    expect(texts).toContain(a)
    expect(a).toBe(b)
  })

  it('sampleCairn returns n distinct members', () => {
    const out = sampleCairn(new SeededRandom('s'), 'table-cairn-region-resources', 3)
    expect(out).toHaveLength(3)
    expect(new Set(out).size).toBe(3)
  })
})
