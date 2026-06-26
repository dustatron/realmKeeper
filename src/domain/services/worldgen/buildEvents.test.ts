import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { POI } from '@domain/entities/POI'
import { SEASONS } from '@shared/constants'
import { buildEvents } from './buildEvents'

const settlement = (id: string, subtype: string): POI =>
  ({ id, regionId: 'r1', type: 'settlement', subtypeLabel: subtype, name: `Town-${id}` } as POI)

describe('buildEvents', () => {
  it('returns no events when there are no settlements', () => {
    expect(buildEvents([], 'w1', 30, 3, new SeededRandom('x'))).toEqual([])
  })

  it('gives a small settlement exactly one own market (size-scaled)', () => {
    const small = buildEvents([settlement('a', 'Hamlet')], 'w1', 30, 3, new SeededRandom('s'))
    expect(small.filter((e) => e.poiId === 'a' && e.type === 'market')).toHaveLength(1)
  })

  it('every event is a recurring annual POIEvent located at a settlement', () => {
    const events = buildEvents(
      [settlement('a', 'City'), settlement('b', 'Village'), settlement('c', 'Hamlet')],
      'w1', 30, 4, new SeededRandom('seed'),
    )
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) {
      expect(e.recurring).toBe(true)
      expect(e.trigger.year).toBeNull()
      expect(e.trigger.watch).toBeNull()
      expect(e.trigger.day).toBeGreaterThanOrEqual(1)
      expect(e.trigger.day).toBeLessThanOrEqual(30)
      expect(e.durationWatches).toBe(4)
      expect(e.isActive).toBe(false)
      expect(['a', 'b', 'c']).toContain(e.poiId)
      expect(['festival', 'market', 'ceremony']).toContain(e.type)
    }
  })

  it('gives every season the floor of celebrations at distinct settlements', () => {
    const settlements = Array.from({ length: 8 }, (_, i) => settlement(`s${i}`, 'Village'))
    const events = buildEvents(settlements, 'w1', 30, 3, new SeededRandom('cover'))
    const n = 8
    const target = Math.min(n, Math.max(2, Math.min(4, Math.round(n / 4)))) // 2
    for (const season of SEASONS) {
      const distinct = new Set(events.filter((e) => e.trigger.season === season).map((e) => e.poiId))
      expect(distinct.size, `season ${season}`).toBeGreaterThanOrEqual(target)
    }
  })

  it('is deterministic for a seed', () => {
    const mk = () => buildEvents([settlement('a', 'City'), settlement('b', 'Hamlet')], 'w1', 30, 3, new SeededRandom('det'))
    const a = mk()
    const b = mk()
    expect(a.length).toBe(b.length)
    for (let i = 0; i < a.length; i++) {
      expect(a[i].poiId).toBe(b[i].poiId)
      expect(a[i].type).toBe(b[i].type)
      expect(a[i].name).toBe(b[i].name)
      expect(a[i].trigger.season).toBe(b[i].trigger.season)
      expect(a[i].trigger.day).toBe(b[i].trigger.day)
    }
  })
})
