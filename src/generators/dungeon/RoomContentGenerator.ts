import { newId } from "@shared/ulid";
import type {
  DungeonRoom,
  SpatialRoom,
  Encounter,
  EncounterBehavior,
  TreasureEntry,
  TreasureType,
  RoomType,
} from "./types";
import { SeededRandom, createWeightedTable } from "./SeededRandom";

// === Encounter Tables ===

const ENCOUNTER_CREATURES_BY_DEPTH: Record<number, string[]> = {
  0: ["giant_rat", "kobold", "goblin", "skeleton", "spider"],
  1: ["orc", "zombie", "hobgoblin", "wolf", "stirge"],
  2: ["bugbear", "ghoul", "ogre", "wight", "shadow"],
  3: ["troll", "wraith", "vampire_spawn", "gargoyle", "basilisk"],
  4: ["giant", "vampire", "beholder", "dragon_young", "lich"],
};

const BEHAVIOR_WEIGHTS = createWeightedTable<EncounterBehavior>({
  hostile: 50,
  neutral: 20,
  negotiable: 20,
  fleeing: 10,
});

const ROOM_ENCOUNTER_CHANCE: Record<RoomType, number> = {
  entrance: 0.1, // Reduced - entrances should feel safer
  exit: 0.1, // Exits similar to entrances
  corridor: 0.25, // Reduced - hallways less populated
  chamber: 0.35, // Reduced from 0.4
  lair: 0.9, // Lairs stay high
  trap_room: 0.1,
  treasury: 0.25, // Reduced - treasury may just have treasure
  shrine: 0.25,
  prison: 0.4,
};

// Base chance for a room to be completely empty (no encounters or treasure)
// This creates dungeon pacing - not every room has content
const EMPTY_ROOM_CHANCE = 0.35; // 35% of rooms are empty

// Room types that should never be empty
const NEVER_EMPTY_TYPES: RoomType[] = ["lair", "treasury", "prison"];

// Theme room types that should always have treasure (cache, vault, storage rooms)
const TREASURE_ROOM_THEMES = [
  "treasure_vault", "loot_storage", "smuggler_cache", "treasure_grotto",
  "reliquary", "armory", "false_tomb", // may have decoy treasure
];

// Theme room types that should never be empty (important locations)
const NEVER_EMPTY_THEMES = [
  ...TREASURE_ROOM_THEMES,
  "sarcophagus_chamber", "altar_room", "summoning_circle", "sacrifice_altar",
  "throne_room", "leaders_chamber", "boss_lair",
];

// === Treasure Tables ===

const TREASURE_TYPE_WEIGHTS = createWeightedTable<TreasureType>({
  coins: 40,
  gems: 20,
  art: 15,
  item: 20,
  magic_item: 5,
});

const COIN_VALUES = [
  "2d6 cp",
  "3d6 sp",
  "2d6 gp",
  "1d6 x 10 gp",
  "2d6 x 10 gp",
];

const GEM_DESCRIPTIONS = [
  "A small amethyst",
  "A polished agate",
  "A cloudy quartz crystal",
  "A piece of jade",
  "A tiger's eye",
  "A bloodstone",
  "A carnelian",
  "An onyx",
];

const ART_OBJECTS = [
  "A silver goblet",
  "A gold ring with gemstone",
  "A silk tapestry",
  "An ivory statuette",
  "A bronze brazier",
  "A painted portrait",
  "A jeweled dagger",
  "A golden candlestick",
];

const MUNDANE_ITEMS = [
  "A well-crafted longsword",
  "A suit of chainmail",
  "A crossbow with bolts",
  "A hooded lantern",
  "A set of thieves' tools",
  "A healer's kit",
  "A spellbook (empty)",
  "A rope of climbing",
];

const ROOM_TREASURE_CHANCE: Record<RoomType, number> = {
  entrance: 0.1,
  exit: 0.1,
  corridor: 0.1,
  chamber: 0.3,
  lair: 0.7,
  trap_room: 0.5,
  treasury: 0.95,
  shrine: 0.4,
  prison: 0.2,
};

export interface RoomContentOptions {
  seed: string;
  room: DungeonRoom;
  dungeonDepth?: number;
}

/**
 * Generate encounters for a dungeon room.
 */
