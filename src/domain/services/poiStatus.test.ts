import { describe, it, expect } from 'vitest'
import { statusPatch, visitedPatch } from './poiStatus'
import type { POI } from '@domain/entities/POI'
import type { WorldDate } from '@domain/value-objects/WorldDate'

const base = (over: Partial<POI> = {}): POI =>
  ({
    id: 'p', regionId: 'r', parentPoiId: null, name: 'X', description: '', type: 'dungeon',
    subtypeLabel: null, floor: null, tags: [], position: null, mapRef: null, markerColor: null,
    readAloud: '', gmNotes: '', trouble: '', mood: '', sensory: '', services: [], imageUrl: null,
    monsterRefs: [], magicItemRefs: [], spellRefs: [], equipmentRefs: [], locationSeed: null,
    traps: [], treasure: [], roomWidth: null, roomLength: null, visited: false, status: 'unexplored',
    lastVisitedDate: null, dangerLevel: null, currentOccupant: null, lightLevel: null,
    wanderingMonsters: [], encounterChance: null, watabouSeed: null, watabouGenerator: null,
    watabouData: null, spatialDungeon: null, dungeonGenOptions: null, ruinSite: null,
    landmarkLore: null, poiGenOptions: null, sessionLog: [], starred: false, createdAt: 0, updatedAt: 0,
    ...over,
  }) as POI

const date: WorldDate = { year: 1, season: 'spring', day: 3 }

describe('poiStatus invariant helpers', () => {
  it('statusPatch keeps visited === (status !== unexplored)', () => {
    expect(statusPatch(base(), 'explored')).toMatchObject({ visited: true, status: 'explored' })
    expect(statusPatch(base(), 'cleared')).toMatchObject({ visited: true, status: 'cleared' })
    expect(statusPatch(base({ visited: true, status: 'cleared' }), 'unexplored'))
      .toMatchObject({ visited: false, status: 'unexplored' })
  })

  it('stamps lastVisitedDate only on the first visit', () => {
    expect(statusPatch(base(), 'explored', date).lastVisitedDate).toEqual(date)
    // already visited → keep prior date, do not re-stamp
    const prior: WorldDate = { year: 1, season: 'winter', day: 1 }
    expect(statusPatch(base({ visited: true, status: 'explored', lastVisitedDate: prior }), 'cleared', date).lastVisitedDate)
      .toEqual(prior)
  })

  it('clears lastVisitedDate when returning to unexplored', () => {
    expect(statusPatch(base({ visited: true, status: 'cleared', lastVisitedDate: date }), 'unexplored').lastVisitedDate)
      .toBeNull()
  })

  it('visitedPatch preserves a richer status when re-marking visited', () => {
    // toggling visited ON from cleared keeps cleared
    expect(visitedPatch(base({ visited: true, status: 'cleared' }), true)).toMatchObject({ status: 'cleared' })
    // from unexplored → explored
    expect(visitedPatch(base(), true)).toMatchObject({ visited: true, status: 'explored' })
    // un-visiting always returns to unexplored
    expect(visitedPatch(base({ visited: true, status: 'cleared' }), false)).toMatchObject({ visited: false, status: 'unexplored' })
  })
})
