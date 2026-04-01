/**
 * DungeonHistoryGenerator - Creates multi-era history for dungeons.
 * Generates history layers, environmental clues, and discoveries.
 */

import { newId } from "@shared/ulid";
import type {
  DungeonTheme,
  SpatialRoom,
  HistoryLayer,
  Discovery,
  DiscoveryType,
} from "../types";
import { SeededRandom } from "../SeededRandom";

// === Era Templates ===

interface EraTemplate {
  era: string;
  builders: string;
  fate: string;
  clueTypes: string[];
}

// Original builders by theme
const ORIGINAL_BUILDER_TEMPLATES: Partial<Record<DungeonTheme, EraTemplate[]>> = {
  tomb: [
    { era: "centuries ago", builders: "ancient dynasty", fate: "sealed after the royal line ended", clueTypes: ["hieroglyphs", "sarcophagi", "ceremonial urns"] },
    { era: "ages past", builders: "death cult", fate: "abandoned when the cult was purged", clueTypes: ["ritual markings", "bone altars", "sacrificial blades"] },
    { era: "generations ago", builders: "noble house", fate: "forgotten after the family fell from power", clueTypes: ["heraldry", "marble statues", "family crypts"] },
  ],
  temple: [
    { era: "long ago", builders: "old faith", fate: "desecrated during a religious war", clueTypes: ["defaced icons", "shattered altars", "holy texts"] },
    { era: "centuries past", builders: "sun worshippers", fate: "abandoned when the faith waned", clueTypes: ["sun symbols", "light shafts", "gold decorations"] },
    { era: "in ancient times", builders: "druidic order", fate: "destroyed by invaders", clueTypes: ["natural motifs", "standing stones", "root patterns"] },
  ],
  cave: [
    { era: "in primordial times", builders: "natural forces", fate: "carved by underground rivers", clueTypes: ["water erosion", "stalactites", "mineral deposits"] },
    { era: "ages ago", builders: "giant burrowers", fate: "abandoned when the creatures moved on", clueTypes: ["claw marks", "massive tunnels", "shed carapaces"] },
    { era: "long ago", builders: "primitive tribe", fate: "driven out by monsters", clueTypes: ["cave paintings", "fire pits", "bone tools"] },
  ],
  fortress: [
    { era: "decades ago", builders: "fallen kingdom", fate: "sacked during the last war", clueTypes: ["war damage", "broken banners", "scattered weapons"] },
    { era: "generations past", builders: "dwarven clan", fate: "abandoned after a plague", clueTypes: ["stone masonry", "rune carvings", "empty forges"] },
    { era: "centuries ago", builders: "imperial legion", fate: "overrun by orc hordes", clueTypes: ["legion standards", "defensive walls", "arrow slits"] },
  ],
  mine: [
    { era: "decades ago", builders: "dwarven company", fate: "sealed after they dug too deep", clueTypes: ["mine carts", "ore veins", "collapsed shafts"] },
    { era: "years ago", builders: "human prospectors", fate: "abandoned when the ore ran out", clueTypes: ["pickaxes", "mine tracks", "empty crates"] },
    { era: "generations past", builders: "gnomish engineers", fate: "destroyed by an explosion", clueTypes: ["machinery parts", "blast marks", "clever mechanisms"] },
  ],
  sewer: [
    { era: "centuries ago", builders: "ancient city", fate: "buried when the city above fell", clueTypes: ["brick arches", "drainage grates", "water channels"] },
    { era: "long ago", builders: "forgotten civilization", fate: "flooded and abandoned", clueTypes: ["strange symbols", "corroded metal", "slime trails"] },
  ],
  cultist_lair: [
    { era: "decades ago", builders: "demon cult", fate: "scattered when their ritual failed", clueTypes: ["summoning circles", "blood stains", "unholy texts"] },
    { era: "recently", builders: "chaos cultists", fate: "still active and growing", clueTypes: ["fresh offerings", "hooded robes", "encrypted messages"] },
  ],
  bandit_hideout: [
    { era: "years ago", builders: "smugglers", fate: "abandoned when their leader was caught", clueTypes: ["hidden caches", "escape routes", "contraband"] },
    { era: "recently", builders: "deserters", fate: "took over existing caves", clueTypes: ["military gear", "wanted posters", "supply crates"] },
  ],
};

