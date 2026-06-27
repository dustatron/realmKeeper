import { newId } from '@shared/ulid'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { SpatialRoom } from './types'
import type { SeededRandom } from './SeededRandom'
import { pickWeapon, pickGear, pickSpellScroll, pickMagicItem } from '~/lib/worldgen/compendium-utils'

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
      ...(picked.id ? { compendiumId: picked.id } : {}),
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
      compendiumId: picked.id,
    })
    result.set(room.id, existing)
  }
  return result
}

/** Distribute weapons across rooms — guarantees at least 1, more based on treasure level */
export function generateWeapons(
  rooms: SpatialRoom[],
  treasureLevel: string,
  systemId: string,
  rng: SeededRandom
): Map<string, TreasureItem[]> {
  const result = new Map<string, TreasureItem[]>()
  const counts: Record<string, number> = { poor: 1, standard: 2, rich: 3, hoard: 4 }
  const count = counts[treasureLevel] ?? 2
  const eligible = rooms.filter((r) => r.type !== 'entrance' && r.type !== 'exit')
  if (eligible.length === 0) return result

  for (let i = 0; i < count; i++) {
    const room = rng.pick(eligible)
    const weapon = pickWeapon(systemId, rng.child(`weapon-${i}`))
    if (!weapon) continue
    const existing = result.get(room.id) ?? []
    existing.push({
      id: newId(),
      name: weapon.name,
      description: [
        weapon.damage ? `Damage: ${weapon.damage}` : '',
        `Condition: ${weapon.condition}`,
      ].filter(Boolean).join(' · '),
      value: '',
      quantity: 1,
      collected: false,
    })
    result.set(room.id, existing)
  }
  return result
}

/** Distribute gear across rooms — guarantees at least 1, more based on treasure level */
export function generateGear(
  rooms: SpatialRoom[],
  treasureLevel: string,
  systemId: string,
  rng: SeededRandom
): Map<string, TreasureItem[]> {
  const result = new Map<string, TreasureItem[]>()
  const counts: Record<string, number> = { poor: 1, standard: 2, rich: 3, hoard: 4 }
  const count = counts[treasureLevel] ?? 2
  const eligible = rooms.filter((r) => r.type !== 'entrance' && r.type !== 'exit')
  if (eligible.length === 0) return result

  for (let i = 0; i < count; i++) {
    const room = rng.pick(eligible)
    const gear = pickGear(systemId, rng.child(`gear-${i}`))
    if (!gear) continue
    const existing = result.get(room.id) ?? []
    existing.push({
      id: newId(),
      name: gear.name,
      description: `Condition: ${gear.condition}`,
      value: '',
      quantity: 1,
      collected: false,
    })
    result.set(room.id, existing)
  }
  return result
}
