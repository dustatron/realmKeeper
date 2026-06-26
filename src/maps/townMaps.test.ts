import { describe, expect, it } from 'vitest'
import { bucketForSize, pickTownMap, TOWN_MAPS } from './townMaps'

describe('TOWN_MAPS', () => {
  it('loads paired PNG and JSON assets', () => {
    expect(TOWN_MAPS.length).toBeGreaterThan(0)

    for (const map of TOWN_MAPS) {
      expect(map.imageUrl, `${map.id} missing imageUrl`).toBeTruthy()
      expect(map.jsonUrl, `${map.id} missing jsonUrl`).toBeTruthy()
      expect(map.url).toBe(map.imageUrl)
    }
  })

  it('picks deterministically by seed and bucket', () => {
    expect(pickTownMap('riverbend', 'sm')).toEqual(pickTownMap('riverbend', 'sm'))
    expect(pickTownMap('riverbend', 'md')).toEqual(pickTownMap('riverbend', 'md'))
  })

  it('maps child counts to town-size buckets', () => {
    expect(bucketForSize(0)).toBe('sm')
    expect(bucketForSize(8)).toBe('sm')
    expect(bucketForSize(9)).toBe('md')
    expect(bucketForSize(16)).toBe('md')
    expect(bucketForSize(17)).toBe('larg')
  })
})
