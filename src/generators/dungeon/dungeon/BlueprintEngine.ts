/**
 * BlueprintEngine - Assigns theme-specific room types based on geometry and blueprint rules.
 * Transforms generic rooms into themed, ecologically consistent dungeon spaces.
 */

import type {
  DungeonTheme,
  SpatialRoom,
  Passage,
  ThemeRoomType,
  RoomGeometry,
  DungeonBlueprint,
  AdjacencyRule,
} from "../types";
import { SeededRandom } from "../SeededRandom";
import { getBlueprint } from "./DungeonBlueprints";

/**
 * Mapping from geometry to compatible base types.
 */
const GEOMETRY_TO_TYPES: Record<RoomGeometry, ThemeRoomType[]> = {
  corridor: ["corridor", "cart_tracks", "drain_grate", "burial_niches"],
  alcove: ["dead_end", "burial_niches", "familiar_den"],
  gallery: ["stalactite_hall", "nave", "memorial_hall", "chamber"],
  chamber: ["chamber"], // Most types work for chambers
};

/**
 * Theme-specific room type pools organized by geometry compatibility.
 */
const THEME_TYPE_POOLS: Partial<Record<DungeonTheme, Record<RoomGeometry, ThemeRoomType[]>>> = {
  tomb: {
    corridor: ["burial_niches", "corridor"],
    alcove: ["burial_niches", "dead_end"],
    gallery: ["offering_hall", "memorial_hall"],
    chamber: [
      "sarcophagus_chamber",
      "embalming_room",
      "priest_quarters",
      "false_tomb",
      "guardian_chamber",
      "treasure_vault",
    ],
  },
  cave: {
    corridor: ["corridor", "natural_chimney"],
    alcove: ["bat_roost", "dead_end"],
    gallery: ["stalactite_hall", "crystal_grotto"],
    chamber: ["mushroom_garden", "underground_pool", "creature_nest", "collapsed_section"],
  },
  temple: {
    corridor: ["corridor", "meditation_cells"],
    alcove: ["meditation_cells", "dead_end"],
    gallery: ["nave"],
    chamber: ["altar_room", "vestry", "clergy_quarters", "temple_library", "reliquary", "baptistery"],
  },
  fortress: {
    corridor: ["corridor"],
    alcove: ["dead_end"],
    gallery: ["barracks", "mess_hall"],
    chamber: ["armory", "war_room", "prison_block", "watchtower", "throne_room", "secret_escape"],
  },
  sewer: {
    corridor: ["corridor", "drain_grate"],
    alcove: ["dead_end", "maintenance_access"],
    gallery: ["junction", "overflow_chamber"],
    chamber: ["rat_nest", "smuggler_cache", "toxic_pool"],
  },
  bandit_hideout: {
    corridor: ["corridor", "escape_tunnel"],
    alcove: ["lookout_post", "dead_end"],
    gallery: ["common_area"],
    chamber: ["sleeping_quarters", "loot_storage", "planning_room", "prisoner_hold"],
  },
  cultist_lair: {
    corridor: ["corridor"],
    alcove: ["dead_end"],
    gallery: ["ritual_pool"],
    chamber: ["summoning_circle", "sacrifice_altar", "initiates_quarters", "leaders_chamber", "forbidden_library"],
  },
};

export class BlueprintEngine {
  private blueprint: DungeonBlueprint;
  private rng: SeededRandom;
  private roomGraph: Map<string, Set<string>>; // Room adjacency graph

  constructor(theme: DungeonTheme, seed: string) {
    this.blueprint = getBlueprint(theme);
    this.rng = new SeededRandom(`${seed}-blueprint`);
    this.roomGraph = new Map();
  }

