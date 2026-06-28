import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { newId } from '@shared/ulid'
import type { Realm } from '@domain/entities/Realm'
import { executeDeleteRealms } from './DeleteRealms'

const container = createContainer()

beforeEach(async () => {
  await db.open()
  await db.worlds.clear()
})

const makeRealm = (name: string): Realm => {
  const now = Date.now()
  return {
    id: newId(),
    name,
    systemId: 'system-cairn-2e',
    description: '',
    currentYear: 1,
    currentSeason: 'spring',
    currentDay: 1,
    currentWatch: 0,
    daysPerSeason: 30,
    daysPerWeek: 7,
    watchesPerDay: 4,
    moonCycleLength: 28,
    factionTurnTrigger: 'day',
    completedThroughDay: 0,
    customRaces: [],
    raceColors: {},
    starredMonsterIds: [],
    starredSpellIds: [],
    starredMagicItemIds: [],
    hiddenCompendiumIds: [],
    createdAt: now,
    updatedAt: now,
  }
}

describe('executeDeleteRealms', () => {
  it('deletes every realm whose id is given, leaving the rest', async () => {
    const a = makeRealm('Keep A')
    const b = makeRealm('Delete B')
    const c = makeRealm('Delete C')
    const d = makeRealm('Keep D')
    await db.worlds.bulkPut([a, b, c, d])

    await executeDeleteRealms([b.id, c.id], { realmRepo: container.realmRepo })

    const remaining = await db.worlds.toArray()
    const ids = remaining.map((r) => r.id).sort()
    expect(ids).toEqual([a.id, d.id].sort())
  })

  it('is a no-op for an empty id list', async () => {
    const a = makeRealm('A')
    await db.worlds.put(a)

    await executeDeleteRealms([], { realmRepo: container.realmRepo })

    expect(await db.worlds.count()).toBe(1)
  })
})
