/**
 * DungeonEcologyGenerator - Creates the living ecosystem of a dungeon.
 * Assigns creature activities, faction influences, and dungeon history.
 */

import type {
  DungeonTheme,
  SpatialRoom,
  DungeonEcology,
  CreatureActivity,
  DungeonBlueprint,
} from "../types";
import { SeededRandom } from "../SeededRandom";
import { getBlueprint } from "./DungeonBlueprints";

// Builder cultures by theme
const BUILDER_CULTURES: Partial<Record<DungeonTheme, string[]>> = {
  tomb: ["ancient empire", "forgotten dynasty", "death cult", "noble house"],
  temple: ["old faith", "heretical sect", "druidic order", "sun worshippers"],
  crypt: ["wealthy family", "holy order", "plague-era city", "vampire lord"],
  fortress: ["fallen kingdom", "orc warlord", "dwarven clan", "imperial legion"],
  cave: ["natural formation", "giant burrowers", "primordial forces"],
  mine: ["dwarven company", "human prospectors", "gnomish engineers", "goblin tribe"],
  sewer: ["ancient city", "forgotten civilization", "thieves' guild", "plague doctors"],
  bandit_hideout: ["smugglers", "deserters", "outlaws", "rebel faction"],
  cultist_lair: ["demon cult", "aberrant worshippers", "necromancer circle", "chaos cult"],
  witch_hut: ["hedge witch", "coven", "fey creature", "hermit mage"],
  sea_cave: ["pirates", "merfolk", "sea hag", "smugglers"],
  beast_den: ["territorial beast", "pack alpha", "monstrous creature", "dragon"],
  lair: ["goblin tribe", "hobgoblin warlord", "bugbear gang", "troll"],
  shrine: ["village faithful", "wandering priest", "nature spirit", "forgotten god"],
  floating_keep: ["sky mages", "cloud giants", "elemental cultists", "ancient artificers"],
};

// Current inhabitant types by theme
const CURRENT_INHABITANTS: Partial<Record<DungeonTheme, string[]>> = {
  tomb: ["undead guardians", "tomb robbers", "cursed spirits", "mummy lord and servants"],
  temple: ["corrupted clergy", "demon-possessed", "zealot cultists", "angelic guardians"],
  crypt: ["ghouls and ghasts", "vampire spawn", "necromancer and minions", "restless dead"],
  fortress: ["orc warband", "goblin tribe", "bandit company", "undead garrison"],
  cave: ["monster nest", "beast pack", "giant spiders", "troll lair"],
  mine: ["kobold miners", "derro mad ones", "duergar slavers", "abandoned and haunted"],
  sewer: ["wererats", "otyugh nest", "thieves' den", "cultist hideout"],
  bandit_hideout: ["bandit gang", "smuggler ring", "escaped prisoners", "revolutionary cell"],
  cultist_lair: ["demon cult", "devil worshippers", "aberrant servants", "undead congregation"],
  witch_hut: ["hag and minions", "fey creatures", "corrupted animals", "apprentice gone mad"],
  sea_cave: ["sahuagin raiders", "pirate crew", "sea spawn", "kraken cultists"],
  beast_den: ["territorial predator", "beast pack", "dragon and kobolds", "elemental creature"],
  lair: ["goblin horde", "hobgoblin legion", "bugbear gang", "troll and minions"],
  shrine: ["corrupted guardians", "desecrators", "nature spirits", "pilgrims and protectors"],
  floating_keep: ["cloud giant court", "elemental servants", "sky pirates", "arcane constructs"],
};

