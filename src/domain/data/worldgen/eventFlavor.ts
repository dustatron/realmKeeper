import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Season } from '@shared/constants'

export type CivicType = 'festival' | 'market' | 'ceremony'

const FESTIVAL_NAMES: Record<Season, string[]> = {
  spring: ['the Greening', 'the Blossom Fair', 'the Thawing Revel', 'Maying'],
  summer: ['the Sun\'s Height', 'the Long Day Feast', 'the Midsummer Fair', 'the Bonfire Nights'],
  fall: ['the Harvest Home', 'the Reaping Feast', 'the Last Sheaf', 'the Cider Days'],
  winter: ['the Long Night', 'the Hearth Feast', 'the Frost Vigil', 'the Wassail'],
}
const CEREMONY_NAMES = ['the Rite of Founding', 'the Naming', 'the Oathtaking', 'the Remembrance', 'the Blessing of the Fields']
const MARKET_NAMES: Record<Season, string[]> = {
  spring: ['the Spring Market', 'the Seed Market'],
  summer: ['the High Market', 'the Wool Fair'],
  fall: ['the Harvest Market', 'the Cattle Fair'],
  winter: ['the Winter Market', 'the Salt Fair'],
}

export function buildCivicFlavor(
  type: CivicType,
  season: Season,
  settlementName: string,
  rng: SeededRandom,
): { name: string; description: string } {
  if (type === 'festival') {
    const n = rng.pick(FESTIVAL_NAMES[season])
    return { name: `${n} at ${settlementName}`, description: `${settlementName} keeps ${n}, a ${season} festival drawing folk from the surrounding lands.` }
  }
  if (type === 'market') {
    const n = rng.pick(MARKET_NAMES[season])
    return { name: `${n} at ${settlementName}`, description: `Traders and farmers crowd into ${settlementName} for ${n}.` }
  }
  const n = rng.pick(CEREMONY_NAMES)
  return { name: `${n} at ${settlementName}`, description: `${settlementName} observes ${n}, a solemn ${season} rite.` }
}
