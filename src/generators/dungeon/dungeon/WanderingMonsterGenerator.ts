/**
 * WanderingMonsterGenerator - Creates random encounter tables for dungeons.
 * Wandering monsters add tension and resource pressure during exploration.
 */

import type {
  DungeonTheme,
  WanderingMonsterTable,
  WanderingMonsterEntry,
  DungeonBlueprint,
} from "../types";
import { SeededRandom } from "../SeededRandom";
import { getBlueprint } from "./DungeonBlueprints";

// Activities for wandering monsters
const WANDERING_ACTIVITIES = [
  "patrolling the area",
  "searching for food",
  "investigating a noise",
  "returning to their lair",
  "dragging a recent kill",
  "arguing with each other",
  "performing a ritual",
  "sleeping in the passage",
  "guarding a key location",
  "fleeing from something else",
];

// Theme-specific activities
const THEME_ACTIVITIES: Partial<Record<DungeonTheme, string[]>> = {
  tomb: [
    "shambling aimlessly",
    "guarding the dead",
    "moaning in eternal torment",
    "sensing the living",
  ],
  temple: [
    "conducting a ceremony",
    "praying to dark gods",
    "purifying the halls",
    "seeking heretics",
  ],
  sewer: [
    "swimming through filth",
    "feeding on refuse",
    "marking territory",
    "avoiding the light",
  ],
  cultist_lair: [
    "chanting ritual words",
    "preparing a sacrifice",
    "drawing blood sigils",
    "summoning dark forces",
  ],
  bandit_hideout: [
    "counting stolen loot",
    "drinking and gambling",
    "keeping watch",
    "planning the next raid",
  ],
  fortress: [
    "on patrol",
    "changing guard shifts",
    "drilling combat formations",
    "reporting to superiors",
  ],
};

// Count ranges by depth
const COUNT_BY_DEPTH: Record<number, string[]> = {
  0: ["1", "1d2", "1d3"],
  1: ["1d2", "1d3", "1d4"],
  2: ["1d3", "1d4", "1d6"],
  3: ["1d4", "1d6", "2d4"],
  4: ["1d6", "2d4", "2d6"],
};

export class WanderingMonsterGenerator {
  private rng: SeededRandom;
  private blueprint: DungeonBlueprint;
  private theme: DungeonTheme;

  constructor(theme: DungeonTheme, seed: string) {
    this.theme = theme;
    this.blueprint = getBlueprint(theme);
    this.rng = new SeededRandom(`${seed}-wandering`);
  }

  /**
   * Generate a wandering monster table for the dungeon.
   */
  generate(dungeonDepth: number = 1): WanderingMonsterTable {
    const creaturePool = this.blueprint.creaturePool;
    const entries: WanderingMonsterEntry[] = [];

    // Generate 4-8 table entries
    const entryCount = this.rng.between(4, 8);
    const effectiveDepth = Math.min(dungeonDepth, 4);

    for (let i = 0; i < entryCount; i++) {
      const creature = this.rng.pick(creaturePool);
      const countOptions = COUNT_BY_DEPTH[effectiveDepth] ?? COUNT_BY_DEPTH[0];
      const count = this.rng.pick(countOptions);

      // Get activity
      const activity = this.getActivity();

      // Weight - earlier entries more common
      const weight = entryCount - i;

      entries.push({
        creatureType: creature,
        count,
        weight,
        activity,
      });
    }

    return {
      checkFrequency: this.getCheckFrequency(),
      entries,
    };
  }

  /**
   * Get a random activity for a wandering monster.
   */
  private getActivity(): string {
    // 50% chance of theme-specific activity
    const themeActivities = THEME_ACTIVITIES[this.theme];
    if (themeActivities && this.rng.chance(0.5)) {
      return this.rng.pick(themeActivities);
    }
    return this.rng.pick(WANDERING_ACTIVITIES);
  }

  /**
   * Determine encounter check frequency based on theme.
   */
  private getCheckFrequency(): string {
    // More active dungeons have more frequent checks
    const activeThemes: DungeonTheme[] = [
      "fortress",
      "bandit_hideout",
      "cultist_lair",
    ];

    if (activeThemes.includes(this.theme)) {
      return "every 2 turns or on loud noise";
    }

    const quietThemes: DungeonTheme[] = [
      "tomb",
      "crypt",
      "shrine",
    ];

    if (quietThemes.includes(this.theme)) {
      return "every 4 turns or on desecration";
    }

    return "every 3 turns or on loud noise";
  }

  /**
   * Roll on the wandering monster table.
   * Returns null if no encounter (based on frequency).
   */
  static rollEncounter(
    table: WanderingMonsterTable,
    rng: SeededRandom
  ): WanderingMonsterEntry | null {
    // Calculate total weight
    const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0);

    // Pick weighted entry
    let roll = rng.next() * totalWeight;
    for (const entry of table.entries) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry;
      }
    }

    return table.entries[0]; // Fallback
  }
}

/**
 * Generate a wandering monster table for a dungeon.
 */
export function generateWanderingMonsters(
  theme: DungeonTheme,
  dungeonDepth: number,
  seed: string
): WanderingMonsterTable {
  const generator = new WanderingMonsterGenerator(theme, seed);
  return generator.generate(dungeonDepth);
}