  /**
   * Assign theme-specific room types to all rooms based on geometry and blueprint.
   */
  assignRoomTypes(rooms: SpatialRoom[], passages: Passage[]): void {
    // Build adjacency graph
    this.buildRoomGraph(passages);

    // Separate entrance and other rooms
    const entrance = rooms.find((r) => r.type === "entrance");
    const otherRooms = rooms.filter((r) => r.type !== "entrance");

    // Assign entrance first
    if (entrance) {
      entrance.themeRoomType = "entrance";
    }

    // Find the deepest dead-end room for boss placement
    const deadEnds = otherRooms.filter((r) => r.isDeadEnd);
    const bossRoom = deadEnds.length > 0
      ? deadEnds.reduce((best, r) => (r.depth > best.depth ? r : best), deadEnds[0])
      : otherRooms.reduce((best, r) => (r.depth > best.depth ? r : best), otherRooms[0]);

    if (bossRoom) {
      bossRoom.themeRoomType = this.blueprint.bossRoom;
      this.updateRoomDescription(bossRoom);
    }

    // Assign required rooms (excluding entrance and boss)
    const requiredToPlace = this.blueprint.requiredRooms.filter(
      (rt) => rt !== "entrance" && rt !== this.blueprint.bossRoom
    );

    for (const requiredType of requiredToPlace) {
      const candidate = this.findBestRoomForType(
        otherRooms.filter((r) => !r.themeRoomType),
        requiredType
      );
      if (candidate) {
        candidate.themeRoomType = requiredType;
        this.updateRoomDescription(candidate);
      }
    }

    // Assign remaining rooms from optional pool based on geometry
    const unassigned = otherRooms.filter((r) => !r.themeRoomType);
    for (const room of unassigned) {
      const themeType = this.selectTypeForRoom(room, rooms);
      room.themeRoomType = themeType;
      this.updateRoomDescription(room);
    }

    // Apply adjacency scoring to potentially swap types for better layout
    this.optimizeAdjacency(rooms);
  }

  /**
   * Build adjacency graph from passages.
   */
  private buildRoomGraph(passages: Passage[]): void {
    this.roomGraph.clear();

    for (const passage of passages) {
      if (!this.roomGraph.has(passage.fromRoomId)) {
        this.roomGraph.set(passage.fromRoomId, new Set());
      }
      if (!this.roomGraph.has(passage.toRoomId)) {
        this.roomGraph.set(passage.toRoomId, new Set());
      }
      this.roomGraph.get(passage.fromRoomId)!.add(passage.toRoomId);
      this.roomGraph.get(passage.toRoomId)!.add(passage.fromRoomId);
    }
  }

