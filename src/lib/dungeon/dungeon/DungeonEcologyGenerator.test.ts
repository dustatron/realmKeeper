import { describe, it, expect } from 'vitest'
import { generateDungeonEcology } from './DungeonEcologyGenerator'
import type { SpatialRoom } from '../types'

const rooms = (n: number): SpatialRoom[] =>
  Array.from({ length: n }, (_, i) =>
    ({ id: `room-${i}`, type: i === 0 ? 'entrance' : 'chamber', depth: 1 }) as SpatialRoom,
  )

describe('generateDungeonEcology inhabitant creatures', () => {
  it('extracts a creature slug from creature-named inhabitants (lair theme)', () => {
    // Every lair inhabitant phrase names a creature, so a slug is always derived.
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const eco = generateDungeonEcology('lair', rooms(6), seed)
      expect(eco.inhabitantCreature).toBeTruthy()
      // the slug's keyword appears in the inhabitants phrase
      expect(eco.currentInhabitants!.toLowerCase()).toContain(
        eco.inhabitantCreature!.toLowerCase().split(',')[0].split(' ')[0],
      )
    }
  })

  it('maps "hobgoblin legion" to Hobgoblin, not Goblin', () => {
    // find a seed that rolls the hobgoblin inhabitant
    let found = false
    for (const seed of Array.from({ length: 40 }, (_, i) => `s${i}`)) {
      const eco = generateDungeonEcology('lair', rooms(6), seed)
      if (eco.currentInhabitants === 'hobgoblin legion') {
        expect(eco.inhabitantCreature).toBe('Hobgoblin')
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('the inhabitant faction controls the non-entrance rooms', () => {
    const eco = generateDungeonEcology('lair', rooms(6), 'x')
    const controlled = eco.factionInfluence![eco.currentInhabitants!]
    expect(controlled.length).toBe(5) // 6 rooms minus the entrance
  })
})
