import { describe, it, expect } from 'vitest'
import { matchCompendiumMonster } from './matchCompendiumMonster'
import { getMonstersBySystemId } from '@domain/data/compendium'

describe('matchCompendiumMonster', () => {
  it('returns null when systemId is null', () => {
    expect(matchCompendiumMonster('Goblin scouts', null)).toBeNull()
  })

  it('matches a monster whose name appears in the entry text', () => {
    const monsters = getMonstersBySystemId('system-shadowdark')
    // pick a real monster name from the shadowdark compendium
    const sample = monsters[0]
    const match = matchCompendiumMonster(`A pack of ${sample.name} approaches`, 'system-shadowdark')
    expect(match?.compendiumId).toBe(sample.id)
    expect(match?.name).toBe(sample.name)
  })

  it('returns null when no monster name is present', () => {
    expect(matchCompendiumMonster('A gust of cold wind', 'system-shadowdark')).toBeNull()
  })
})
