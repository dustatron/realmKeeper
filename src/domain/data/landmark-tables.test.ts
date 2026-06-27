import { describe, it, expect } from 'vitest'
import * as T from './landmark-tables'

describe('landmark tables', () => {
  it('each table has at least 8 non-empty entries', () => {
    for (const key of ['LANDMARK_LEGENDS','LANDMARK_TRUTHS','LANDMARK_SECRETS','LANDMARK_TRIGGERS','LANDMARK_EFFECTS','LANDMARK_QUEST_HOOKS'] as const) {
      const arr = (T as Record<string, readonly string[]>)[key]
      expect(arr.length).toBeGreaterThanOrEqual(8)
      expect(arr.every((s) => s.trim().length > 0)).toBe(true)
    }
  })
})
