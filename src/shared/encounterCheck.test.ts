import { describe, it, expect } from 'vitest'
import { evaluateEncounterCheck } from './encounterCheck'

describe('evaluateEncounterCheck', () => {
  it('triggers when the roll is 1', () => {
    const r = evaluateEncounterCheck(6, () => 1)
    expect(r).toEqual({ roll: 1, chance: 6, triggered: true })
  })

  it('does not trigger on a non-1 roll', () => {
    const r = evaluateEncounterCheck(6, () => 4)
    expect(r.triggered).toBe(false)
    expect(r.roll).toBe(4)
  })

  it('defaults a null chance to 6', () => {
    expect(evaluateEncounterCheck(null, () => 2).chance).toBe(6)
  })

  it('clamps chance to the 2..20 range', () => {
    expect(evaluateEncounterCheck(1, () => 1).chance).toBe(2)
    expect(evaluateEncounterCheck(999, () => 1).chance).toBe(20)
  })
})