// Secondary occupants (what came after the original builders)
const SECONDARY_OCCUPANT_TEMPLATES: EraTemplate[] = [
  { era: "decades ago", builders: "necromancer", fate: "destroyed by adventurers", clueTypes: ["alchemical stains", "shattered vials", "undead remains"] },
  { era: "years ago", builders: "bandit gang", fate: "wiped out by militia", clueTypes: ["makeshift beds", "stolen goods", "crude repairs"] },
  { era: "recently", builders: "goblin tribe", fate: "moved in from the wilds", clueTypes: ["graffiti", "gnawed bones", "crude traps"] },
  { era: "a generation past", builders: "mad wizard", fate: "disappeared mysteriously", clueTypes: ["arcane diagrams", "strange apparatus", "warped reality"] },
  { era: "years ago", builders: "refugees", fate: "driven out by monsters", clueTypes: ["personal belongings", "prayer beads", "children's toys"] },
];

// === Environmental Clue Tables ===

const ENVIRONMENTAL_CLUES: Record<string, string[]> = {
  // Architecture clues
  hieroglyphs: [
    "Faded hieroglyphs depict a coronation ceremony",
    "Ancient pictographs show a great journey across the desert",
    "Worn carvings illustrate a forgotten god's triumph",
  ],
  sarcophagi: [
    "An empty sarcophagus bears the name of a long-dead king",
    "Smashed tomb lids reveal the bodies were removed long ago",
    "Stone coffins line the walls, their seals still intact",
  ],
  ritual_markings: [
    "Dark stains form patterns around a central altar",
    "Chalk circles cover the floor, partially scuffed away",
    "Arcane sigils are carved into every surface",
  ],
  defaced_icons: [
    "Statue faces have been systematically smashed",
    "Holy symbols are scratched over with profane marks",
    "Paintings are slashed and burned",
  ],
  war_damage: [
    "Sword cuts score the stone walls",
    "A collapsed section shows evidence of siege weapons",
    "Scorch marks from magical battle cover the ceiling",
  ],
  cave_paintings: [
    "Primitive figures hunt massive beasts across the wall",
    "Handprints in ochre mark a sacred boundary",
    "Swirling patterns suggest a vision quest",
  ],
  mine_carts: [
    "Rusted ore carts sit abandoned on broken tracks",
    "A collapsed shaft shows pickaxe marks on both sides",
    "Tool racks still hold corroded implements",
  ],
  summoning_circles: [
    "A circle of blood-red runes pulses faintly with power",
    "Salt lines mark a protective barrier around a dark stain",
    "Candle stubs surround a complex geometric pattern",
  ],
  // Activity clues
  gnawed_bones: [
    "Gnawed bones are scattered near a cold fire pit",
    "Teeth marks on bones suggest large predators",
    "A pile of cracked bones suggests recent feeding",
  ],
  stolen_goods: [
    "Merchant crates bear the seals of nearby towns",
    "A pile of jewelry and coins sits half-sorted",
    "Bolts of expensive cloth are stacked against the wall",
  ],
  personal_belongings: [
    "A child's doll lies forgotten in a corner",
    "Family portraits are stacked against the wall",
    "Personal letters are scattered across a makeshift desk",
  ],
};

// === Discovery Content Templates ===

interface DocumentTemplate {
  title: string;
  template: string;
  type: "journal" | "letter" | "map" | "spell_notes" | "orders";
}

const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    title: "Tattered Journal",
    template: "Day [NUMBER]: The [CREATURE]s grow bolder. I've hidden [ITEM_OR_TREASURE] where they won't find it - behind the [FEATURE] in the [ROOM_TYPE]. If I don't make it out, tell [NAME] I tried.",
    type: "journal",
  },
  {
    title: "Bloodstained Letter",
    template: "My dearest [NAME], by the time you read this, I will be deep within the [DUNGEON_TYPE]. [FACTION] hired us to retrieve the [ITEM_OR_TREASURE]. If we succeed, we'll be rich. If not... don't let them forget us.",
    type: "letter",
  },
  {
    title: "Crude Map",
    template: "Shows a rough sketch of the dungeon, with 'DANGER' scrawled near [ROOM_TYPE] and an 'X' marking what appears to be [ITEM_OR_TREASURE].",
    type: "map",
  },
  {
    title: "Faction Orders",
    template: "By order of [FACTION], secure the [ITEM_OR_TREASURE] at all costs. Eliminate any who interfere. Report to [NAME] upon completion. Glory to [FACTION].",
    type: "orders",
  },
  {
    title: "Research Notes",
    template: "The [CREATURE]s show unusual behavior near [FEATURE]. I believe the [ITEM_OR_TREASURE] is influencing them. Must investigate the [ROOM_TYPE] more thoroughly...",
    type: "spell_notes",
  },
];

