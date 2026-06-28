import { describe, it, expect } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeRerollRegionProblem } from './RerollRegionProblem'
import { REGION_PROBLEMS } from '@domain/services/worldgen/regionFlavor'

describe('executeRerollRegionProblem', () => {
  it('sets a new problem from the table and persists it', async () => {
    await db.open(); await db.regions.clear()
    const c = createContainer()
    await db.regions.put({ id: 'r1', worldId: 'w', name: 'R', description: '', terrain: 'forest', features: [], dangers: [], settlements: [], resources: [], people: [], problem: 'old', boundary: null, color: null, imageUrl: null, createdAt: 0, updatedAt: 0 } as any)
    const next = await executeRerollRegionProblem('r1', { regionRepo: c.regionRepo })
    expect(REGION_PROBLEMS).toContain(next)
    const fromDb = await db.regions.get('r1')
    expect(fromDb?.problem).toBe(next)
  })
})
