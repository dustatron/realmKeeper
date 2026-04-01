/**
 * KeyLockGenerator - Creates key-lock relationships in dungeons.
 * Keys can be found in rooms before locked doors, creating exploration puzzles.
 */

import { newId } from "@shared/ulid";
import type {
  DungeonTheme,
  SpatialRoom,
  Passage,
  KeyLockPair,
} from "../types";
import { SeededRandom } from "../SeededRandom";

// Key names by theme
const KEY_NAMES: Partial<Record<DungeonTheme, string[]>> = {
  tomb: ["Pharaoh's Key", "Burial Key", "Ossuary Key", "Crypt Seal"],
  temple: ["Sacred Key", "Altar Key", "Vestry Key", "Holy Symbol"],
  fortress: ["Iron Key", "Commander's Key", "Prison Key", "Gate Key"],
  bandit_hideout: ["Rusty Key", "Loot Room Key", "Captain's Key"],
  cultist_lair: ["Ritual Key", "Blood Key", "Summoner's Key", "Dark Seal"],
  sewer: ["Grate Key", "Maintenance Key", "Smuggler's Key"],
  cave: ["Crude Key", "Beast Den Key", "Crystal Key"],
  crypt: ["Bone Key", "Coffin Key", "Mausoleum Key"],
};

const DEFAULT_KEYS = ["Iron Key", "Brass Key", "Silver Key", "Ornate Key"];

// Chance of adding a key-lock pair per eligible passage
const KEY_LOCK_CHANCE = 0.25;

export class KeyLockGenerator {
  private rng: SeededRandom;
  private theme: DungeonTheme;

  constructor(theme: DungeonTheme, seed: string) {
    this.theme = theme;
    this.rng = new SeededRandom(`${seed}-keylocks`);
  }

  /**
   * Generate key-lock pairs for a dungeon.
   * Keys are placed in rooms accessible before the locked door.
   */
  generate(rooms: SpatialRoom[], passages: Passage[]): KeyLockPair[] {
    const pairs: KeyLockPair[] = [];

    // Build room depth map
    const roomDepth = new Map<string, number>();
    for (const room of rooms) {
      roomDepth.set(room.id, room.depth);
    }

    // Find eligible passages (not already locked, connecting to deeper rooms)
    const eligiblePassages = passages.filter((p) => {
      if (p.locked) return false; // Already locked
      if (p.hidden) return false; // Secret passages shouldn't be key-locked

      const fromDepth = roomDepth.get(p.fromRoomId) ?? 0;
      const toDepth = roomDepth.get(p.toRoomId) ?? 0;

      // Only lock passages going deeper (to higher depth)
      return toDepth > fromDepth && toDepth >= 2;
    });

    // Shuffle and pick a few to lock
    const shuffled = this.rng.shuffle([...eligiblePassages]);
    const maxLocks = Math.min(3, Math.ceil(rooms.length / 5));
    let lockCount = 0;

    for (const passage of shuffled) {
      if (lockCount >= maxLocks) break;
      if (!this.rng.chance(KEY_LOCK_CHANCE)) continue;

      const pair = this.createKeyLockPair(passage, rooms, roomDepth);
      if (pair) {
        pairs.push(pair);
        passage.locked = true;
        passage.keyId = pair.keyId;
        lockCount++;
      }
    }

    return pairs;
  }

  /**
   * Create a key-lock pair for a specific passage.
   */
  private createKeyLockPair(
    passage: Passage,
    rooms: SpatialRoom[],
    roomDepth: Map<string, number>
  ): KeyLockPair | null {
    const fromDepth = roomDepth.get(passage.fromRoomId) ?? 0;

    // Find rooms at shallower or equal depth to place the key
    const keyRoomCandidates = rooms.filter((r) => {
      const depth = roomDepth.get(r.id) ?? 0;
      // Key must be accessible before the lock (at shallower depth)
      // Don't place key in entrance
      return depth <= fromDepth && r.type !== "entrance" && depth >= 1;
    });

    if (keyRoomCandidates.length === 0) return null;

    const keyRoom = this.rng.pick(keyRoomCandidates);
    const keyId = `key-${newId()}`;
    const keyName = this.getKeyName();

    return {
      keyId,
      keyName,
      keyRoomId: keyRoom.id,
      lockedPassageId: passage.id,
    };
  }

  /**
   * Get a theme-appropriate key name.
   */
  private getKeyName(): string {
    const themeKeys = KEY_NAMES[this.theme] ?? DEFAULT_KEYS;
    return this.rng.pick(themeKeys);
  }
}

/**
 * Generate key-lock pairs for a dungeon.
 */
export function generateKeyLocks(
  theme: DungeonTheme,
  rooms: SpatialRoom[],
  passages: Passage[],
  seed: string
): KeyLockPair[] {
  const generator = new KeyLockGenerator(theme, seed);
  return generator.generate(rooms, passages);
}
