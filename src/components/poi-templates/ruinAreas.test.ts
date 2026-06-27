import { describe, it, expect } from 'vitest'
import { areaView } from './ruinAreas'
import type { RuinArea } from '@domain/entities/RuinSite'
import type { NPC } from '@domain/entities/NPC'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'

const makeNPC = (id: string, name: string): NPC =>
  ({ id, name } as unknown as NPC)

const makeItem = (id: string, areaIndex: number, name = 'Gold'): TreasureItem =>
  ({ id, name, description: '', value: '', quantity: 1, collected: false, areaIndex } as TreasureItem)

const baseArea: RuinArea = {
  name: 'Gatehouse',
  order: 0,
  isEntry: true,
  readAloud: 'A crumbling arch.',
  detail: 'Structural hazard.',
  discovery: null,
  occupants: [],
}

describe('areaView', () => {
  it('filters loot by areaIndex matching area.order', () => {
    const area = { ...baseArea, order: 2 }
    const treasure = [
      makeItem('t1', 2, 'Sword'),
      makeItem('t2', 0, 'Shield'),
      makeItem('t3', 2, 'Ring'),
    ]
    const result = areaView(area, [], treasure)
    expect(result.loot.map((t) => t.id)).toEqual(['t1', 't3'])
  })

  it('resolves occupant names from npcIds', () => {
    const area = {
      ...baseArea,
      occupants: [{ npcIds: ['n1', 'n2'], activity: 'patrol' }],
    }
    const npcs = [makeNPC('n1', 'Aldric'), makeNPC('n2', 'Breta')]
    const result = areaView(area, npcs, [])
    expect(result.occupantNames).toEqual(['Aldric', 'Breta'])
  })

  it('filters out dangling npcIds that have no matching NPC', () => {
    const area = {
      ...baseArea,
      occupants: [{ npcIds: ['n1', 'ghost-id'], activity: 'lurking' }],
    }
    const npcs = [makeNPC('n1', 'Aldric')]
    const result = areaView(area, npcs, [])
    expect(result.occupantNames).toEqual(['Aldric'])
    expect(result.occupantNames).not.toContain(undefined)
  })

  it('returns empty occupantNames and loot for area with no occupants or treasure', () => {
    const result = areaView(baseArea, [], [])
    expect(result.occupantNames).toEqual([])
    expect(result.loot).toEqual([])
  })

  it('returns activity from first occupant group', () => {
    const area = {
      ...baseArea,
      occupants: [
        { npcIds: [], activity: 'sleeping' },
        { npcIds: [], activity: 'feasting' },
      ],
    }
    const result = areaView(area, [], [])
    expect(result.activity).toBe('sleeping')
  })

  it('returns empty string for activity when no occupants', () => {
    const result = areaView(baseArea, [], [])
    expect(result.activity).toBe('')
  })

  it('passes through scalar fields', () => {
    const area = { ...baseArea, name: 'Crypt', order: 3, isEntry: false, discovery: 'A skull.' }
    const result = areaView(area, [], [])
    expect(result.name).toBe('Crypt')
    expect(result.order).toBe(3)
    expect(result.isEntry).toBe(false)
    expect(result.discovery).toBe('A skull.')
  })
})