// === Previous Adventuring Party System ===

interface FailedParty {
  name: string;
  leader: string;
  fate: string;
  dungeonId: string;
  roomId: string;
  gear: string[];
  journalEntry: string;
}

const PARTY_NAMES = [
  "The Silver Shields",
  "Company of the Dragon",
  "The Seekers",
  "Band of the Broken Blade",
  "The Fortune Hunters",
  "Order of the Empty Purse",
  "The Reckless Few",
  "Companions of the Last Dawn",
];

const PARTY_FATES = [
  "overwhelmed by the inhabitants",
  "split up and picked off one by one",
  "caught in a trap",
  "betrayed by one of their own",
  "succumbed to a curse",
  "ran out of supplies",
  "encountered something beyond their skill",
];

const ADVENTURER_GEAR = [
  "rusty shortsword",
  "torn leather armor",
  "empty potion vial",
  "broken lantern",
  "snapped crossbow",
  "tattered rope",
  "cracked shield",
  "dented helm",
  "moth-eaten cloak",
  "ruined spellbook",
];

export class DungeonHistoryGenerator {
  private rng: SeededRandom;
  private theme: DungeonTheme;

  constructor(theme: DungeonTheme, seed: string) {
    this.theme = theme;
    this.rng = new SeededRandom(`${seed}-history`);
  }

  /**
   * Generate 2-3 history layers for a dungeon.
   */
  generateHistoryLayers(): HistoryLayer[] {
    const layers: HistoryLayer[] = [];

    // Layer 1: Original builders
    const originalTemplates = ORIGINAL_BUILDER_TEMPLATES[this.theme] ?? ORIGINAL_BUILDER_TEMPLATES.fortress!;
    const original = this.rng.pick(originalTemplates);
    layers.push({ ...original });

    // Layer 2: Sometimes a secondary occupant
    if (this.rng.chance(0.6)) {
      const secondary = this.rng.pick(SECONDARY_OCCUPANT_TEMPLATES);
      layers.push({ ...secondary });
    }

    // Layer 3: Current occupants (always implied by theme)
    // This is handled separately in DungeonEcologyGenerator

    return layers;
  }

  /**
   * Add historical clues to rooms based on history layers.
   */
  addHistoricalClues(rooms: SpatialRoom[], layers: HistoryLayer[]): void {
    // Distribute clues across rooms
    for (const room of rooms) {
      if (room.type === "entrance") continue;

      // 40% chance of historical clue per room
      if (!this.rng.chance(0.4)) continue;

      const clues: string[] = [];

      // Pick a random layer and clue type
      const layer = this.rng.pick(layers);
      const clueType = this.rng.pick(layer.clueTypes);

      // Get clue description from tables
      const clueOptions = ENVIRONMENTAL_CLUES[clueType.replace(/\s+/g, "_").toLowerCase()];
      if (clueOptions) {
        clues.push(this.rng.pick(clueOptions));
      } else {
        // Generate generic clue
        clues.push(`Signs of the ${layer.builders} are visible: ${clueType}`);
      }

      room.historicalClues = clues;
    }
  }

  /**
   * Generate discoveries for rooms.
   */
  generateDiscoveries(
    rooms: SpatialRoom[],
    layers: HistoryLayer[],
    hooks: never[] = []
  ): void {
    // Target: 2-4 discoveries per dungeon
    const discoveryCount = this.rng.between(2, 4);
    const eligibleRooms = rooms.filter(
      (r) => r.type !== "entrance" && r.depth >= 1
    );

    if (eligibleRooms.length === 0) return;

    for (let i = 0; i < discoveryCount; i++) {
      const room = this.rng.pick(eligibleRooms);
      const discovery = this.generateDiscovery(layers, hooks);

      if (!room.discoveries) {
        room.discoveries = [];
      }
      room.discoveries.push(discovery);
    }
  }

  /**
   * Generate a single discovery.
   */
  private generateDiscovery(layers: HistoryLayer[], hooks: never[]): Discovery {
    const typeRoll = this.rng.next();
    let type: DiscoveryType;

    if (typeRoll < 0.3) {
      type = "document";
    } else if (typeRoll < 0.6) {
      type = "evidence";
    } else if (typeRoll < 0.85) {
      type = "clue";
    } else {
      type = "secret";
    }

    const discovery: Discovery = {
      id: `discovery-${newId()}`,
      type,
      description: this.getDiscoveryDescription(type, layers),
      found: false,
    };

    // Documents get content
    if (type === "document") {
      const template = this.rng.pick(DOCUMENT_TEMPLATES);
      discovery.content = this.fillDocumentTemplate(template, layers);
    }

    // hooks param kept for API compat but stripped in realmKeeper (always empty)

    return discovery;
  }

