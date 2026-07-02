import { describe, it, expect } from 'vitest'
import { migrateEncounterCategories } from './v47-encounter-categories'
import { DEFAULT_ENCOUNTER_ENTRIES } from '@domain/data/default-encounter-tables'

describe('migrateEncounterCategories', () => {
  it('moves old loss into areaEffect and reseeds loss with attrition defaults', () => {
    const row = { id: 't1', loss: ['A blizzard closes in'], discovery: [], customSections: [] }
    const out = migrateEncounterCategories(row) as Record<string, unknown>
    expect(out.areaEffect).toEqual(['A blizzard closes in'])
    expect(out.loss).toEqual([...DEFAULT_ENCOUNTER_ENTRIES.loss])
  })

  it('archives a non-empty discovery into a custom section and drops the field', () => {
    const row = { id: 't2', loss: [], discovery: ['An old shrine'], customSections: [] }
    const out = migrateEncounterCategories(row) as Record<string, unknown>
    expect(out.discovery).toBeUndefined()
    const sections = out.customSections as Array<Record<string, unknown>>
    expect(sections).toHaveLength(1)
    expect(sections[0].name).toBe('Discovery (archived)')
    expect(sections[0].entries).toEqual(['An old shrine'])
  })

  it('does not archive an empty discovery', () => {
    const row = { id: 't3', loss: [], discovery: [], customSections: [] }
    const out = migrateEncounterCategories(row) as Record<string, unknown>
    expect(out.customSections).toEqual([])
  })

  it('is idempotent — a row already migrated is returned unchanged', () => {
    const row = { id: 't4', areaEffect: ['x'], loss: ['y'], customSections: [] }
    expect(migrateEncounterCategories(row)).toBe(row)
  })
})
