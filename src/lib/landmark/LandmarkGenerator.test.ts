import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { generateLandmark } from './LandmarkGenerator'

describe('generateLandmark', () => {
  it('fills all seven fields', () => {
    const lore = generateLandmark('s', 'forest', new SeededRandom('s'))
    for (const k of ['legend','truth','secret','interactionTrigger','interactionEffect','questHook','sensory'] as const) {
      expect(lore[k].trim().length).toBeGreaterThan(0)
    }
  })

  it('is deterministic for a given seed', () => {
    const a = generateLandmark('z', 'desert', new SeededRandom('z'))
    const b = generateLandmark('z', 'desert', new SeededRandom('z'))
    expect(a).toEqual(b)
  })

  it('keeps trigger and effect as distinct fields', () => {
    const lore = generateLandmark('q', 'hills', new SeededRandom('q'))
    expect(lore.interactionTrigger).not.toBe(lore.interactionEffect)
  })
})
