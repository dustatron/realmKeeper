import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { TableDef } from '@domain/entities/TableDef'
import { createTableProvider } from './TableProvider'

function table(id: string, texts: string[]): TableDef {
  return {
    id,
    setId: 'set-test',
    name: id,
    diceFormula: `1d${texts.length}`,
    entries: texts.map((text, i) => ({ min: i + 1, max: i + 1, text })),
    tags: [],
    systemId: null,
  }
}

describe('TableProvider', () => {
  it('texts() returns entry order, [] for unknown id', () => {
    const p = createTableProvider([table('t', ['a', 'b', 'c'])])
    expect(p.texts('t')).toEqual(['a', 'b', 'c'])
    expect(p.texts('missing')).toEqual([])
  })

  it('has()/def() reflect the registry', () => {
    const def = table('t', ['a'])
    const p = createTableProvider([def])
    expect(p.has('t')).toBe(true)
    expect(p.has('missing')).toBe(false)
    expect(p.def('t')).toBe(def)
  })

  it('Dexie-style later entries override earlier ids', () => {
    const p = createTableProvider([
      table('t', ['static']),
      table('t', ['custom']),
    ])
    expect(p.texts('t')).toEqual(['custom'])
  })

  it('pick() matches rng.pick over the same array (deterministic)', () => {
    const texts = ['a', 'b', 'c', 'd', 'e']
    const p = createTableProvider([table('t', texts)])
    const a = p.pick(new SeededRandom('seed'), 't')
    const b = new SeededRandom('seed').pick(texts)
    expect(a).toBe(b)
  })

  it('pick() falls back to the supplied array for an unknown id', () => {
    const p = createTableProvider([])
    const fallback = ['x', 'y', 'z']
    const a = p.pick(new SeededRandom('seed'), 'missing', fallback)
    const b = new SeededRandom('seed').pick(fallback)
    expect(a).toBe(b)
  })

  it('pick() returns empty string when no table and no fallback', () => {
    const p = createTableProvider([])
    expect(p.pick(new SeededRandom('seed'), 'missing')).toBe('')
  })

  it('sample() matches rng.sample over the same array', () => {
    const texts = ['a', 'b', 'c', 'd', 'e', 'f']
    const p = createTableProvider([table('t', texts)])
    const a = p.sample(new SeededRandom('seed'), 't', 3)
    const b = new SeededRandom('seed').sample(texts, 3)
    expect(a).toEqual(b)
  })

  it('pickWeighted() treats dice-range width as weight', () => {
    // settlement weight 4, dungeon 3, ruin 2, landmark 3 (total 12)
    const def: TableDef = {
      id: 'w',
      setId: 'set-test',
      name: 'w',
      diceFormula: '1d12',
      entries: [
        { min: 1, max: 4, text: 'settlement' },
        { min: 5, max: 7, text: 'dungeon' },
        { min: 8, max: 9, text: 'ruin' },
        { min: 10, max: 12, text: 'landmark' },
      ],
      tags: [],
      systemId: null,
    }
    const p = createTableProvider([def])
    const a = p.pickWeighted(new SeededRandom('seed'), 'w')
    const b = new SeededRandom('seed').pickWeighted({
      entries: [
        { value: 'settlement', weight: 4 },
        { value: 'dungeon', weight: 3 },
        { value: 'ruin', weight: 2 },
        { value: 'landmark', weight: 3 },
      ],
    })
    expect(a).toBe(b)
  })
})
