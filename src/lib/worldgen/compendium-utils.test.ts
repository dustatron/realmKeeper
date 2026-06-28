import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { resolveCreature, monsterThreat } from './compendium-utils'
import { getCompendiumById } from '@domain/data/compendium'
import type { CompendiumMonster } from '@domain/entities/Compendium'

describe('resolveCreature (worldgen)', () => {
  it('resolves a known cairn creature deterministically', () => {
    const a = resolveCreature('wolf', 'system-cairn-2e', new SeededRandom('s'))
    const b = resolveCreature('wolf', 'system-cairn-2e', new SeededRandom('s'))
    expect(a).toEqual(b)
    expect(a?.name).toBeTruthy()
  })

  it('honors an explicit levelCap for shadowdark fallback', () => {
    // Unknown slug forces the filtered random branch; low cap must restrict the pool.
    const picked = resolveCreature('zzz_not_a_real_slug', 'system-shadowdark', new SeededRandom('s'), { levelCap: 1 })
    expect(picked).not.toBeNull()
    const entry = getCompendiumById(picked!.id) as CompendiumMonster
    expect(monsterThreat(entry)).toBeLessThanOrEqual(1)
  })
})
