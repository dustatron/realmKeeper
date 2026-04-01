/**
 * DungeonNPCGenerator - Places NPCs in dungeons.
 * Includes rival adventuring parties, prisoners, hermits, ghosts, and refugees.
 */

import { newId } from "@shared/ulid";
import type {
  DungeonTheme,
  SpatialRoom,
  DungeonNPC,
  DungeonNPCCategory,
  DungeonNPCWant,
} from "../types";

// Stripped types not in our types.ts
type FactionType = 'cult' | 'militia' | 'syndicate' | 'guild' | 'tribe'
interface Faction {
  id: string
  name: string
  relationships: Array<{ factionId: string; type: string }>
}
import { SeededRandom } from "../SeededRandom";

// NPC spawn chances
const RIVAL_PARTY_CHANCE = 0.20; // 20% chance of rival adventurers
const HERMIT_CHANCE = 0.10; // 10% chance of hermit/refugee
const GHOST_CHANCE = 0.15; // 15% chance of ghost in appropriate themes

// Themes where ghosts are appropriate
const GHOST_THEMES: DungeonTheme[] = [
  "tomb",
  "crypt",
  "temple",
  "fortress",
  "shrine",
  "cultist_lair",
];

// Themes where hermits might live
const HERMIT_THEMES: DungeonTheme[] = [
  "cave",
  "mine",
  "sewer",
  "witch_hut",
  "sea_cave",
];

// Adventurer name pools
const ADVENTURER_FIRST_NAMES = [
  "Aldric", "Bran", "Celia", "Dorn", "Elena", "Finn",
  "Greta", "Harald", "Iris", "Jax", "Kira", "Leon",
  "Mira", "Nox", "Orin", "Petra", "Quinn", "Raven",
  "Sable", "Theron", "Una", "Vex", "Wren", "Xara", "Yuri", "Zara",
];

const ADVENTURER_EPITHETS = [
  "the Bold", "the Quick", "Shadowbane", "Ironhand",
  "the Wanderer", "Brightblade", "the Cunning", "Stormborn",
  "the Silent", "Fireheart", "the Lucky", "Doomseeker",
];

const ADVENTURER_CLASSES = [
  "Fighter", "Rogue", "Wizard", "Cleric", "Ranger", "Barbarian",
];

// Prisoner descriptions
const PRISONER_REASONS = [
  "captured while exploring",
  "held for ransom",
  "taken as a sacrifice",
  "imprisoned for trespassing",
  "kept as a hostage",
];

// Hermit types
const HERMIT_TYPES = [
  { type: "mad_scholar", info: "ancient lore about the dungeon" },
  { type: "escaped_prisoner", info: "the layout and dangers within" },
  { type: "monster_whisperer", info: "the creatures' weaknesses" },
  { type: "treasure_hunter", info: "the location of hidden valuables" },
  { type: "cult_defector", info: "the inhabitants' plans" },
];

// Ghost motivations
const GHOST_MOTIVATIONS = [
  "seeks revenge on their killer",
  "guards their former treasure",
  "warns explorers of danger",
  "relives their final moments",
  "searches for a lost love",
];

// === NPC Wants by Category ===
// These define what NPCs want for negotiation purposes

const WANTS_BY_CATEGORY: Record<DungeonNPCCategory, DungeonNPCWant[]> = {
  rival_party: ["wealth", "information", "safety"],
  prisoner: ["freedom", "safety", "revenge"],
  hermit: ["safety", "food", "companionship"],
  ghost: ["revenge", "freedom", "information"],
  refugee: ["safety", "food", "freedom"],
  faction_leader: ["power", "wealth", "information"],
  faction_lieutenant: ["power", "wealth", "safety"],
  faction_member: ["wealth", "safety", "food"],
  rival_scout: ["safety", "information", "freedom"],
};

// How many wants each category typically has
const WANT_COUNT_BY_CATEGORY: Record<DungeonNPCCategory, [number, number]> = {
  rival_party: [1, 2],
  prisoner: [2, 3],
  hermit: [1, 2],
  ghost: [1, 1],
  refugee: [2, 3],
  faction_leader: [1, 2],
  faction_lieutenant: [1, 2],
  faction_member: [1, 2],
  rival_scout: [2, 2],
};

/**
 * Generate wants for a dungeon NPC based on their category.
 */