  /**
   * Get description for a discovery type.
   */
  private getDiscoveryDescription(type: DiscoveryType, layers: HistoryLayer[]): string {
    const layer = this.rng.pick(layers);

    switch (type) {
      case "document":
        return this.rng.pick([
          "A weathered journal lies half-buried in debris",
          "A sealed letter is tucked into a crack in the wall",
          "Parchment scraps are scattered across the floor",
          "A locked strongbox contains rolled documents",
        ]);
      case "evidence":
        return this.rng.pick([
          `Skeletal remains wearing gear from ${layer.era}`,
          "A blood trail leads to a hidden alcove",
          "Signs of a fierce battle mark this area",
          "Someone died here - their possessions remain",
        ]);
      case "clue":
        return this.rng.pick([
          "Fresh footprints in the dust suggest recent passage",
          "Supplies have been recently disturbed",
          "A recently-used campfire still holds warmth",
          `Markings in the ${layer.builders} style have been recently defaced`,
        ]);
      case "secret":
        return this.rng.pick([
          "A loose stone conceals a small hidden space",
          "The wall here sounds hollow when tapped",
          "Scratch marks suggest something was moved regularly",
          "A draft of air hints at a hidden passage",
        ]);
    }
  }

  /**
   * Fill in a document template with contextual information.
   */
  private fillDocumentTemplate(template: DocumentTemplate, layers: HistoryLayer[]): string {
    const layer = this.rng.pick(layers);
    let content = template.template;

    content = content.replace("[NUMBER]", String(this.rng.between(1, 30)));
    content = content.replace("[CREATURE]", this.rng.pick(["goblin", "orc", "undead", "beast", "cultist"]));
    content = content.replace("[ITEM_OR_TREASURE]", this.rng.pick(["the gold", "the artifact", "the relic", "our supplies", "the key"]));
    content = content.replace("[FEATURE]", this.rng.pick(["altar", "statue", "pillar", "fireplace", "throne"]));
    content = content.replace("[ROOM_TYPE]", this.rng.pick(["inner chamber", "storage room", "eastern hall", "deepest level"]));
    content = content.replace("[NAME]", this.rng.pick(["Elena", "Marcus", "Theron", "Sera", "Aldric"]));
    content = content.replace("[DUNGEON_TYPE]", this.theme.replace("_", " "));
    content = content.replace("[FACTION]", layer.builders);

    return `${template.title}\n\n${content}`;
  }

  /**
   * Generate a failed adventuring party's remains.
   */
  generateFailedParty(room: SpatialRoom, layers: HistoryLayer[]): Discovery {
    const partyName = this.rng.pick(PARTY_NAMES);
    const fate = this.rng.pick(PARTY_FATES);
    const gear = this.rng.sample(ADVENTURER_GEAR, this.rng.between(2, 4));

    const journalEntry = `We were ${fate}. If anyone finds this, tell the guild that ${partyName} died fighting. The treasure... it's real. It's in the deepest chamber. Don't make our mistake - bring more people.`;

    return {
      id: `discovery-party-${newId()}`,
      type: "evidence",
      description: `The remains of an adventurer from ${partyName}. Nearby: ${gear.join(", ")}`,
      content: `Final Entry of ${partyName}'s Journal\n\n${journalEntry}`,
      found: false,
    };
  }
}

/**
 * Generate history layers and discoveries for a dungeon.
 */
export function generateDungeonHistory(
  theme: DungeonTheme,
  rooms: SpatialRoom[],
  hooks: never[],
  seed: string
): HistoryLayer[] {
  const generator = new DungeonHistoryGenerator(theme, seed);

  // Generate layers
  const layers = generator.generateHistoryLayers();

  // Add historical clues to rooms
  generator.addHistoricalClues(rooms, layers);

  // Generate discoveries
  generator.generateDiscoveries(rooms, layers, hooks);

  // 30% chance of failed adventuring party remains
  const rng = new SeededRandom(`${seed}-party`);
  if (rng.chance(0.3)) {
    const eligibleRooms = rooms.filter((r) => r.depth >= 2);
    if (eligibleRooms.length > 0) {
      const room = rng.pick(eligibleRooms);
      const partyDiscovery = generator.generateFailedParty(room, layers);
      if (!room.discoveries) {
        room.discoveries = [];
      }
      room.discoveries.push(partyDiscovery);
    }
  }

  return layers;
}