// Activity distributions by theme - what creatures do in this dungeon
const ACTIVITY_DISTRIBUTIONS: Partial<Record<DungeonTheme, Record<CreatureActivity, number>>> = {
  tomb: {
    sleeping: 30, patrolling: 15, guarding: 25, eating: 5,
    working: 5, worshipping: 10, hiding: 5, fighting: 5, socializing: 0,
  },
  temple: {
    sleeping: 10, patrolling: 15, guarding: 20, eating: 5,
    working: 10, worshipping: 30, hiding: 5, fighting: 5, socializing: 0,
  },
  fortress: {
    sleeping: 15, patrolling: 30, guarding: 25, eating: 10,
    working: 10, worshipping: 0, hiding: 5, fighting: 5, socializing: 0,
  },
  cave: {
    sleeping: 35, patrolling: 10, guarding: 15, eating: 20,
    working: 0, worshipping: 0, hiding: 15, fighting: 5, socializing: 0,
  },
  bandit_hideout: {
    sleeping: 20, patrolling: 15, guarding: 15, eating: 15,
    working: 10, worshipping: 0, hiding: 10, fighting: 5, socializing: 10,
  },
  cultist_lair: {
    sleeping: 10, patrolling: 10, guarding: 15, eating: 5,
    working: 15, worshipping: 40, hiding: 0, fighting: 5, socializing: 0,
  },
  sewer: {
    sleeping: 25, patrolling: 15, guarding: 10, eating: 25,
    working: 5, worshipping: 5, hiding: 10, fighting: 5, socializing: 0,
  },
};

// Default activity distribution
const DEFAULT_ACTIVITIES: Record<CreatureActivity, number> = {
  sleeping: 20, patrolling: 20, guarding: 20, eating: 10,
  working: 10, worshipping: 5, hiding: 10, fighting: 5, socializing: 0,
};

// Room types that suggest specific activities
const ROOM_ACTIVITY_HINTS: Record<string, CreatureActivity[]> = {
  // Living quarters
  sleeping_quarters: ["sleeping"],
  barracks: ["sleeping", "eating"],
  initiates_quarters: ["sleeping", "worshipping"],
  clergy_quarters: ["sleeping", "worshipping"],
  priest_quarters: ["sleeping", "worshipping"],

  // Guard/combat
  guardroom: ["guarding", "patrolling"],
  watchtower: ["guarding", "patrolling"],
  armory: ["guarding", "working"],
  war_room: ["working", "guarding"],

  // Worship
  altar_room: ["worshipping", "guarding"],
  sacrifice_altar: ["worshipping", "working"],
  summoning_circle: ["worshipping", "working"],
  ritual_pool: ["worshipping"],
  nave: ["worshipping", "guarding"],

  // Food/common
  mess_hall: ["eating"],
  common_area: ["eating", "sleeping"],
  mushroom_garden: ["eating", "working"],

  // Work
  embalming_room: ["working"],
  planning_room: ["working"],
  treasure_vault: ["guarding"],
  loot_storage: ["guarding"],
};

export class DungeonEcologyGenerator {
  private rng: SeededRandom;
  private blueprint: DungeonBlueprint;
  private theme: DungeonTheme;

  constructor(theme: DungeonTheme, seed: string) {
    this.theme = theme;
    this.blueprint = getBlueprint(theme);
    this.rng = new SeededRandom(`${seed}-ecology`);
  }

  /**
   * Generate the full ecology for a dungeon.
   */
  generateEcology(rooms: SpatialRoom[]): DungeonEcology {
    const builderCulture = this.selectBuilderCulture();
    const currentInhabitants = this.selectCurrentInhabitants();

    // Assign activities to rooms
    this.assignRoomActivities(rooms);

    // Build faction influence map
    const factionInfluence = this.buildFactionInfluence(rooms);

    // Generate dungeon history snippet
    const history = this.generateHistory(builderCulture, currentInhabitants);

    return {
      builderCulture,
      currentInhabitants,
      factionInfluence,
      history,
    };
  }

  /**
   * Select who built this dungeon.
   */
  private selectBuilderCulture(): string {
    const cultures = BUILDER_CULTURES[this.theme] ?? ["unknown builders"];
    return this.rng.pick(cultures);
  }

  /**
   * Select who currently inhabits the dungeon.
   */
  private selectCurrentInhabitants(): string {
    const inhabitants = CURRENT_INHABITANTS[this.theme] ?? ["various monsters"];
    return this.rng.pick(inhabitants);
  }

