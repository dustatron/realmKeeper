/**
 * TrapGenerator - Places traps in rooms and passages based on theme.
 * Traps can appear in hallways/passages, not just rooms.
 */

import type {
  DungeonTheme,
  SpatialRoom,
  Passage,
  Hazard,
  TrapTemplate,
} from "../types";
import { SeededRandom } from "../SeededRandom";
import { getBlueprint } from "./DungeonBlueprints";

// Base trap chance by location type
const ROOM_TRAP_CHANCE = 0.20; // 20% base for rooms
const PASSAGE_TRAP_CHANCE = 0.15; // 15% base for passages
const TRAP_ROOM_CHANCE = 0.80; // 80% for trap_room type

// Multipliers for special conditions
const DEAD_END_TRAP_MULTIPLIER = 1.5; // Dead ends are more likely trapped
const TREASURE_ROOM_TRAP_MULTIPLIER = 1.8; // Treasure rooms are heavily trapped
const DEEP_ROOM_MULTIPLIER = 1.2; // Deeper = more dangerous

/**
 * TrapGenerator class for placing traps throughout a dungeon.
 */
export class TrapGenerator {
  private rng: SeededRandom;
  private trapPool: TrapTemplate[];
  private theme: DungeonTheme;

  constructor(theme: DungeonTheme, seed: string) {
    this.theme = theme;
    this.rng = new SeededRandom(`${seed}-traps`);
    this.trapPool = getBlueprint(theme).trapPool;
  }

  /**
   * Place traps in rooms and passages throughout the dungeon.
   */
  placeTraps(rooms: SpatialRoom[], passages: Passage[]): void {
    // Place traps in rooms
    for (const room of rooms) {
      const trap = this.maybeGenerateRoomTrap(room);
      if (trap) {
        room.hazards.push(trap);
      }
    }

    // Place traps in passages
    for (const passage of passages) {
      const trap = this.maybeGeneratePassageTrap(passage);
      if (trap) {
        passage.trap = trap;
      }
    }
  }

  /**
   * Maybe generate a trap for a room based on type and conditions.
   */
  private maybeGenerateRoomTrap(room: SpatialRoom): Hazard | null {
    let trapChance = ROOM_TRAP_CHANCE;

    // Trap rooms are almost always trapped
    if (room.type === "trap_room") {
      trapChance = TRAP_ROOM_CHANCE;
    }

    // Modify based on room characteristics
    if (room.isDeadEnd) {
      trapChance *= DEAD_END_TRAP_MULTIPLIER;
    }

    if (room.themeRoomType === "treasure_vault" ||
        room.themeRoomType === "loot_storage" ||
        room.themeRoomType === "treasure_grotto") {
      trapChance *= TREASURE_ROOM_TRAP_MULTIPLIER;
    }

    // Deeper rooms more dangerous
    if (room.depth >= 3) {
      trapChance *= DEEP_ROOM_MULTIPLIER;
    }

    // Cap at 95%
    trapChance = Math.min(trapChance, 0.95);

    if (!this.rng.chance(trapChance)) {
      return null;
    }

    return this.generateTrap("room");
  }

  /**
   * Maybe generate a trap for a passage.
   */
  private maybeGeneratePassageTrap(passage: Passage): Hazard | null {
    let trapChance = PASSAGE_TRAP_CHANCE;

    // Locked passages are more likely to be trapped
    if (passage.locked) {
      trapChance *= 1.5;
    }

    // Secret passages often trapped to discourage snooping
    if (passage.hidden) {
      trapChance *= 1.3;
    }

    // Long passages have more trap opportunities
    if (passage.waypoints.length > 5) {
      trapChance *= 1.2;
    }

    if (!this.rng.chance(trapChance)) {
      return null;
    }

    return this.generateTrap("passage");
  }

  /**
   * Generate a trap from the theme pool for a specific location type.
   * Includes Cairn-style warning signs, tells, and disarm methods.
   */
  private generateTrap(location: "room" | "passage"): Hazard {
    // Filter traps that can appear in this location
    const validTraps = this.trapPool.filter(
      (t) => t.locations.includes(location)
    );

    if (validTraps.length === 0) {
      // Fallback to universal trap with Cairn-style fields
      return {
        name: "Hidden Trap",
        description: "A concealed trap mechanism",
        damage: "2d6 STR",
        save: "DC 13 DEX",
        disarmed: false,
        trigger: "Stepping on the trigger mechanism",
        passiveHint: "Something feels wrong here",
        activeHint: "Faint scratches on the floor suggest movement",
        disarmMethods: ["Move slowly and watch your step", "Probe ahead with a pole"],
        consequence: "The noise alerts nearby creatures",
        targetAttribute: "STR",
      };
    }

    const template = this.rng.pick(validTraps);
    return {
      name: template.name,
      description: template.description,
      damage: template.damage,
      save: template.save,
      disarmed: false,
      // Cairn-style fields
      trigger: template.trigger,
      passiveHint: template.passiveHint,
      activeHint: template.activeHint,
      disarmMethods: template.disarmMethods,
      consequence: template.consequence,
      targetAttribute: template.targetAttribute,
    };
  }

  /**
   * Get trap placement statistics for debugging/display.
   */
  static countTraps(rooms: SpatialRoom[], passages: Passage[]): {
    roomTraps: number;
    passageTraps: number;
    total: number;
  } {
    const roomTraps = rooms.reduce(
      (count, room) => count + room.hazards.filter((h) => !h.disarmed).length,
      0
    );
    const passageTraps = passages.filter((p) => p.trap && !p.trap.disarmed).length;

    return {
      roomTraps,
      passageTraps,
      total: roomTraps + passageTraps,
    };
  }
}

/**
 * Place traps throughout a dungeon.
 */
export function placeTraps(
  theme: DungeonTheme,
  rooms: SpatialRoom[],
  passages: Passage[],
  seed: string
): void {
  const generator = new TrapGenerator(theme, seed);
  generator.placeTraps(rooms, passages);
}