  /**
   * Find the best room for a specific type based on geometry compatibility.
   */
  private findBestRoomForType(
    candidates: SpatialRoom[],
    targetType: ThemeRoomType
  ): SpatialRoom | null {
    if (candidates.length === 0) return null;

    // Score each candidate
    const scored = candidates.map((room) => ({
      room,
      score: this.scoreRoomForType(room, targetType),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return best match if score > 0
    return scored[0].score > 0 ? scored[0].room : this.rng.pick(candidates);
  }

  /**
   * Score how well a room fits a target type.
   */
  private scoreRoomForType(room: SpatialRoom, targetType: ThemeRoomType): number {
    let score = 0;
    const geometry = room.geometry ?? "chamber";

    // Check if geometry matches typical type expectations
    const geometryTypes = GEOMETRY_TO_TYPES[geometry];
    if (geometryTypes.includes(targetType)) {
      score += 10;
    }

    // Dead-ends are good for treasure/boss rooms
    if (room.isDeadEnd) {
      if (
        targetType === "treasure_vault" ||
        targetType === "loot_storage" ||
        targetType === this.blueprint.bossRoom
      ) {
        score += 15;
      }
    }

    // Deeper rooms better for dangerous/valuable content
    score += room.depth * 2;

    // Larger rooms better for important areas
    const area = room.bounds.width * room.bounds.height;
    if (area >= 20 && ["throne_room", "summoning_circle", "nave"].includes(targetType)) {
      score += 10;
    }

    return score;
  }

  /**
   * Select appropriate theme type for a room based on geometry.
   */
  private selectTypeForRoom(room: SpatialRoom, allRooms: SpatialRoom[]): ThemeRoomType {
    const geometry = room.geometry ?? "chamber";
    const theme = this.blueprint.theme;

    // Get theme-specific pool for this geometry
    const themePools = THEME_TYPE_POOLS[theme];
    let pool: ThemeRoomType[];

    if (themePools && themePools[geometry]) {
      pool = themePools[geometry];
    } else {
      // Fallback to optional rooms or generic types
      pool = this.blueprint.optionalRooms.length > 0
        ? this.blueprint.optionalRooms
        : [geometry === "corridor" ? "corridor" : "chamber"];
    }

    // Filter out already-used unique types (like boss room)
    const usedTypes = new Set(allRooms.map((r) => r.themeRoomType).filter(Boolean));
    const uniqueTypes = new Set([this.blueprint.bossRoom, ...this.blueprint.requiredRooms]);
    const availablePool = pool.filter((t) => !uniqueTypes.has(t) || !usedTypes.has(t));

    if (availablePool.length === 0) {
      return geometry === "corridor" ? "corridor" : "chamber";
    }

    return this.rng.pick(availablePool);
  }

  /**
   * Update room name and description based on theme type.
   */
  private updateRoomDescription(room: SpatialRoom): void {
    const themeType = room.themeRoomType;
    if (!themeType) return;

    // Generate name from type
    const typeName = themeType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    room.name = typeName;
    room.description = `A ${room.size} ${typeName.toLowerCase()}.`;
  }

  /**
   * Optimize room type assignments based on adjacency rules.
   * Swaps types between rooms if it improves adjacency scores.
   */
  private optimizeAdjacency(rooms: SpatialRoom[]): void {
    const maxIterations = rooms.length * 2;

    for (let i = 0; i < maxIterations; i++) {
      let improved = false;

      for (const room of rooms) {
        const neighbors = this.getNeighbors(room.id, rooms);
        const currentScore = this.scoreAdjacency(room, neighbors);

        // Try swapping with each neighbor
        for (const neighbor of neighbors) {
          if (!room.themeRoomType || !neighbor.themeRoomType) continue;
          if (room.themeRoomType === "entrance" || neighbor.themeRoomType === "entrance") continue;

          // Calculate score if we swap
          const swappedScore =
            this.scoreAdjacencyIfType(room, neighbors, neighbor.themeRoomType) +
            this.scoreAdjacencyIfType(neighbor, this.getNeighbors(neighbor.id, rooms), room.themeRoomType);

          const originalScore =
            currentScore +
            this.scoreAdjacency(neighbor, this.getNeighbors(neighbor.id, rooms));

          if (swappedScore > originalScore + 5) {
            // Swap types
            const temp = room.themeRoomType;
            room.themeRoomType = neighbor.themeRoomType;
            neighbor.themeRoomType = temp;

            this.updateRoomDescription(room);
            this.updateRoomDescription(neighbor);

            improved = true;
            break;
          }
        }

        if (improved) break;
      }

      if (!improved) break;
    }
  }

  /**
   * Get neighbor rooms for a room ID.
   */
  private getNeighbors(roomId: string, rooms: SpatialRoom[]): SpatialRoom[] {
    const neighborIds = this.roomGraph.get(roomId) ?? new Set();
    return rooms.filter((r) => neighborIds.has(r.id));
  }

  /**
   * Score how well a room's type fits with its neighbors.
   */
  private scoreAdjacency(room: SpatialRoom, neighbors: SpatialRoom[]): number {
    return this.scoreAdjacencyIfType(room, neighbors, room.themeRoomType);
  }

  /**
   * Score adjacency as if the room had a specific type.
   */
  private scoreAdjacencyIfType(
    room: SpatialRoom,
    neighbors: SpatialRoom[],
    testType: ThemeRoomType | undefined
  ): number {
    if (!testType) return 0;

    const rule = this.blueprint.adjacencyRules.find((r) => r.roomType === testType);
    if (!rule) return 0;

    let score = 0;

    for (const neighbor of neighbors) {
      if (!neighbor.themeRoomType) continue;

      if (rule.preferred.includes(neighbor.themeRoomType)) {
        score += 10;
      }
      if (rule.forbidden.includes(neighbor.themeRoomType)) {
        score -= 20;
      }
    }

    return score;
  }

  /**
   * Get empty room description for this theme.
   */
  getEmptyRoomDescription(): string {
    const descriptions = this.blueprint.emptyRoomDescriptions;
    if (descriptions.length === 0) {
      return "This room is empty but for dust and shadows.";
    }
    return this.rng.pick(descriptions);
  }

  /**
   * Get creature pool for encounters.
   */
  getCreaturePool(): string[] {
    return this.blueprint.creaturePool;
  }

  /**
   * Get trap pool for this theme.
   */
  getTrapPool() {
    return this.blueprint.trapPool;
  }
}

/**
 * Apply blueprint-based room type assignment to a dungeon.
 */
export function applyBlueprint(
  theme: DungeonTheme,
  rooms: SpatialRoom[],
  passages: Passage[],
  seed: string
): void {
  const engine = new BlueprintEngine(theme, seed);
  engine.assignRoomTypes(rooms, passages);
}
