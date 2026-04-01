import { newId } from '@shared/ulid'
import type { DungeonTheme, SpatialRoom, Passage, KeyLockPair } from '../types'
import { SeededRandom } from '../SeededRandom'

const KEY_NAMES: Partial<Record<DungeonTheme, string[]>> = {
  tomb: ['Pharaoh\'s Key', 'Burial Key', 'Ossuary Key', 'Crypt Seal'],
  temple: ['Sacred Key', 'Altar Key', 'Vestry Key', 'Holy Symbol'],
  fortress: ['Iron Key', 'Commander\'s Key', 'Prison Key', 'Gate Key'],
  bandit_hideout: ['Rusty Key', 'Loot Room Key', 'Captain\'s Key'],
  cultist_lair: ['Ritual Key', 'Blood Key', 'Summoner\'s Key', 'Dark Seal'],
  sewer: ['Grate Key', 'Maintenance Key', 'Smuggler\'s Key'],
  cave: ['Crude Key', 'Beast Den Key', 'Crystal Key'],
  crypt: ['Bone Key', 'Coffin Key', 'Mausoleum Key'],
}

const DEFAULT_KEYS = ['Iron Key', 'Brass Key', 'Silver Key', 'Ornate Key']
const KEY_LOCK_CHANCE = 0.25

export function generateKeyLocks(theme: DungeonTheme, rooms: SpatialRoom[], passages: Passage[], seed: string): KeyLockPair[] {
  const rng = new SeededRandom(`${seed}-keylocks`)
  const pairs: KeyLockPair[] = []
  const roomDepth = new Map<string, number>()
  for (const room of rooms) roomDepth.set(room.id, room.depth)

  const eligiblePassages = passages.filter((p) => {
    if (p.locked || p.hidden) return false
    const fromDepth = roomDepth.get(p.fromRoomId) ?? 0
    const toDepth = roomDepth.get(p.toRoomId) ?? 0
    return toDepth > fromDepth && toDepth >= 2
  })

  const shuffled = rng.shuffle([...eligiblePassages])
  const maxLocks = Math.min(3, Math.ceil(rooms.length / 5))
  let lockCount = 0

  for (const passage of shuffled) {
    if (lockCount >= maxLocks) break
    if (!rng.chance(KEY_LOCK_CHANCE)) continue
    const fromDepth = roomDepth.get(passage.fromRoomId) ?? 0
    const keyRoomCandidates = rooms.filter((r) => {
      const depth = roomDepth.get(r.id) ?? 0
      return depth <= fromDepth && r.type !== 'entrance' && depth >= 1
    })
    if (keyRoomCandidates.length === 0) continue
    const keyRoom = rng.pick(keyRoomCandidates)
    const keyId = `key-${newId()}`
    const themeKeys = KEY_NAMES[theme] ?? DEFAULT_KEYS
    const keyName = rng.pick(themeKeys)
    pairs.push({ keyId, keyName, keyRoomId: keyRoom.id, lockedPassageId: passage.id })
    passage.locked = true
    passage.keyId = keyId
    lockCount++
  }

  return pairs
}