function generateWants(
  rng: SeededRandom,
  category: DungeonNPCCategory
): DungeonNPCWant[] {
  const possibleWants = WANTS_BY_CATEGORY[category] ?? ["safety"];
  const [min, max] = WANT_COUNT_BY_CATEGORY[category] ?? [1, 2];
  const count = rng.between(min, max);

  return rng.sample(possibleWants, Math.min(count, possibleWants.length));
}

export class DungeonNPCGenerator {
  private rng: SeededRandom;
  private theme: DungeonTheme;

  constructor(theme: DungeonTheme, seed: string) {
    this.theme = theme;
    this.rng = new SeededRandom(`${seed}-dungeon-npcs`);
  }

  /**
   * Generate NPCs for a dungeon.
   */
  generateNPCs(
    rooms: SpatialRoom[],
    hooks: never[] = []
  ): DungeonNPC[] {
    const npcs: DungeonNPC[] = [];

    // Maybe add rival party
    if (this.rng.chance(RIVAL_PARTY_CHANCE)) {
      const rivals = this.generateRivalParty(rooms);
      if (rivals) {
        npcs.push(rivals);
      }
    }

    // Maybe add hermit/refugee
    if (HERMIT_THEMES.includes(this.theme) && this.rng.chance(HERMIT_CHANCE)) {
      const hermit = this.generateHermit(rooms);
      if (hermit) {
        npcs.push(hermit);
      }
    }

    // Maybe add ghost
    if (GHOST_THEMES.includes(this.theme) && this.rng.chance(GHOST_CHANCE)) {
      const ghost = this.generateGhost(rooms);
      if (ghost) {
        npcs.push(ghost);
      }
    }

    return npcs;
  }

  /**
   * Place a prisoner from a rescue hook.
   */
  private placePrisoner(
    rooms: SpatialRoom[],
    hook: { missingNpcId?: string }
  ): DungeonNPC | null {
    // Find suitable room (prison, lair, or deep dead-end)
    const prisonRooms = rooms.filter(
      (r) =>
        r.type === "prison" ||
        r.themeRoomType === "prison_block" ||
        r.themeRoomType === "prisoner_hold" ||
        (r.isDeadEnd && r.depth >= 2)
    );

    if (prisonRooms.length === 0) {
      // Fallback to deepest room
      const deepest = rooms.reduce((best, r) =>
        r.depth > best.depth ? r : best
      );
      prisonRooms.push(deepest);
    }

    const room = this.rng.pick(prisonRooms);
    const reason = this.rng.pick(PRISONER_REASONS);

    return {
      npcId: hook.missingNpcId ?? `prisoner-${newId()}`,
      category: "prisoner",
      roomId: room.id,
      disposition: "friendly",
      wantsRescue: true,
      hasInfo: `Knows about the dungeon from being ${reason}.`,
      wants: generateWants(this.rng, "prisoner"),
    };
  }

  /**
   * Generate a rival adventuring party.
   */
  private generateRivalParty(rooms: SpatialRoom[]): DungeonNPC | null {
    // Place near entrance or mid-dungeon
    const candidateRooms = rooms.filter((r) => r.depth <= 2);
    if (candidateRooms.length === 0) return null;

    const room = this.rng.pick(candidateRooms);
    const partySize = this.rng.between(2, 4);

    // Generate leader name
    const firstName = this.rng.pick(ADVENTURER_FIRST_NAMES);
    const epithet = this.rng.pick(ADVENTURER_EPITHETS);
    const leaderClass = this.rng.pick(ADVENTURER_CLASSES);

    // Determine disposition
    const dispositionRoll = this.rng.next();
    let disposition: "hostile" | "neutral" | "friendly";
    if (dispositionRoll < 0.3) {
      disposition = "hostile"; // 30% hostile
    } else if (dispositionRoll < 0.7) {
      disposition = "neutral"; // 40% neutral
    } else {
      disposition = "friendly"; // 30% friendly
    }

    return {
      npcId: `rival-party-${newId()}`,
      category: "rival_party",
      roomId: room.id,
      disposition,
      partySize,
      hasInfo: `${firstName} ${epithet}, a ${leaderClass}, leads a party of ${partySize}. They seek treasure and glory.`,
      wants: generateWants(this.rng, "rival_party"),
    };
  }