  /**
   * Assign creature activities to rooms based on room type and theme.
   */
  private assignRoomActivities(rooms: SpatialRoom[]): void {
    const activityDist = ACTIVITY_DISTRIBUTIONS[this.theme] ?? DEFAULT_ACTIVITIES;

    for (const room of rooms) {
      // Skip entrance - no permanent creatures there
      if (room.type === "entrance") continue;

      // Check for room-type hints
      const themeType = room.themeRoomType;
      if (themeType && ROOM_ACTIVITY_HINTS[themeType]) {
        room.activity = this.rng.pick(ROOM_ACTIVITY_HINTS[themeType]);
        continue;
      }

      // Use weighted random based on theme distribution
      room.activity = this.selectWeightedActivity(activityDist);
    }
  }

  /**
   * Select activity using weighted distribution.
   */
  private selectWeightedActivity(
    dist: Record<CreatureActivity, number>
  ): CreatureActivity {
    const total = Object.values(dist).reduce((sum, w) => sum + w, 0);
    let roll = this.rng.next() * total;

    for (const [activity, weight] of Object.entries(dist)) {
      roll -= weight;
      if (roll <= 0) {
        return activity as CreatureActivity;
      }
    }

    return "guarding"; // Fallback
  }

  /**
   * Build faction influence zones within the dungeon.
   */
  private buildFactionInfluence(
    rooms: SpatialRoom[]
  ): Record<string, string[]> {
    const influence: Record<string, string[]> = {};

    // Primary faction controls most rooms
    const primaryFaction = this.selectCurrentInhabitants();
    const primaryRooms = rooms
      .filter((r) => r.type !== "entrance")
      .map((r) => r.id);

    if (primaryRooms.length > 0) {
      influence[primaryFaction] = primaryRooms;
    }

    // Sometimes there's a secondary faction in contested dungeons
    if (this.rng.chance(0.3)) {
      const secondaryOptions = CURRENT_INHABITANTS[this.theme] ?? [];
      const secondary = secondaryOptions.find((i) => i !== primaryFaction);

      if (secondary && primaryRooms.length > 3) {
        // Secondary controls some peripheral rooms
        const count = Math.min(3, Math.floor(primaryRooms.length * 0.25));
        const secondaryRooms: string[] = [];

        for (let i = 0; i < count; i++) {
          const roomId = primaryRooms.pop();
          if (roomId) secondaryRooms.push(roomId);
        }

        if (secondaryRooms.length > 0) {
          influence[secondary] = secondaryRooms;
          influence[primaryFaction] = primaryRooms;
        }
      }
    }

    return influence;
  }

  /**
   * Generate a brief history of the dungeon.
   */
  private generateHistory(builder: string, inhabitants: string): string {
    const ages = ["centuries", "decades", "generations", "ages"];
    const age = this.rng.pick(ages);

    const events = [
      `Built by the ${builder} ${age} ago, now claimed by ${inhabitants}.`,
      `Once a proud creation of the ${builder}, fallen to ${inhabitants}.`,
      `The ${builder} abandoned this place long ago. ${inhabitants.charAt(0).toUpperCase() + inhabitants.slice(1)} moved in.`,
      `After the fall of the ${builder}, ${inhabitants} made this their home.`,
      `The ${builder} constructed this ${age} past. ${inhabitants.charAt(0).toUpperCase() + inhabitants.slice(1)} now prowl its halls.`,
    ];

    return this.rng.pick(events);
  }

  /**
   * Get activity description for display.
   */
  static getActivityDescription(activity: CreatureActivity): string {
    const descriptions: Record<CreatureActivity, string> = {
      sleeping: "Creatures here are resting or asleep",
      patrolling: "Guards regularly pass through",
      guarding: "This area is actively defended",
      eating: "Creatures gather here to feed",
      working: "Inhabitants are engaged in tasks",
      worshipping: "Rituals or prayers take place here",
      hiding: "Something lurks in concealment",
      fighting: "Conflict is ongoing here",
      socializing: "Creatures are gathered and interacting",
    };
    return descriptions[activity];
  }
}

/**
 * Generate dungeon ecology for a dungeon.
 */
export function generateDungeonEcology(
  theme: DungeonTheme,
  rooms: SpatialRoom[],
  seed: string
): DungeonEcology {
  const generator = new DungeonEcologyGenerator(theme, seed);
  return generator.generateEcology(rooms);
}
