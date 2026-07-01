import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import {
  pickExpandedName,
  firstNamePool,
  HUMAN_MALE_NAMES,
  HUMAN_FEMALE_NAMES,
  SURNAMES,
  RACE_NAMES,
} from './index'

describe('expanded name pools', () => {
  it('ships large, non-trivial pools', () => {
    expect(HUMAN_MALE_NAMES.length).toBeGreaterThan(300)
    expect(HUMAN_FEMALE_NAMES.length).toBeGreaterThan(300)
    expect(SURNAMES.length).toBeGreaterThan(300)
    // 10 flavored races, male + female each.
    for (const race of ['elf', 'dwarf', 'halfling', 'half-orc', 'half-elf', 'goblin', 'gnome', 'orc', 'tiefling', 'dragonborn']) {
      expect(RACE_NAMES[race]?.male.length ?? 0).toBeGreaterThan(20)
      expect(RACE_NAMES[race]?.female.length ?? 0).toBeGreaterThan(20)
    }
  })

  it('every pool entry is a non-empty ASCII string', () => {
    const all = [
      ...HUMAN_MALE_NAMES,
      ...HUMAN_FEMALE_NAMES,
      ...SURNAMES,
      ...Object.values(RACE_NAMES).flatMap((r) => [...r.male, ...r.female]),
    ]
    for (const n of all) {
      expect(n.trim()).not.toBe('')
      expect(n).toMatch(/^[\x20-\x7e]+$/)
    }
  })
})

describe('firstNamePool', () => {
  it('returns the race pool for a flavored race, human pool otherwise', () => {
    expect(firstNamePool('elf', 'male')).toBe(RACE_NAMES.elf.male)
    expect(firstNamePool('human', 'female')).toBe(HUMAN_FEMALE_NAMES)
    // unknown/custom race falls back to human
    expect(firstNamePool('automaton', 'male')).toBe(HUMAN_MALE_NAMES)
  })
})

describe('pickExpandedName', () => {
  it('humans get a first + surname; flavored races get a single given name', () => {
    const rng = new SeededRandom('s')
    const used = new Set<string>()
    const human = pickExpandedName('human', 'male', rng, used)
    expect(human.trim().split(/\s+/).length).toBe(2)
    const elf = pickExpandedName('elf', 'female', rng, used)
    expect(elf.trim().split(/\s+/).length).toBe(1)
  })

  it('does not repeat a name within one world across many draws', () => {
    const rng = new SeededRandom('world-seed')
    const used = new Set<string>()
    const names: string[] = []
    for (let i = 0; i < 400; i++) {
      names.push(pickExpandedName('human', i % 2 ? 'male' : 'female', rng, used))
    }
    expect(new Set(names).size).toBe(names.length)
  })

  it('is deterministic under a fixed seed', () => {
    const run = () => {
      const rng = new SeededRandom('fixed')
      const used = new Set<string>()
      return Array.from({ length: 20 }, () => pickExpandedName('human', 'male', rng, used))
    }
    expect(run()).toEqual(run())
  })
})
