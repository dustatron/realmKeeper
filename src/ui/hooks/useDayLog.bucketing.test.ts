import { describe, it, expect } from 'vitest'
import { bucketWorldEvents } from './useDayLog'
import { toDayKey } from '@domain/value-objects/DayKey'
import type { WorldEvent } from '@domain/entities/WorldEvent'

const dps = 30

function makeEvent(
  type: WorldEvent['type'],
  year = 1,
  season: WorldEvent['season'] = 'summer',
  day = 10,
): WorldEvent {
  return {
    id: `${type}-${Math.random()}`,
    worldId: 'world-1',
    year,
    season,
    day,
    watch: 1,
    type,
    title: `${type} event`,
    description: '',
    relatedEntityIds: [],
    createdAt: 0,
  }
}

describe('bucketWorldEvents (D4)', () => {
  it('routes doom_stage events into doomEventMap and NOT into eventMap', () => {
    const doomEvt = makeEvent('doom_stage')
    const { doomEventMap, eventMap } = bucketWorldEvents([doomEvt], dps)

    const dayKey = toDayKey(doomEvt.year, doomEvt.season, doomEvt.day, dps)
    expect((doomEventMap.get(dayKey) ?? []).some((e) => e.id === doomEvt.id)).toBe(true)
    expect((eventMap.get(dayKey) ?? []).some((e) => e.id === doomEvt.id)).toBe(false)
  })

  it('routes faction_turn events into factionTurnMap', () => {
    const ftEvt = makeEvent('faction_turn')
    const { factionTurnMap, eventMap, doomEventMap } = bucketWorldEvents([ftEvt], dps)

    const dayKey = toDayKey(ftEvt.year, ftEvt.season, ftEvt.day, dps)
    expect((factionTurnMap.get(dayKey) ?? []).some((e) => e.id === ftEvt.id)).toBe(true)
    expect((eventMap.get(dayKey) ?? []).some((e) => e.id === ftEvt.id)).toBe(false)
    expect((doomEventMap.get(dayKey) ?? []).some((e) => e.id === ftEvt.id)).toBe(false)
  })

  it('routes gm_note into gmNoteMap only', () => {
    const noteEvt = makeEvent('gm_note')
    const { gmNoteMap, eventMap, doomEventMap } = bucketWorldEvents([noteEvt], dps)

    const dayKey = toDayKey(noteEvt.year, noteEvt.season, noteEvt.day, dps)
    expect((gmNoteMap.get(dayKey) ?? []).some((e) => e.id === noteEvt.id)).toBe(true)
    expect((eventMap.get(dayKey) ?? []).some((e) => e.id === noteEvt.id)).toBe(false)
    expect((doomEventMap.get(dayKey) ?? []).some((e) => e.id === noteEvt.id)).toBe(false)
  })

  it('routes generic events into eventMap', () => {
    const genEvt = makeEvent('poi_event')
    const { eventMap, doomEventMap, factionTurnMap } = bucketWorldEvents([genEvt], dps)

    const dayKey = toDayKey(genEvt.year, genEvt.season, genEvt.day, dps)
    expect((eventMap.get(dayKey) ?? []).some((e) => e.id === genEvt.id)).toBe(true)
    expect((doomEventMap.get(dayKey) ?? []).some((e) => e.id === genEvt.id)).toBe(false)
    expect((factionTurnMap.get(dayKey) ?? []).some((e) => e.id === genEvt.id)).toBe(false)
  })

  it('drops clock_advance events entirely', () => {
    const clockEvt = makeEvent('clock_advance')
    const { eventMap, doomEventMap, factionTurnMap, gmNoteMap } = bucketWorldEvents([clockEvt], dps)

    const dayKey = toDayKey(clockEvt.year, clockEvt.season, clockEvt.day, dps)
    expect((eventMap.get(dayKey) ?? []).length).toBe(0)
    expect((doomEventMap.get(dayKey) ?? []).length).toBe(0)
    expect((factionTurnMap.get(dayKey) ?? []).length).toBe(0)
    expect((gmNoteMap.get(dayKey) ?? []).length).toBe(0)
  })

  it('buckets mixed events to correct maps on the same day', () => {
    const doomEvt = makeEvent('doom_stage')
    const ftEvt = makeEvent('faction_turn')
    const genEvt = makeEvent('poi_event')
    const clockEvt = makeEvent('clock_advance')

    const { factionTurnMap, doomEventMap, eventMap } = bucketWorldEvents(
      [doomEvt, ftEvt, genEvt, clockEvt],
      dps,
    )

    const dayKey = toDayKey(1, 'summer', 10, dps)
    expect(doomEventMap.get(dayKey)?.length).toBe(1)
    expect(factionTurnMap.get(dayKey)?.length).toBe(1)
    expect(eventMap.get(dayKey)?.length).toBe(1)
  })
})
