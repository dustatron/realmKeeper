import { newId } from '@shared/ulid'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { SpatialRoom } from './types'
import type { SeededRandom } from './SeededRandom'
import { pickWeapon, pickGear, pickSpellScroll, pickMagicItem } from './compendium-utils'

const COIN_TREASURE: Record<string, { name: string; value: string }[]> = {
  poor:     [{ name: 'Handful of copper pieces', value: '1d6 cp' }, { name: 'Tarnished silver coins', value: '2d6 sp' }],
  standard: [{ name: 'Silver coins', value: '2d10 sp' }, { name: 'Gold pieces', value: '1d6 gp' }, { name: 'Gem (rough)', value: '10 gp' }],
  rich:     [{ name: 'Gold pieces', value: '3d6 gp' }, { name: 'Polished gem', value: '50 gp' }, { name: 'Jeweled goblet', value: '100 gp' }],
  hoard:    [{ name: 'Gold & platinum coins', value: '5d10 gp' }, { name: 'Precious gem', value: '250 gp' }, { name: 'Ornate art object', value: '500 gp' }, { name: 'Ancient coin cache', value: '1d6 × 100 gp' }],
}

const TREASURE_CHANCES: Record<string, { deadEnd: number; treasure: number; other: number }> = {
  poor:     { deadEnd: 0.35, treasure: 0.85, other: 0.05 },
  standard: { deadEnd: 0.60, treasure: 1.00, other: 0.15 },
  rich:     { deadEnd: 0.85, treasure: 1.00, other: 0.35 },
  hoard:    { deadEnd: 1.00, treasure: 1.00, other: 0.55 },
}

export function generateRoomTreasure(
  room: SpatialRoom,
  level: string,
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
  return items
}

/** Generate exactly `count` magic items distributed across eligible rooms */
export function generateMagicItems(
  rooms: SpatialRoom[],
  count: number,
  systemId: string,
  rng: SeededRandom
): Map<string, TreasureItem[]> {
  const result = new Map<string, TreasureItem[]>()
  if (count === 0) return result

  // Priority: treasure vaults → dead-ends → any non-entrance room
  const eligible = [
    ...rooms.filter((r) => r.themeRoomType === 'treasure_vault' || r.themeRoomType === 'loot_storage' || r.themeRoomType === 'treasure_grotto'),
    ...rooms.filter((r) => r.isDeadEnd && r.type !== 'entrance'),
    ...rooms.filter((r) => r.type !== 'entrance' && r.type !== 'exit'),
  ]

  for (let i = 0; i < count; i++) {
    const room = eligible[i % eligible.length]
    const picked = pickMagicItem(systemId, rng.child(`magic-item-${i}`))
    if (!picked) continue
    const existing = result.get(room.id) ?? []
    existing.push({
      id: newId(),
      name: picked.name,
      description: picked.description,
      value: 'priceless',
      quantity: 1,
      collected: false,
      isMagic: true,
    })
    result.set(room.id, existing)
  }
  return result
}

/** Generate exactly `count` spell scrolls distributed across eligible rooms */
export function generateSpellScrolls(
  rooms: SpatialRoom[],
  count: number,
  systemId: string,
  rng: SeededRandom
): Map<string, TreasureItem[]> {
  const result = new Map<string, TreasureItem[]>()
  if (count === 0) return result

  const eligible = [
    ...rooms.filter((r) => r.themeRoomType === 'temple_library' || r.themeRoomType === 'forbidden_library' || r.themeRoomType === 'reliquary'),
    ...rooms.filter((r) => r.isDeadEnd && r.type !== 'entrance'),
    ...rooms.filter((r) => r.type !== 'entrance' && r.type !== 'exit'),
  ]

  for (let i = 0; i < count; i++) {
    const room = eligible[i % eligible.length]
    const picked = pickSpellScroll(systemId, rng.child(`spell-${i}`))
    if (!picked) continue
    const existing = result.get(room.id) ?? []
    existing.push({
      id: newId(),
      name: picked.name,
      description: picked.description,
      value: 'rare',
      quantity: 1,
      collected: false,
      isMagic: true,
    })
    result.set(room.id, existing)
  }
  return result
}

/** Generate weapon loot for a room */
export function generateWeaponLoot(
  room: SpatialRoom,
  systemId: string,
  rng: SeededRandom
): TreasureItem | null {
  const weapon = pickWeapon(systemId, rng)
  if (!weapon) return null
  return {
    id: newId(),
    name: weapon.name,
    description: weapon.damage ? `Damage: ${weapon.damage}` : '',
    value: '',
    quantity: 1,
    collected: false,
  }
}

/** Generate gear loot for a room */
export function generateGearLoot(
  room: SpatialRoom,
  systemId: string,
  rng: SeededRandom
): TreasureItem | null {
  const gear = pickGear(systemId, rng)
  if (!gear) return null
  return {
    id: newId(),
    name: gear.name,
    description: '',
    value: '',
    quantity: 1,
    collected: false,
  }
}
