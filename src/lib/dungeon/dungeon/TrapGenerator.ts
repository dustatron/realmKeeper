import type { DungeonTheme, SpatialRoom, Passage, DungeonHazard } from '../types'
import { SeededRandom } from '../SeededRandom'
import { getBlueprint } from './DungeonBlueprints'

const ROOM_TRAP_CHANCE = 0.20
const PASSAGE_TRAP_CHANCE = 0.15
const TRAP_ROOM_CHANCE = 0.80
const DEAD_END_MULTIPLIER = 1.5
const TREASURE_ROOM_MULTIPLIER = 1.8
const DEEP_ROOM_MULTIPLIER = 1.2

export function placeTraps(theme: DungeonTheme, rooms: SpatialRoom[], passages: Passage[], seed: string): void {
  const rng = new SeededRandom(`${seed}-traps`)
  const trapPool = getBlueprint(theme).trapPool

  for (const room of rooms) {
    let trapChance = room.type === 'trap_room' ? TRAP_ROOM_CHANCE : ROOM_TRAP_CHANCE
    if (room.isDeadEnd) trapChance *= DEAD_END_MULTIPLIER
    if (room.themeRoomType === 'treasure_vault' || room.themeRoomType === 'loot_storage' || room.themeRoomType === 'treasure_grotto') {
      trapChance *= TREASURE_ROOM_MULTIPLIER
    }
    if (room.depth >= 3) trapChance *= DEEP_ROOM_MULTIPLIER
    trapChance = Math.min(trapChance, 0.95)
    if (rng.chance(trapChance)) {
      room.hazards.push(generateTrap(rng, trapPool, 'room'))
    }
  }

  for (const passage of passages) {
    let trapChance = PASSAGE_TRAP_CHANCE
    if (passage.locked) trapChance *= 1.5
    if (passage.hidden) trapChance *= 1.3
    if (passage.waypoints.length > 5) trapChance *= 1.2
    if (rng.chance(trapChance)) {
      passage.trap = generateTrap(rng, trapPool, 'passage')
    }
  }
}

function generateTrap(rng: SeededRandom, trapPool: ReturnType<typeof getBlueprint>['trapPool'], location: 'room' | 'passage'): DungeonHazard {
  const validTraps = trapPool.filter((t) => t.locations.includes(location))
  if (validTraps.length === 0) {
    return {
      name: 'Hidden Trap',
      description: 'A concealed trap mechanism',
      damage: '2d6 STR',
      save: 'DC 13 DEX',
      disarmed: false,
      trigger: 'Stepping on the trigger mechanism',
      passiveHint: 'Something feels wrong here',
      activeHint: 'Faint scratches on the floor suggest movement',
      disarmMethods: ['Move slowly and watch your step', 'Probe ahead with a pole'],
      consequence: 'The noise alerts nearby creatures',
      targetAttribute: 'STR',
    }
  }
  const template = rng.pick(validTraps)
  return {
    name: template.name,
    description: template.description,
    damage: template.damage,
    save: template.save,
    disarmed: false,
    trigger: template.trigger,
    passiveHint: template.passiveHint,
    activeHint: template.activeHint,
    disarmMethods: template.disarmMethods,
    consequence: template.consequence,
    targetAttribute: template.targetAttribute,
  }
}
