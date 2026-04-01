import { newId } from '@shared/ulid'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { SpatialRoom } from './types'
import type { SeededRandom } from './SeededRandom'

const COIN_TREASURE: Record<string, { name: string; value: string }[]> = {
  poor:     [{ name: 'Handful of copper pieces', value: '1d6 cp' }, { name: 'Tarnished silver coins', value: '2d6 sp' }],
  standard: [{ name: 'Silver coins', value: '2d10 sp' }, { name: 'Gold pieces', value: '1d6 gp' }, { name: 'Gem (rough)', value: '10 gp' }],
  rich:     [{ name: 'Gold pieces', value: '3d6 gp' }, { name: 'Polished gem', value: '50 gp' }, { name: 'Jeweled goblet', value: '100 gp' }],
  hoard:    [{ name: 'Gold & platinum coins', value: '5d10 gp' }, { name: 'Precious gem', value: '250 gp' }, { name: 'Ornate art object', value: '500 gp' }, { name: 'Ancient coin cache', value: '1d6 × 100 gp' }],
}

const MAGIC_ITEM_NAMES = [
  'Potion of Healing', 'Scroll of Arcane Knowledge', 'Enchanted Blade Fragment',
  'Ring of Minor Ward', 'Wand of Sparks', 'Amulet of Whispers',
  'Vial of Witch-Fire', 'Cloak of Shadows (tattered)', 'Lens of True Sight',
  'Boot of Silent Step', 'Dagger of Returning', 'Horn of the Fallen',
]

const TREASURE_CHANCES: Record<string, { deadEnd: number; treasure: number; other: number }> = {
  poor:     { deadEnd: 0.35, treasure: 0.85, other: 0.05 },
  standard: { deadEnd: 0.60, treasure: 1.00, other: 0.15 },
  rich:     { deadEnd: 0.85, treasure: 1.00, other: 0.35 },
  hoard:    { deadEnd: 1.00, treasure: 1.00, other: 0.55 },
}

export function generateRoomTreasure(
  room: SpatialRoom,
  level: string,
  includeMagicItems: boolean,
  rng: SeededRandom
): TreasureItem[] {
  const isTreasureRoom = room.themeRoomType === 'treasure_vault' ||
    room.themeRoomType === 'loot_storage' ||
    room.themeRoomType === 'treasure_grotto'

  const chance = TREASURE_CHANCES[level] ?? TREASURE_CHANCES.standard
  const roll = isTreasureRoom ? chance.treasure : room.isDeadEnd ? chance.deadEnd : chance.other
  if (!rng.chance(roll)) return []

  const items: TreasureItem[] = []
  const pool = COIN_TREASURE[level] ?? COIN_TREASURE.standard
  const count = isTreasureRoom ? rng.between(2, 4) : rng.between(1, 2)

  for (let i = 0; i < count; i++) {
    const pick = rng.pick(pool)
    items.push({ id: newId(), name: pick.name, description: '', value: pick.value, quantity: 1, collected: false })
  }

  if (includeMagicItems && (isTreasureRoom || room.isDeadEnd) && rng.chance(0.35)) {
    items.push({
      id: newId(),
      name: rng.pick(MAGIC_ITEM_NAMES),
      description: "A magical item found among the dungeon's treasures.",
      value: 'priceless',
      quantity: 1,
      collected: false,
      isMagic: true,
    })
  }

  return items
}
