import { SeededRandom } from '~/lib/dungeon/SeededRandom'

export type NameKind = 'settlement' | 'dungeon' | 'ruin' | 'landmark' | 'region'
export const NAME_KINDS: NameKind[] = ['settlement', 'dungeon', 'ruin', 'landmark', 'region']

const SETTLEMENT_PREFIX = ['Ash', 'Black', 'Grey', 'Oak', 'Stone', 'Thorn', 'Wind', 'Salt', 'Fern', 'Crow']
const SETTLEMENT_SUFFIX = ['ford', 'haven', 'bury', 'wick', 'moor', 'hollow', 'gate', 'reach', 'mill', 'fall']

const DUNGEON_PREFIX = ['Tomb of', 'Vault of', 'Pit of', 'Halls of', 'Warren of', 'Crypt of', 'Den of']
const DUNGEON_NOUN = ['the Forgotten', 'the Pale King', 'Vël', 'the Worm', 'Ashes', 'the Drowned', 'the Gaunt']

const RUIN_PREFIX = ['Broken', 'Sunken', 'Shattered', 'Hollow', 'Weeping', 'Fallen']
const RUIN_NOUN = ['Spire', 'Keep', 'Temple', 'Bastion', 'Arch', 'Manse']

const LANDMARK = [
  'the Standing Stones', 'the Hanged Oak', 'Gallows Hill', 'the Weeping Falls',
  'the Bone Bridge', 'the Salt Pillar', 'the Watcher\'s Cairn', 'the Black Tarn',
]

const REGION_PREFIX = ['The', 'Old', 'Wild', 'Far', 'Grim', 'Lost']
const REGION_NOUN = ['Marches', 'Reaches', 'Downs', 'Wilds', 'Expanse', 'Hinterlands', 'Verge']

export function pickName(kind: NameKind, rng: SeededRandom): string {
  switch (kind) {
    case 'settlement':
      return `${rng.pick(SETTLEMENT_PREFIX)}${rng.pick(SETTLEMENT_SUFFIX)}`
    case 'dungeon':
      return `${rng.pick(DUNGEON_PREFIX)} ${rng.pick(DUNGEON_NOUN)}`
    case 'ruin':
      return `The ${rng.pick(RUIN_PREFIX)} ${rng.pick(RUIN_NOUN)}`
    case 'landmark':
      return rng.pick(LANDMARK)
    case 'region':
      return `${rng.pick(REGION_PREFIX)} ${rng.pick(REGION_NOUN)}`
  }
}