  /**
   * Generate a hermit or refugee NPC.
   */
  private generateHermit(rooms: SpatialRoom[]): DungeonNPC | null {
    // Place in dead-end or hidden area
    const candidateRooms = rooms.filter(
      (r) => r.isDeadEnd || r.themeRoomType === "collapsed_section"
    );
    if (candidateRooms.length === 0) {
      // Fallback to any room not near entrance
      const deepRooms = rooms.filter((r) => r.depth >= 2);
      if (deepRooms.length === 0) return null;
      candidateRooms.push(...deepRooms);
    }

    const room = this.rng.pick(candidateRooms);
    const hermitType = this.rng.pick(HERMIT_TYPES);

    // Hermits are usually friendly or neutral
    const disposition = this.rng.chance(0.7) ? "friendly" : "neutral";

    return {
      npcId: `hermit-${newId()}`,
      category: "hermit",
      roomId: room.id,
      disposition,
      hasInfo: `A ${hermitType.type.replace("_", " ")} who knows ${hermitType.info}.`,
      wants: generateWants(this.rng, "hermit"),
    };
  }

  /**
   * Generate a ghost NPC.
   */
  private generateGhost(rooms: SpatialRoom[]): DungeonNPC | null {
    // Place in thematic rooms
    const candidateRooms = rooms.filter(
      (r) =>
        r.themeRoomType === "sarcophagus_chamber" ||
        r.themeRoomType === "burial_niches" ||
        r.themeRoomType === "throne_room" ||
        r.themeRoomType === "altar_room" ||
        r.isDeadEnd
    );

    if (candidateRooms.length === 0) {
      candidateRooms.push(...rooms.filter((r) => r.depth >= 2));
    }

    if (candidateRooms.length === 0) return null;

    const room = this.rng.pick(candidateRooms);
    const motivation = this.rng.pick(GHOST_MOTIVATIONS);

    // Ghosts can be any disposition
    const dispositionRoll = this.rng.next();
    let disposition: "hostile" | "neutral" | "friendly";
    if (dispositionRoll < 0.4) {
      disposition = "hostile";
    } else if (dispositionRoll < 0.7) {
      disposition = "neutral";
    } else {
      disposition = "friendly";
    }

    return {
      npcId: `ghost-${newId()}`,
      category: "ghost",
      roomId: room.id,
      disposition,
      hasInfo: `A restless spirit that ${motivation}.`,
      wants: generateWants(this.rng, "ghost"),
    };
  }
}

/**
 * Generate dungeon NPCs for a dungeon.
 */
export function generateDungeonNPCs(
  theme: DungeonTheme,
  rooms: SpatialRoom[],
  hooks: never[],
  seed: string
): DungeonNPC[] {
  const generator = new DungeonNPCGenerator(theme, seed);
  return generator.generateNPCs(rooms, hooks);
}

// === Faction Dungeon Population ===

// Faction-type specific activities that override standard dungeon ecology
const FACTION_ACTIVITY_OVERRIDES: Record<FactionType, string[]> = {
  cult: ["performing rituals", "chanting prayers", "preparing sacrifices", "meditating"],
  militia: ["drilling", "maintaining weapons", "standing guard", "patrolling"],
  syndicate: ["counting loot", "planning operations", "interrogating", "smuggling"],
  guild: ["crafting", "cataloging resources", "negotiating", "training"],
  tribe: ["feasting", "preparing for hunt", "telling stories", "crafting totems"],
};

// Room types where faction leaders should be placed
const LEADER_ROOM_TYPES = [
  "throne_room",
  "summoning_circle",
  "leaders_chamber",
  "war_room",
  "altar_room",
  "planning_room",
];

// Room types where lieutenants should be placed
const LIEUTENANT_ROOM_TYPES = [
  "armory",
  "barracks",
  "guardroom",
  "initiates_quarters",
  "loot_storage",
  "priest_quarters",
];

/**
 * Populate a faction-controlled dungeon with faction NPCs.
 * Places leader in boss room, lieutenants in key rooms, and members throughout.
 */