export function generateRoomEncounters(options: RoomContentOptions): Encounter[] {
  const { seed, room, dungeonDepth = 1 } = options;
  const rng = new SeededRandom(`${seed}-encounter-${room.id}`);

  const encounters: Encounter[] = [];

  // Check for empty room pacing
  if (shouldBeEmptyRoom(seed, room)) {
    return encounters;
  }

  const encounterChance = ROOM_ENCOUNTER_CHANCE[room.type];

  if (!rng.chance(encounterChance)) {
    return encounters;
  }

  // Determine creature tier based on room depth and dungeon depth
  const effectiveDepth = Math.min(room.depth + dungeonDepth - 1, 4);
  const creatures = ENCOUNTER_CREATURES_BY_DEPTH[effectiveDepth] ?? ENCOUNTER_CREATURES_BY_DEPTH[0];
  const creatureType = rng.pick(creatures);

  // Count based on room size
  const countRanges: Record<string, [number, number]> = {
    cramped: [1, 2],
    small: [1, 3],
    medium: [2, 4],
    large: [3, 6],
    vast: [4, 8],
  };
  const [minCount, maxCount] = countRanges[room.size] ?? [1, 3];
  const count = rng.between(minCount, maxCount);

  encounters.push({
    id: `encounter-${newId()}`,
    creatureType,
    count,
    behavior: rng.pickWeighted(BEHAVIOR_WEIGHTS),
    defeated: false,
  });

  // Small chance of second encounter in large rooms
  if ((room.size === "large" || room.size === "vast") && rng.chance(0.2)) {
    const secondCreature = rng.pick(creatures);
    if (secondCreature !== creatureType) {
      encounters.push({
        id: `encounter-${newId()}`,
        creatureType: secondCreature,
        count: rng.between(1, 2),
        behavior: rng.pickWeighted(BEHAVIOR_WEIGHTS),
        defeated: false,
      });
    }
  }

  return encounters;
}

/**
 * Generate treasure for a dungeon room.
 */
export function generateRoomTreasure(options: RoomContentOptions): TreasureEntry[] {
  const { seed, room, dungeonDepth = 1 } = options;
  const rng = new SeededRandom(`${seed}-treasure-${room.id}`);

  const treasure: TreasureEntry[] = [];

  // Check for empty room pacing (same seed ensures consistent emptiness)
  if (shouldBeEmptyRoom(seed, room)) {
    return treasure;
  }

  const treasureChance = ROOM_TREASURE_CHANCE[room.type];

  if (!rng.chance(treasureChance)) {
    return treasure;
  }

  // Number of treasure items based on room type
  const itemCount = room.type === "treasury"
    ? rng.between(3, 6)
    : rng.between(1, 3);

  for (let i = 0; i < itemCount; i++) {
    const type = rng.pickWeighted(TREASURE_TYPE_WEIGHTS);
    treasure.push(generateTreasureEntry(rng, type, dungeonDepth));
  }

  return treasure;
}

function generateTreasureEntry(
  rng: SeededRandom,
  type: TreasureType,
  dungeonDepth: number
): TreasureEntry {
  const id = `treasure-${newId()}`;

  switch (type) {
    case "coins": {
      const valueIndex = Math.min(dungeonDepth - 1, COIN_VALUES.length - 1);
      const value = COIN_VALUES[Math.max(0, valueIndex)];
      return {
        id,
        type: "coins",
        name: "Coins",
        value,
        looted: false,
      };
    }
    case "gems": {
      const gem = rng.pick(GEM_DESCRIPTIONS);
      const baseValue = 10 * dungeonDepth;
      const value = `${rng.between(baseValue, baseValue * 5)} gp`;
      return {
        id,
        type: "gems",
        name: gem,
        value,
        looted: false,
      };
    }
    case "art": {
      const art = rng.pick(ART_OBJECTS);
      const baseValue = 25 * dungeonDepth;
      const value = `${rng.between(baseValue, baseValue * 4)} gp`;
      return {
        id,
        type: "art",
        name: art,
        value,
        description: art,
        looted: false,
      };
    }
    case "item": {
      const item = rng.pick(MUNDANE_ITEMS);
      return {
        id,
        type: "item",
        name: item,
        description: item,
        looted: false,
      };
    }
    case "magic_item": {
      // Magic items reference the MagicItemGenerator
      return {
        id,
        type: "magic_item",
        name: "Mysterious Magic Item",
        description: "An item that radiates magical energy",
        looted: false,
      };
    }
  }
}

/**
 * Populate a room with encounters and treasure.
 */
export function populateRoom(options: RoomContentOptions): DungeonRoom {
  const room = { ...options.room };
  room.encounters = generateRoomEncounters(options);
  room.treasure = generateRoomTreasure(options);
  return room;
}

/**
 * Populate all rooms in a dungeon.
 */
export function populateDungeonRooms(
  seed: string,
  rooms: DungeonRoom[],
  dungeonDepth: number
): DungeonRoom[] {
  return rooms.map((room) =>
    populateRoom({ seed, room, dungeonDepth })
  );
}

export interface SpatialRoomContentOptions {
  seed: string;
  room: SpatialRoom;
  dungeonDepth?: number;
}

/**
 * Check if a room should be completely empty for pacing.
 */
function shouldBeEmptyRoom(seed: string, room: SpatialRoom | DungeonRoom): boolean {
  // Never empty types always have content
  if (NEVER_EMPTY_TYPES.includes(room.type)) {
    return false;
  }

  // Check themed room types (SpatialRoom only)
  const themeType = (room as SpatialRoom).themeRoomType;
  if (themeType && NEVER_EMPTY_THEMES.includes(themeType)) {
    return false;
  }

  // Dead-end rooms should have rewards to make exploration worthwhile
  if ((room as SpatialRoom).isDeadEnd) {
    return false;
  }

  const rng = new SeededRandom(`${seed}-empty-${room.id}`);
  return rng.chance(EMPTY_ROOM_CHANCE);
}

