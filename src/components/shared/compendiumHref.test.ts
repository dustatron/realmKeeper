import { describe, it, expect } from 'vitest'
import { compendiumHref } from './compendiumHref'
import { getMonstersBySystemId } from '@domain/data/compendium'

describe('compendiumHref', () => {
  it('resolves a monster id to the bestiary route', () => {
    const m = getMonstersBySystemId('system-cairn-2e')[0]
    expect(compendiumHref(m.id)).toEqual({
      to: '/realms/compendium/monsters/$monsterId',
      params: { monsterId: m.id },
    })
  })

  it('returns null for unknown/empty', () => {
    expect(compendiumHref(null)).toBeNull()
    expect(compendiumHref('nope')).toBeNull()
  })
})
