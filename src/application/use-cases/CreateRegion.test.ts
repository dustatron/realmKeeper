import { describe, it, expect } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeCreateRegion } from './CreateRegion'

describe('executeCreateRegion', () => {
  it('defaults problem to empty string', async () => {
    await db.open()
    const c = createContainer()
    const r = await executeCreateRegion({ worldId: 'w', name: 'R' }, { regionRepo: c.regionRepo })
    expect(r.problem).toBe('')
  })
})