/**
 * Check if a room is a treasure-focused themed room.
 */
function isTreasureThemedRoom(room: SpatialRoom | DungeonRoom): boolean {
  const themeType = (room as SpatialRoom).themeRoomType;
  return themeType ? TREASURE_ROOM_THEMES.includes(themeType) : false;
}

/**
 * Generate encounters for a spatial dungeon room.
 */
export function generateSpatialRoomEncounters(options: SpatialRoomContentOptions): Encounter[] {
  const { seed, room, dungeonDepth = 1 } = options;
  const rng = new SeededRandom(`${seed}-encounter-${room.id}`);

  const encounters: Encounter[] = [];

  // Check for empty room pacing
  if (shouldBeEmptyRoom(seed, room)) {
    return encounters;
  }

  const encounterChance = ROOM_ENCOUNTER_CHANCE[room.type];

  if (!rng.chance(encounterChance)) {
    return encounters;
  }

  // Determine creature tier based on room depth and dungeon depth
  const effectiveDepth = Math.min(room.depth + dungeonDepth - 1, 4);
  const creatures = ENCOUNTER_CREATURES_BY_DEPTH[effectiveDepth] ?? ENCOUNTER_CREATURES_BY_DEPTH[0];
  const creatureType = rng.pick(creatures);

  // Count based on room size
  const countRanges: Record<string, [number, number]> = {
    cramped: [1, 2],
    small: [1, 3],
    medium: [2, 4],
    large: [3, 6],
    vast: [4, 8],
  };
  const [minCount, maxCount] = countRanges[room.size] ?? [1, 3];
  const count = rng.between(minCount, maxCount);

  encounters.push({
    id: `encounter-${newId()}`,
    creatureType,
    count,
    behavior: rng.pickWeighted(BEHAVIOR_WEIGHTS),
    defeated: false,
  });

  // Small chance of second encounter in large rooms
  if ((room.size === "large" || room.size === "vast") && rng.chance(0.2)) {
    const secondCreature = rng.pick(creatures);
    if (secondCreature !== creatureType) {
      encounters.push({
        id: `encounter-${newId()}`,
        creatureType: secondCreature,
        count: rng.between(1, 2),
        behavior: rng.pickWeighted(BEHAVIOR_WEIGHTS),
        defeated: false,
      });
    }
  }

  return encounters;
}

/**
 * Generate treasure for a spatial dungeon room.
 */
export function generateSpatialRoomTreasure(options: SpatialRoomContentOptions): TreasureEntry[] {
  const { seed, room, dungeonDepth = 1 } = options;
  const rng = new SeededRandom(`${seed}-treasure-${room.id}`);

  const treasure: TreasureEntry[] = [];

  // Check for empty room pacing (same seed ensures consistent emptiness)
  if (shouldBeEmptyRoom(seed, room)) {
    return treasure;
  }

  // Treasure-themed rooms always have treasure
  const isTreasureRoom = isTreasureThemedRoom(room);
  const isDeadEnd = (room as SpatialRoom).isDeadEnd ?? false;

  // Determine treasure chance
  let treasureChance = ROOM_TREASURE_CHANCE[room.type];

  // Boost for dead-ends (reward exploration)
  if (isDeadEnd) {
    treasureChance = Math.min(treasureChance * 2, 0.9);
  }

  // Treasure rooms always have treasure
  if (isTreasureRoom) {
    treasureChance = 1.0;
  }

  if (!rng.chance(treasureChance)) {
    return treasure;
  }

  // Number of treasure items based on room type and theme
  let itemCount: number;
  if (room.type === "treasury" || isTreasureRoom) {
    itemCount = rng.between(3, 6);
  } else if (isDeadEnd) {
    itemCount = rng.between(2, 4); // Dead-ends get more loot
  } else {
    itemCount = rng.between(1, 3);
  }

  for (let i = 0; i < itemCount; i++) {
    const type = rng.pickWeighted(TREASURE_TYPE_WEIGHTS);
    treasure.push(generateTreasureEntry(rng, type, dungeonDepth));
  }

  return treasure;
}

/**
 * Populate a spatial room with encounters and treasure.
 */
export function populateSpatialRoom(options: SpatialRoomContentOptions): SpatialRoom {
  const room = { ...options.room };
  room.encounters = generateSpatialRoomEncounters(options);
  room.treasure = generateSpatialRoomTreasure(options);
  return room;
}

/**
 * Populate all spatial rooms in a dungeon.
 */
export function populateSpatialDungeonRooms(
  seed: string,
  rooms: SpatialRoom[],
  dungeonDepth: number
): SpatialRoom[] {
  return rooms.map((room) =>
    populateSpatialRoom({ seed, room, dungeonDepth })
  );
}
