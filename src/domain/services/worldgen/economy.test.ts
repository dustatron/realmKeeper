import { describe, it, expect } from 'vitest'
import { resourceByName } from '../../data/worldgen/resources.catalog'
import { WATER, deriveNeeds, roleForSettlement, roleForTier } from './economy'

describe('roleForSettlement / roleForTier', () => {
  it('classifies raw produce as extractor and finished as refiner', () => {
    expect(roleForSettlement('iron ore')).toBe('extractor')
    expect(roleForSettlement('weapons')).toBe('refiner')
    expect(roleForTier('raw')).toBe('extractor')
    expect(roleForTier('finished')).toBe('refiner')
  })

  it('treats unknown produce as an extractor', () => {
    expect(roleForSettlement('not-a-real-good')).toBe('extractor')
  })
})

describe('deriveNeeds — extractor (raw produce)', () => {
  it('needs a food and a finished good', () => {
    const needs = deriveNeeds('iron ore', 'small')
    expect(needs).toContain('grain')
    expect(needs).toContain('tools')
    // grain is a food (raw), tools is a finished good — both resolve in the catalog.
    expect(resourceByName('grain')?.tier).toBe('raw')
    expect(resourceByName('tools')?.tier).toBe('finished')
  })

  it('never needs what it produces', () => {
    // grain produces grain; the staple-food need must drop out.
    const needs = deriveNeeds('grain', 'small')
    expect(needs).not.toContain('grain')
    expect(needs).toContain('tools')
  })
})

describe('deriveNeeds — refiner (finished produce)', () => {
  it('returns the inputs of the produced good', () => {
    const needs = deriveNeeds('weapons', 'small')
    expect(needs).toEqual(expect.arrayContaining(['iron ore', 'coal']))
  })

  it('returns no extractor staples for a refiner', () => {
    const needs = deriveNeeds('textiles', 'small')
    expect(needs).toEqual(['wool'])
  })

  it('a refiner with no inputs (pottery) needs nothing when small', () => {
    expect(deriveNeeds('pottery', 'small')).toEqual([])
  })
})

describe('deriveNeeds — size', () => {
  it('large settlements always also need water', () => {
    expect(deriveNeeds('weapons', 'large')).toContain(WATER)
    expect(deriveNeeds('iron ore', 'large')).toContain(WATER)
  })

  it('small and medium do not need water', () => {
    expect(deriveNeeds('iron ore', 'small')).not.toContain(WATER)
    expect(deriveNeeds('iron ore', 'medium')).not.toContain(WATER)
  })
})

describe('deriveNeeds — de-duplication', () => {
  it('returns a de-duplicated list', () => {
    const needs = deriveNeeds('weapons', 'large')
    expect(new Set(needs).size).toBe(needs.length)
  })
})