export function populateFactionDungeon(
  rooms: SpatialRoom[],
  faction: Faction,
  factionNPCs: NPC[],
  seed: string
): DungeonNPC[] {
  const rng = new SeededRandom(`${seed}-faction-dungeon-pop`);
  const dungeonNPCs: DungeonNPC[] = [];

  // Sort rooms by depth (boss room is typically deepest)
  const sortedRooms = [...rooms]
    .filter((r) => r.type !== "entrance")
    .sort((a, b) => b.depth - a.depth);

  // Find the boss room (deepest dead-end or leader room type)
  const bossRoom = sortedRooms.find(
    (r) => r.themeRoomType && LEADER_ROOM_TYPES.includes(r.themeRoomType)
  ) ?? sortedRooms.find((r) => r.isDeadEnd) ?? sortedRooms[0];

  // Find leader NPC
  const leader = factionNPCs.find((n) => n.factionRole === "leader");
  if (leader && bossRoom) {
    dungeonNPCs.push({
      npcId: leader.id,
      category: "faction_leader",
      roomId: bossRoom.id,
      disposition: "hostile",
      hasInfo: `Leader of ${faction.name}. Knows all faction secrets and plans.`,
      factionId: faction.id,
      isBoss: true,
      wants: generateWants(rng, "faction_leader"),
    });
  }

  // Find lieutenant rooms
  const lieutenantRooms = sortedRooms.filter(
    (r) =>
      r.id !== bossRoom?.id &&
      r.themeRoomType &&
      LIEUTENANT_ROOM_TYPES.includes(r.themeRoomType)
  );

  // Place lieutenants
  const lieutenants = factionNPCs.filter((n) => n.factionRole === "lieutenant");
  for (let i = 0; i < lieutenants.length; i++) {
    const lt = lieutenants[i];
    const room = lieutenantRooms[i] ?? rng.pick(sortedRooms.filter(
      (r) => r.id !== bossRoom?.id && r.depth >= 1
    ));
    if (room) {
      dungeonNPCs.push({
        npcId: lt.id,
        category: "faction_lieutenant",
        roomId: room.id,
        disposition: "hostile",
        hasInfo: `Lieutenant of ${faction.name}. Knows the leader's location and current orders.`,
        factionId: faction.id,
        wants: generateWants(rng, "faction_lieutenant"),
      });
    }
  }

  // Place regular members in remaining rooms
  const members = factionNPCs.filter((n) => n.factionRole === "member");
  const usedRoomIds = new Set(dungeonNPCs.map((n) => n.roomId));
  const availableRooms = sortedRooms.filter((r) => !usedRoomIds.has(r.id));

  for (const member of members) {
    // Each member has a chance to be placed
    if (availableRooms.length === 0) break;

    const roomIndex = rng.between(0, availableRooms.length - 1);
    const room = availableRooms[roomIndex];
    availableRooms.splice(roomIndex, 1);

    dungeonNPCs.push({
      npcId: member.id,
      category: "faction_member",
      roomId: room.id,
      disposition: rng.chance(0.8) ? "hostile" : "wary",
      hasInfo: `Member of ${faction.name}. May know patrol routes and guard positions.`,
      factionId: faction.id,
      wants: generateWants(rng, "faction_member"),
    });
  }

  return dungeonNPCs;
}

/**
 * Add rival faction scouts to a dungeon.
 * Used when the dungeon is controlled by a faction that has enemies.
 */
export function addRivalFactionScouts(
  rooms: SpatialRoom[],
  controllingFaction: Faction,
  rivalFactions: Faction[],
  seed: string
): DungeonNPC[] {
  const rng = new SeededRandom(`${seed}-rival-scouts`);
  const scouts: DungeonNPC[] = [];

  // 25% chance per hostile/rival faction to have scouts
  const hostileRivals = rivalFactions.filter((f) => {
    const rel = controllingFaction.relationships.find((r) => r.factionId === f.id);
    return rel?.type === "hostile" || rel?.type === "rival" || rel?.type === "war";
  });

  for (const rival of hostileRivals) {
    if (!rng.chance(0.25)) continue;

    // Place scouts near the entrance (depth 0-1)
    const entranceRooms = rooms.filter((r) => r.depth <= 1 && r.type !== "entrance");
    if (entranceRooms.length === 0) continue;

    const scoutRoom = rng.pick(entranceRooms);

    scouts.push({
      npcId: `scout-${rival.id}-${newId()}`,
      category: "rival_scout",
      roomId: scoutRoom.id,
      disposition: "wary",
      hasInfo: `Scout from ${rival.name}. Knows their faction's interest in this dungeon.`,
      factionId: rival.id,
      scoutingFor: rival.id,
      wants: generateWants(rng, "rival_scout"),
    });
  }

  return scouts;
}

/**
 * Get faction-specific activity for a room.
 */
export function getFactionActivity(
  factionType: FactionType,
  roomType: string | undefined,
  rng: SeededRandom
): string {
  const activities = FACTION_ACTIVITY_OVERRIDES[factionType];
  return rng.pick(activities);
}
