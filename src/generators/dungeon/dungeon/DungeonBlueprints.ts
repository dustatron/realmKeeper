/**
 * Dungeon Blueprints - Theme-specific room configurations and generation rules.
 * Each theme defines its unique room types, adjacency rules, creature pools, and traps.
 */

import type {
  DungeonBlueprint,
  DungeonTheme,
  ThemeRoomType,
  ThemeRoomConfig,
  AdjacencyRule,
  TrapTemplate,
} from "../types";

// === Universal Trap Templates (Cairn-style: telegraphed, solvable, consequential) ===

const UNIVERSAL_TRAPS: TrapTemplate[] = [
  {
    name: "Covered Pit",
    description: "A 10-foot pit covered with rotting canvas and debris",
    damage: "1d6 STR (fall damage)",
    save: "DC 12 DEX to grab the edge",
    themes: ["*"],
    locations: ["room", "passage"],
    trigger: "Stepping onto the center of the covered section",
    passiveHint: "The floor sounds hollow when walked on",
    activeHint: "Seams in the dust outline a rectangular section of floor",
    disarmMethods: [
      "Walk along the walls where the floor is solid",
      "Probe ahead with a 10-foot pole",
      "Throw heavy objects to trigger it safely",
    ],
    consequence: "The pit remains open, blocking direct passage",
    targetAttribute: "STR",
  },
  {
    name: "Pressure Plate Darts",
    description: "A floor tile triggers poison darts from concealed wall slots",
    damage: "1d4 DEX + poison (DC 13 CON or 1d6 CON)",
    save: "DC 13 DEX to dodge",
    themes: ["*"],
    locations: ["passage"],
    trigger: "Stepping on the raised floor tile",
    passiveHint: "Tiny holes line the walls at chest height",
    activeHint: "One floor tile is slightly raised and a different color",
    disarmMethods: [
      "Step over the obvious pressure plate",
      "Crawl beneath the dart trajectory",
      "Jam cloth into the dart holes",
    ],
    consequence: "The clicking alerts creatures in adjacent rooms",
    targetAttribute: "DEX",
  },
  {
    name: "Counterweight Block",
    description: "A stone block drops when a tripwire is disturbed",
    damage: "2d6 STR (crushing)",
    save: "DC 14 DEX to leap clear",
    themes: ["*"],
    locations: ["passage"],
    trigger: "Walking through or disturbing the tripwire",
    passiveHint: "Fresh scratches on the ceiling directly above",
    activeHint: "A thin wire glints at ankle height across the passage",
    disarmMethods: [
      "Step carefully over the visible tripwire",
      "Crawl under the wire",
      "Cut the wire from a safe distance with a blade on a pole",
    ],
    consequence: "The crash blocks the passage until cleared (1 hour) and alerts nearby creatures",
    targetAttribute: "STR",
  },
];

// === Tomb Theme ===

const TOMB_ROOM_CONFIGS: ThemeRoomConfig[] = [
  {
    type: "sarcophagus_chamber",
    names: ["Burial Vault", "Stone Sepulcher", "Royal Tomb", "Final Rest"],
    description: "Ancient sarcophagi line the walls, dust motes drift in stale air",
    geometries: ["chamber", "gallery"],
    minSize: "medium",
    features: ["sarcophagus", "funerary_urns", "death_masks"],
    treasureBonus: 1.5,
    encounterBonus: 0.5,
  },
  {
    type: "embalming_room",
    names: ["Preparation Chamber", "Embalming Hall", "Mortuary"],
    description: "Stone tables and jars of preserved organs fill this space",
    geometries: ["chamber"],
    minSize: "small",
    features: ["canopic_jars", "embalming_tools", "drained_pool"],
    treasureBonus: 0.5,
    encounterBonus: 0.3,
  },
  {
    type: "burial_niches",
    names: ["Bone Alcoves", "Resting Niches", "Wall Tombs"],
    description: "Rows of alcoves hold ancient remains",
    geometries: ["corridor", "gallery"],
    features: ["skeletal_remains", "faded_inscriptions"],
    treasureBonus: 0.3,
    encounterBonus: 0.6,
  },
  {
    type: "offering_hall",
    names: ["Offering Chamber", "Gift Hall", "Tribute Room"],
    description: "A space for offerings to the dead",
    geometries: ["chamber"],
    features: ["offering_bowls", "withered_flowers", "coins"],
    treasureBonus: 1.2,
    encounterBonus: 0.2,
  },
  {
    type: "priest_quarters",
    names: ["Priest's Cell", "Keeper's Chamber", "Guardian Quarters"],
    description: "Living quarters for tomb guardians",
    geometries: ["chamber", "alcove"],
    features: ["simple_bed", "religious_texts", "dried_food"],
    treasureBonus: 0.8,
    encounterBonus: 0.7,
  },
  {
    type: "false_tomb",
    names: ["Decoy Burial", "False Crypt", "Dummy Vault"],
    description: "A fake burial chamber designed to mislead grave robbers",
    geometries: ["chamber"],
    features: ["empty_sarcophagus", "obvious_treasures"],
    treasureBonus: 0.2,
    encounterBonus: 0.9, // Traps!
  },
  {
    type: "guardian_chamber",
    names: ["Guardian Post", "Eternal Watch", "Sentinel Room"],
    description: "A chamber where undead guardians stand eternal vigil",
    geometries: ["chamber"],
    minSize: "medium",
    features: ["statue_alcoves", "weapon_racks"],
    treasureBonus: 0.3,
    encounterBonus: 1.5,
  },
  {
    type: "treasure_vault",
    names: ["Treasure Vault", "Burial Hoard", "King's Wealth"],
    description: "The accumulated wealth meant to follow the dead",
    geometries: ["chamber", "alcove"],
    minSize: "small",
    features: ["treasure_chests", "gold_coins", "jewelry"],
    treasureBonus: 3.0,
    encounterBonus: 0.8,
  },
];

const TOMB_ADJACENCY: AdjacencyRule[] = [
  {
    roomType: "embalming_room",
    preferred: ["burial_niches", "sarcophagus_chamber"],
    forbidden: ["treasure_vault", "entrance"],
  },
  {
    roomType: "priest_quarters",
    preferred: ["offering_hall", "guardian_chamber"],
    forbidden: ["false_tomb"],
  },
  {
    roomType: "treasure_vault",
    preferred: ["sarcophagus_chamber", "guardian_chamber"],
    forbidden: ["entrance", "embalming_room"],
  },
  {
    roomType: "false_tomb",
    preferred: ["entrance", "corridor"],
    forbidden: ["treasure_vault", "sarcophagus_chamber"],
  },
];

const TOMB_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Curse Glyph",
    description: "A magical symbol etched into the floor pulses with necrotic energy when disturbed",
    damage: "2d6 WIS (haunted by visions)",
    save: "DC 15 WIS to resist",
    themes: ["tomb", "crypt"],
    locations: ["room"],
    trigger: "Stepping on or touching the glowing symbols",
    passiveHint: "An unnatural chill emanates from the carved floor tiles",
    activeHint: "Faintly glowing symbols form a circle around the sarcophagus",
    disarmMethods: [
      "Step only on the unmarked tiles around the edge",
      "Speak the name inscribed on the tomb with respect",
      "Scatter salt or holy water over the glyph",
      "Cover it completely with cloth or dirt",
    ],
    consequence: "Awakens undead guardians in adjacent chambers",
    targetAttribute: "WIS",
  },
  {
    name: "Needle Lock",
    description: "A spring-loaded poison needle hidden in a door's lock mechanism",
    damage: "1d4 DEX + paralysis (DC 14 CON or 1d4 hours)",
    save: "DC 14 DEX to withdraw hand in time",
    themes: ["tomb", "fortress"],
    locations: ["passage"],
    trigger: "Inserting a key or pick into the lock",
    passiveHint: "A faint chemical smell wafts from the keyhole",
    activeHint: "Dark stains discolor the stone around the lock",
    disarmMethods: [
      "Look through the keyhole first and spot the needle",
      "Insert a thin wire to trigger the needle safely",
      "Pour oil into the lock to jam the mechanism",
      "Remove the door from its hinges instead",
    ],
    consequence: "Paralyzed victims are helpless until rescued",
    targetAttribute: "DEX",
  },
  {
    name: "Crushing Walls",
    description: "Pressure plates trigger hidden mechanisms that slowly close the walls",
    damage: "3d6 STR (crushed)",
    save: "DC 15 STR to hold walls apart (buys 1 round)",
    themes: ["tomb"],
    locations: ["room"],
    trigger: "Stepping on any of several pressure plates in the floor",
    passiveHint: "Bones and crushed equipment line the walls' seams",
    activeHint: "The walls have fresh scratches and a visible gap at the floor",
    disarmMethods: [
      "Move through quickly before walls gain momentum",
      "Stay near the doorway where the walls don't reach",
      "Wedge iron spikes between the wall sections",
      "Find the hidden switch near the exit",
    ],
    consequence: "Takes 3 rounds to fully close - time to escape or be trapped",
    targetAttribute: "STR",
  },
];

const TOMB_EMPTY_DESCRIPTIONS = [
  "Dust motes drift in stale air. An overturned offering bowl lies forgotten.",
  "Scratches on the wall count days. Someone was trapped here once.",
  "Faded hieroglyphs tell of a great king. The paint is crumbling.",
  "The scent of ancient incense lingers. Dried flowers crumble at a touch.",
  "Boot prints in the dust. You are not the first to come here.",
  "A cold draft whispers through cracks. The dead do not rest easy.",
];

export const TOMB_BLUEPRINT: DungeonBlueprint = {
  theme: "tomb",
  requiredRooms: ["entrance", "sarcophagus_chamber"],
  optionalRooms: [
    "embalming_room",
    "burial_niches",
    "offering_hall",
    "priest_quarters",
    "false_tomb",
    "guardian_chamber",
    "treasure_vault",
  ],
  bossRoom: "sarcophagus_chamber",
  adjacencyRules: TOMB_ADJACENCY,
  creaturePool: ["skeleton", "zombie", "mummy", "wight", "ghost", "specter"],
  trapPool: TOMB_TRAPS,
  emptyRoomDescriptions: TOMB_EMPTY_DESCRIPTIONS,
};

// === Cave Theme ===

const CAVE_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Unstable Ceiling",
    description: "A section of loose rock precariously balanced above",
    damage: "2d6 STR (buried under rubble)",
    save: "DC 13 DEX to dive clear",
    themes: ["cave", "mine"],
    locations: ["room", "passage"],
    trigger: "Loud noises or vibrations from movement",
    passiveHint: "Small pebbles occasionally fall from above",
    activeHint: "A network of cracks spreads across the ceiling; support timbers are rotted",
    disarmMethods: [
      "Move through quietly, one at a time",
      "Crawl along the wall where the ceiling is more stable",
      "Trigger the collapse from a safe distance with thrown rocks",
    ],
    consequence: "Loud crash alerts all creatures within 200 feet; may block passage",
    targetAttribute: "STR",
  },
  {
    name: "Slippery Slope",
    description: "A steep, wet limestone slope drops into darkness",
    damage: "1d6 STR per 10 feet fallen",
    save: "DC 12 DEX to catch yourself",
    themes: ["cave"],
    locations: ["passage"],
    trigger: "Walking onto the wet slope without caution",
    passiveHint: "The sound of dripping water and a cold updraft",
    activeHint: "The floor gleams wetly and angles sharply downward",
    disarmMethods: [
      "Sit down and scoot along carefully",
      "Slide down intentionally to see the bottom",
      "Anchor a rope at the top and descend carefully",
    ],
    consequence: "Lands in a lower level or underground pool",
    targetAttribute: "STR",
  },
  {
    name: "Spider Web Curtain",
    description: "Thick webs conceal a pit or alert nearby giant spiders",
    damage: "Restrained + 1d6 CON (poison) if spiders arrive",
    save: "DC 11 STR to break free each round",
    themes: ["cave"],
    locations: ["passage"],
    trigger: "Walking into the webbing",
    passiveHint: "Silk strands drift in the air; small wrapped bundles hang nearby",
    activeHint: "A wall of webbing stretches floor to ceiling across the passage",
    disarmMethods: [
      "Go around via a side passage",
      "Burn the webs with a torch (clears path but alerts spiders)",
      "Cut a careful path through with a blade",
    ],
    consequence: "Giant spiders investigate within 1d4 rounds",
    targetAttribute: "STR",
  },
];

const CAVE_EMPTY_DESCRIPTIONS = [
  "Water drips steadily from stalactites. The sound echoes endlessly.",
  "Glowing fungi provide dim, eerie light. They pulse slowly.",
  "Guano covers the floor. Bats roosted here recently.",
  "A narrow squeeze leads nowhere. Someone carved initials in the rock.",
  "The air is damp and cold. Your breath mists before you.",
];

export const CAVE_BLUEPRINT: DungeonBlueprint = {
  theme: "cave",
  requiredRooms: ["entrance", "creature_nest"],
  optionalRooms: [
    "mushroom_garden",
    "underground_pool",
    "bat_roost",
    "crystal_grotto",
    "natural_chimney",
    "stalactite_hall",
    "collapsed_section",
  ],
  bossRoom: "creature_nest",
  adjacencyRules: [
    {
      roomType: "underground_pool",
      preferred: ["mushroom_garden", "crystal_grotto"],
      forbidden: ["bat_roost"],
    },
  ],
  creaturePool: ["giant_spider", "giant_bat", "cave_fisher", "troglodyte", "grick", "purple_worm_young"],
  trapPool: CAVE_TRAPS,
  emptyRoomDescriptions: CAVE_EMPTY_DESCRIPTIONS,
};

// === Temple Theme ===

const TEMPLE_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Cleansing Flame Jets",
    description: "Sacred flames erupt from hidden vents to purify intruders",
    damage: "2d6 DEX (burns)",
    save: "DC 14 DEX to dive aside",
    themes: ["temple", "shrine"],
    locations: ["room"],
    trigger: "Stepping on the grid of floor vents",
    passiveHint: "The scent of oil and a faint warmth from the floor",
    activeHint: "Small holes pattern the floor in a grid; scorched bones lie nearby",
    disarmMethods: [
      "Time your movement between the flame bursts (every 6 seconds)",
      "Hug the walls where there are no vents",
      "Stuff the vents with cloth or debris",
      "Douse the area with water to cool the mechanism",
    ],
    consequence: "The flames illuminate the room brightly for 1 minute, alerting nearby creatures",
    targetAttribute: "DEX",
  },
  {
    name: "Guardian Idol",
    description: "A statue's eyes glow and it pronounces judgment on trespassers",
    damage: "2d6 WIS (psychic shame)",
    save: "DC 15 WIS to resist",
    themes: ["temple"],
    locations: ["passage"],
    trigger: "Passing in front of the idol without showing respect",
    passiveHint: "The statue's eyes are inset with crystals that catch the light",
    activeHint: "Other statues along the hall have been defaced or toppled",
    disarmMethods: [
      "Bow respectfully as you pass",
      "Crawl past below the statue's line of sight",
      "Cover the crystal eyes with cloth",
      "Approach while wearing holy symbols of the temple's faith",
    ],
    consequence: "Loudly announces presence to all in the temple",
    targetAttribute: "WIS",
  },
  {
    name: "Weighted Offering Plate",
    description: "Removing an offering triggers a concealed blade or releases poison gas",
    damage: "1d8 DEX (blade) or 1d6 CON (gas)",
    save: "DC 13 DEX to avoid",
    themes: ["temple", "shrine"],
    locations: ["room"],
    trigger: "Removing the offerings from the plate",
    passiveHint: "The offerings look valuable but undisturbed for years",
    activeHint: "The plate sits on a slightly raised pedestal with visible hinges",
    disarmMethods: [
      "Leave the offerings alone",
      "Replace the offering with something of equal weight",
      "Jam the mechanism with a dagger before lifting",
    ],
    consequence: "Gas version fills the room for 1d4 rounds",
    targetAttribute: "DEX",
  },
];

const TEMPLE_EMPTY_DESCRIPTIONS = [
  "Faded murals depict forgotten gods. Their eyes seem to follow you.",
  "Broken pews line the walls. Worship ended long ago.",
  "An altar stands bare. Offerings have long since rotted away.",
  "Incense holders hang empty. The scent of holiness has faded.",
  "Prayer cushions lie scattered. The faithful fled in haste.",
];

export const TEMPLE_BLUEPRINT: DungeonBlueprint = {
  theme: "temple",
  requiredRooms: ["entrance", "altar_room"],
  optionalRooms: [
    "nave",
    "vestry",
    "meditation_cells",
    "clergy_quarters",
    "temple_library",
    "reliquary",
    "baptistery",
  ],
  bossRoom: "altar_room",
  adjacencyRules: [
    {
      roomType: "altar_room",
      preferred: ["nave", "reliquary"],
      forbidden: ["meditation_cells"],
    },
    {
      roomType: "clergy_quarters",
      preferred: ["vestry", "temple_library"],
      forbidden: ["altar_room"],
    },
  ],
  creaturePool: ["cultist", "acolyte", "priest", "animated_armor", "gargoyle", "shadow_demon"],
  trapPool: TEMPLE_TRAPS,
  emptyRoomDescriptions: TEMPLE_EMPTY_DESCRIPTIONS,
};

// === Mine Theme ===

const MINE_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Flooded Shaft",
    description: "A sealed section gives way to rushing water from an underground spring",
    damage: "Swept away + 1d6 CON per round (drowning)",
    save: "DC 12 STR to grab hold",
    themes: ["mine", "sewer"],
    locations: ["passage"],
    trigger: "Disturbing the weakened wall section",
    passiveHint: "Water seeps through cracks in the wall; the air is humid",
    activeHint: "Fresh watermarks stain the walls at shoulder height",
    disarmMethods: [
      "Find an alternate route through upper tunnels",
      "Wade through carefully, staying near the walls",
      "Swim through quickly with a rope tied to the group",
    ],
    consequence: "Tunnel floods to waist height; slows movement for hours",
    targetAttribute: "CON",
  },
  {
    name: "Firedamp Pocket",
    description: "A pocket of explosive mining gas ignites from any open flame",
    damage: "3d6 STR (explosion)",
    save: "DC 14 DEX for half",
    themes: ["mine"],
    locations: ["room"],
    trigger: "Bringing an open flame into the area",
    passiveHint: "A faint, sweet smell; the air feels thick",
    activeHint: "Canaries or other small animals lie dead; torches flicker oddly",
    disarmMethods: [
      "Extinguish all flames before entering",
      "Use a hooded lantern with the vent closed",
      "Ventilate the area by fanning air through",
      "Cast Light instead of using fire",
    ],
    consequence: "Explosion may cause ceiling collapse; may trap the party",
    targetAttribute: "STR",
  },
  {
    name: "Abandoned Mine Cart",
    description: "A precariously balanced ore cart releases when disturbed",
    damage: "2d6 STR (crushing)",
    save: "DC 12 DEX to dodge",
    themes: ["mine"],
    locations: ["passage"],
    trigger: "Walking past the cart or along the tracks",
    passiveHint: "Track rails lead downward; a heavy cart sits at the top",
    activeHint: "The cart's brake lever is rusted through; pebbles hold it in place",
    disarmMethods: [
      "Stand to the side of the tracks when passing",
      "Release the cart intentionally from a safe distance",
      "Carefully secure the cart with rope or spikes",
    ],
    consequence: "The noise echoes throughout the mine level, alerting all",
    targetAttribute: "STR",
  },
];

const MINE_EMPTY_DESCRIPTIONS = [
  "Rusted tools lie abandoned. The miners left in a hurry.",
  "Cart tracks disappear into darkness. Something derailed here.",
  "Support beams creak ominously. The ceiling sags.",
  "Ore samples litter a work table. The vein was never finished.",
  "A miner's lunch sits untouched. Decades old but preserved.",
];

export const MINE_BLUEPRINT: DungeonBlueprint = {
  theme: "mine",
  requiredRooms: ["entrance", "ore_vein"],
  optionalRooms: [
    "cart_tracks",
    "collapsed_tunnel",
    "flooded_level",
    "equipment_room",
    "ore_processing",
    "shaft_entrance",
    "support_beams",
  ],
  bossRoom: "ore_vein",
  adjacencyRules: [
    {
      roomType: "ore_processing",
      preferred: ["ore_vein", "cart_tracks"],
      forbidden: ["flooded_level"],
    },
  ],
  creaturePool: ["kobold", "dwarf_ghost", "rust_monster", "earth_elemental", "purple_worm_young", "umber_hulk"],
  trapPool: MINE_TRAPS,
  emptyRoomDescriptions: MINE_EMPTY_DESCRIPTIONS,
};

// === Fortress Theme ===

const FORTRESS_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Murder Holes",
    description: "Holes in the ceiling allow defenders to rain arrows, oil, or rocks on intruders",
    damage: "2d6 DEX (arrows) or 2d6 STR + fire (oil)",
    save: "DC 13 DEX for half",
    themes: ["fortress"],
    locations: ["passage"],
    trigger: "Entering the kill zone while defenders are present above",
    passiveHint: "The passage is unusually straight and narrow",
    activeHint: "Small holes line the ceiling; old oil stains darken the floor",
    disarmMethods: [
      "Sprint through in a single rush before they can react",
      "Use shields overhead as a testudo formation",
      "Find the upper chamber and clear it first",
    ],
    consequence: "Alerts the entire garrison; reinforcements arrive in 2d6 rounds",
    targetAttribute: "DEX",
  },
  {
    name: "Falling Portcullis",
    description: "A heavy iron grate drops to trap intruders in a kill zone",
    damage: "2d6 STR if caught underneath",
    save: "DC 14 DEX to dive clear",
    themes: ["fortress"],
    locations: ["passage"],
    trigger: "Stepping on the pressure plate in the center of the passage",
    passiveHint: "Grooves in the walls show where something slides down",
    activeHint: "An iron grate is visible above, suspended by chains",
    disarmMethods: [
      "Move through one at a time, staying near the walls",
      "Trigger it intentionally from the safe side",
      "Jam the grooves with iron spikes before crossing",
    ],
    consequence: "Party may be split; those inside face guards from both directions",
    targetAttribute: "STR",
  },
  {
    name: "Alarm Bells",
    description: "Tripwires connected to loud brass bells throughout the fortress",
    damage: "None (alarm only)",
    save: "DC 10 DEX to catch the bell before it rings",
    themes: ["fortress"],
    locations: ["passage", "room"],
    trigger: "Walking through the tripwire",
    passiveHint: "Faint sounds of bells deeper in the fortress",
    activeHint: "A thin cord stretches across the doorway at ankle height",
    disarmMethods: [
      "Step over the tripwire carefully",
      "Crawl under the wire",
      "Muffle the bell with cloth before triggering",
    ],
    consequence: "All creatures in the fortress go to alert status; patrols double",
    targetAttribute: "DEX",
  },
];

const FORTRESS_EMPTY_DESCRIPTIONS = [
  "Weapon racks stand empty. The garrison stripped it bare.",
  "Battle maps cover a table. Outdated strategies for a lost war.",
  "Bunks line the walls. Soldiers' personal effects remain.",
  "A half-finished letter lies on a desk. It was never sent.",
  "Arrow slits look out on nothing. The view has changed.",
];

export const FORTRESS_BLUEPRINT: DungeonBlueprint = {
  theme: "fortress",
  requiredRooms: ["entrance", "throne_room"],
  optionalRooms: [
    "barracks",
    "armory",
    "war_room",
    "prison_block",
    "mess_hall",
    "watchtower",
    "secret_escape",
  ],
  bossRoom: "throne_room",
  adjacencyRules: [
    {
      roomType: "barracks",
      preferred: ["armory", "mess_hall"],
      forbidden: ["throne_room", "prison_block"],
    },
    {
      roomType: "throne_room",
      preferred: ["war_room", "secret_escape"],
      forbidden: ["barracks", "mess_hall"],
    },
  ],
  creaturePool: ["hobgoblin", "orc", "ogre", "knight", "veteran", "warlord"],
  trapPool: FORTRESS_TRAPS,
  emptyRoomDescriptions: FORTRESS_EMPTY_DESCRIPTIONS,
};

// === Sewer Theme ===

const SEWER_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Methane Pocket",
    description: "A pocket of noxious gas accumulated in a low area",
    damage: "1d6 CON + nausea (disadvantage for 1 hour)",
    save: "DC 13 CON to hold breath",
    themes: ["sewer"],
    locations: ["room", "passage"],
    trigger: "Breathing normally in the affected area",
    passiveHint: "A rotten egg smell grows stronger ahead",
    activeHint: "Dead rats and insects litter the floor; no living things here",
    disarmMethods: [
      "Hold breath and move through quickly",
      "Tie a cloth soaked in alcohol over nose and mouth",
      "Ventilate by opening grates to the surface",
      "Wave a torch to burn off the gas (risk of explosion)",
    ],
    consequence: "Open flame causes 2d6 STR (fire) explosion",
    targetAttribute: "CON",
  },
  {
    name: "Waste Surge",
    description: "A buildup of sewage releases suddenly, flooding the tunnel",
    damage: "1d6 STR + disease (DC 12 CON or filth fever)",
    save: "DC 12 STR to brace against the flow",
    themes: ["sewer"],
    locations: ["passage"],
    trigger: "Time-based release when pressure builds up",
    passiveHint: "The sound of rushing water echoes from ahead",
    activeHint: "High watermarks on the walls; debris caught in crevices",
    disarmMethods: [
      "Wait for the surge to pass (1d6 minutes)",
      "Climb above the high watermark using ledges",
      "Release the pressure early with a small opening",
      "Brace against a pillar or grate and let it wash past",
    ],
    consequence: "Washes party back to the last junction; gear soaked",
    targetAttribute: "STR",
  },
  {
    name: "Slick Steps",
    description: "Stairs covered in algae and sewage slime lead into darkness",
    damage: "1d6 STR per 10 feet fallen",
    save: "DC 11 DEX to catch yourself",
    themes: ["sewer"],
    locations: ["passage"],
    trigger: "Walking on the slippery surface without caution",
    passiveHint: "The steps glisten wetly in your torchlight",
    activeHint: "A greenish sheen coats every surface; handrails are rusted through",
    disarmMethods: [
      "Descend seated on your rear",
      "Scatter sand or gravel for traction",
      "Hammer spikes into the walls as handholds",
      "Use a rope secured at the top",
    ],
    consequence: "Tumbling alerts creatures below; may lose held items",
    targetAttribute: "STR",
  },
];

const SEWER_EMPTY_DESCRIPTIONS = [
  "The stench is overwhelming. Something died here recently.",
  "Graffiti marks thieves' cant directions. A hidden path.",
  "Rusted grates block side passages. Someone bent them.",
  "A maintenance hatch hangs open. It leads to the surface.",
  "Rats scatter at your approach. They were eating something.",
];

export const SEWER_BLUEPRINT: DungeonBlueprint = {
  theme: "sewer",
  requiredRooms: ["entrance", "junction"],
  optionalRooms: [
    "overflow_chamber",
    "maintenance_access",
    "rat_nest",
    "smuggler_cache",
    "toxic_pool",
    "drain_grate",
  ],
  bossRoom: "junction",
  adjacencyRules: [
    {
      roomType: "smuggler_cache",
      preferred: ["maintenance_access", "drain_grate"],
      forbidden: ["toxic_pool"],
    },
  ],
  creaturePool: ["giant_rat", "otyugh", "wererat", "ghoul", "crocodile", "black_pudding"],
  trapPool: SEWER_TRAPS,
  emptyRoomDescriptions: SEWER_EMPTY_DESCRIPTIONS,
};

// === Crypt Theme ===

const CRYPT_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Spectral Chains",
    description: "Ghostly chains materialize and attempt to bind the living",
    damage: "Restrained + 1d4 WIS (cold terror)",
    save: "DC 14 WIS to resist",
    themes: ["crypt"],
    locations: ["room"],
    trigger: "Lingering in the room for more than a few moments",
    passiveHint: "An unnatural cold settles into your bones",
    activeHint: "Rusted chains hang from the walls; they rattle without wind",
    disarmMethods: [
      "Move through quickly before they fully manifest",
      "Speak words of comfort for the dead",
      "Pour holy water on the chain anchors",
      "Light the room brightly with multiple light sources",
    ],
    consequence: "Bound victims attract ghosts from nearby chambers",
    targetAttribute: "WIS",
  },
  {
    name: "Bone Scatter",
    description: "Piles of bones conceal a pressure plate that animates them",
    damage: "1d6 STR (grasping) + summons 1d4 skeletons",
    save: "DC 12 DEX to avoid the plate",
    themes: ["crypt"],
    locations: ["room", "passage"],
    trigger: "Stepping on the pressure plate hidden beneath the bones",
    passiveHint: "The bones are stacked too neatly to be natural",
    activeHint: "A slight depression in the floor beneath the bone pile",
    disarmMethods: [
      "Carefully step around the bone piles",
      "Trigger from a distance with a thrown object",
      "Disrupt the bones with a long pole before entering",
      "Bless the bones with holy water to prevent animation",
    ],
    consequence: "The animated skeletons rise in 1 round",
    targetAttribute: "STR",
  },
  {
    name: "Tomb Dust",
    description: "Disturbing the crypt releases choking ancient dust",
    damage: "1d6 CON + blinded for 1d4 rounds",
    save: "DC 13 CON",
    themes: ["crypt"],
    locations: ["room"],
    trigger: "Disturbing the dust by moving through the room",
    passiveHint: "Thick dust coats everything; the air is still and stale",
    activeHint: "Disturbing anything sends up visible clouds",
    disarmMethods: [
      "Wet a cloth and breathe through it",
      "Create a breeze to clear the air before entering",
      "Move very slowly to minimize disturbance",
      "Cast a wind spell to clear the room",
    ],
    consequence: "Coughing fits reveal your presence to all nearby",
    targetAttribute: "CON",
  },
];

const CRYPT_EMPTY_DESCRIPTIONS = [
  "Bones spill from cracked ossuary walls. There are too many.",
  "Names carved in stone fade to illegibility. Forgotten dead.",
  "Candle stubs litter the floor. Someone held vigil here.",
  "A memorial wreath crumbles at a touch. Ancient grief.",
  "The air is thick with the smell of decay. It never leaves.",
];

export const CRYPT_BLUEPRINT: DungeonBlueprint = {
  theme: "crypt",
  requiredRooms: ["entrance", "sealed_vault"],
  optionalRooms: [
    "ossuary",
    "charnel_pit",
    "memorial_hall",
    "burial_alcoves",
    "caretaker_quarters",
    "ritual_chamber",
  ],
  bossRoom: "sealed_vault",
  adjacencyRules: [
    {
      roomType: "ossuary",
      preferred: ["charnel_pit", "burial_alcoves"],
      forbidden: ["caretaker_quarters"],
    },
  ],
  creaturePool: ["skeleton", "zombie", "ghoul", "wight", "wraith", "vampire_spawn"],
  trapPool: CRYPT_TRAPS,
  emptyRoomDescriptions: CRYPT_EMPTY_DESCRIPTIONS,
};

// === Lair Theme ===

const LAIR_EMPTY_DESCRIPTIONS = [
  "Bones crunch underfoot. Meals from many creatures.",
  "Claw marks gouge the walls. Territorial markings.",
  "A musty animal smell pervades everything. Recent occupation.",
  "Shed scales or fur coat the ground. Something lives here.",
  "Gnawed bones pile in a corner. Nothing was wasted.",
];

export const LAIR_BLUEPRINT: DungeonBlueprint = {
  theme: "lair",
  requiredRooms: ["entrance", "nest"],
  optionalRooms: [
    "feeding_area",
    "bone_pile",
    "sleeping_den",
    "trophy_room",
    "entrance_cave",
  ],
  bossRoom: "nest",
  adjacencyRules: [
    {
      roomType: "feeding_area",
      preferred: ["bone_pile", "nest"],
      forbidden: ["entrance"],
    },
  ],
  creaturePool: ["owlbear", "troll", "chimera", "manticore", "dragon_young", "hydra"],
  trapPool: UNIVERSAL_TRAPS,
  emptyRoomDescriptions: LAIR_EMPTY_DESCRIPTIONS,
};

// === Shrine Theme ===

const SHRINE_EMPTY_DESCRIPTIONS = [
  "Flower petals carpet the floor. Offerings from pilgrims.",
  "A peaceful aura lingers. The divine touched this place.",
  "Prayer beads hang from hooks. Left by the faithful.",
  "Spring water trickles from a font. Still pure after ages.",
  "Carved blessings cover the walls. Protection for travelers.",
];

export const SHRINE_BLUEPRINT: DungeonBlueprint = {
  theme: "shrine",
  requiredRooms: ["entrance", "offering_altar"],
  optionalRooms: [
    "sacred_pool",
    "meditation_garden",
    "pilgrim_shelter",
    "oracle_chamber",
    "relic_display",
  ],
  bossRoom: "oracle_chamber",
  adjacencyRules: [
    {
      roomType: "sacred_pool",
      preferred: ["meditation_garden", "offering_altar"],
      forbidden: ["pilgrim_shelter"],
    },
  ],
  creaturePool: ["deva", "couatl", "guardian_naga", "ki-rin", "unicorn"],
  trapPool: [...UNIVERSAL_TRAPS, ...TEMPLE_TRAPS.filter(t => t.themes.includes("shrine"))],
  emptyRoomDescriptions: SHRINE_EMPTY_DESCRIPTIONS,
};

// === Bandit Hideout Theme ===

const BANDIT_EMPTY_DESCRIPTIONS = [
  "Playing cards scatter across a table. Game interrupted.",
  "A wanted poster hangs on the wall. Someone here is famous.",
  "Empty bottles litter the floor. Last night was wild.",
  "A hastily packed bag sits abandoned. Someone fled.",
  "Crude maps mark trade routes. Future targets.",
];

export const BANDIT_HIDEOUT_BLUEPRINT: DungeonBlueprint = {
  theme: "bandit_hideout",
  requiredRooms: ["entrance", "loot_storage"],
  optionalRooms: [
    "lookout_post",
    "sleeping_quarters",
    "planning_room",
    "escape_tunnel",
    "prisoner_hold",
    "common_area",
  ],
  bossRoom: "planning_room",
  adjacencyRules: [
    {
      roomType: "prisoner_hold",
      preferred: ["sleeping_quarters"],
      forbidden: ["escape_tunnel", "entrance"],
    },
  ],
  creaturePool: ["bandit", "bandit_captain", "thug", "spy", "assassin"],
  trapPool: UNIVERSAL_TRAPS,
  emptyRoomDescriptions: BANDIT_EMPTY_DESCRIPTIONS,
};

// === Cultist Lair Theme ===

const CULTIST_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Blood Sigil",
    description: "A magical symbol painted in dried blood that awakens when crossed",
    damage: "2d6 WIS (psychic visions of horror)",
    save: "DC 14 WIS to resist",
    themes: ["cultist_lair"],
    locations: ["room"],
    trigger: "Stepping on or crossing the boundary of the sigil",
    passiveHint: "A coppery smell and a sense of wrongness",
    activeHint: "Intricate patterns in dried brown-red cover the floor around a central symbol",
    disarmMethods: [
      "Jump over the sigil entirely",
      "Smear or deface the central symbol",
      "Cover it with salt or holy water",
      "Speak the counter-phrase (found in the forbidden library)",
    ],
    consequence: "Alerts the cult leader through a psychic link",
    targetAttribute: "WIS",
  },
  {
    name: "Summoning Snare",
    description: "A dormant summoning circle activates when disturbed",
    damage: "Summons 1d4 shadow demons",
    save: "DC 15 WIS to notice before triggering",
    themes: ["cultist_lair"],
    locations: ["room"],
    trigger: "Stepping into or disturbing the summoning circle",
    passiveHint: "Candles are arranged in a precise pattern; chalk marks the floor",
    activeHint: "A complete summoning circle with intact symbols and fresh wax",
    disarmMethods: [
      "Walk around the perimeter, never crossing the circle",
      "Break the circle by scuffing a line through the chalk",
      "Knock over the candles before they can light",
      "Complete a counter-ritual (requires arcane knowledge)",
    ],
    consequence: "Summoned demons pursue until destroyed or banished",
    targetAttribute: "WIS",
  },
  {
    name: "Madness Mirror",
    description: "A mirror that reflects horrible visions of the viewer's doom",
    damage: "1d6 WIS + disadvantage on WIS saves for 1 hour",
    save: "DC 13 WIS to look away",
    themes: ["cultist_lair"],
    locations: ["room"],
    trigger: "Looking directly at your reflection in the mirror",
    passiveHint: "Your reflection seems to move slightly wrong",
    activeHint: "The mirror's frame is carved with screaming faces; others are covered",
    disarmMethods: [
      "Avert your eyes and navigate by touch",
      "Cover the mirror with a cloak before entering",
      "Shatter the mirror from a distance",
      "View it only through a reflection (mirror of a mirror)",
    ],
    consequence: "Screaming when affected alerts nearby cultists",
    targetAttribute: "WIS",
  },
];

const CULTIST_EMPTY_DESCRIPTIONS = [
  "Disturbing symbols cover every surface. Madness in paint.",
  "Burnt offerings leave greasy residue. Something was sacrificed.",
  "Robes hang from hooks. Ready for the next ritual.",
  "A journal details descent into madness. Chilling reading.",
  "The floor is stained dark. Not all of it is wine.",
];

export const CULTIST_LAIR_BLUEPRINT: DungeonBlueprint = {
  theme: "cultist_lair",
  requiredRooms: ["entrance", "summoning_circle"],
  optionalRooms: [
    "sacrifice_altar",
    "initiates_quarters",
    "leaders_chamber",
    "forbidden_library",
    "ritual_pool",
  ],
  bossRoom: "summoning_circle",
  adjacencyRules: [
    {
      roomType: "summoning_circle",
      preferred: ["sacrifice_altar", "ritual_pool"],
      forbidden: ["entrance"],
    },
  ],
  creaturePool: ["cultist", "cult_fanatic", "shadow_demon", "succubus", "chain_devil", "pit_fiend"],
  trapPool: CULTIST_TRAPS,
  emptyRoomDescriptions: CULTIST_EMPTY_DESCRIPTIONS,
};

// === Witch Hut Theme ===

const WITCH_EMPTY_DESCRIPTIONS = [
  "Dried herbs hang from every beam. The smell is overwhelming.",
  "A black cat watches from the shadows. It seems intelligent.",
  "Bottles of strange liquids line shelves. Labels are cryptic.",
  "A bubbling cauldron sits cold. The fire died recently.",
  "Runes scratched into the floor hum faintly. Magic lingers.",
];

export const WITCH_HUT_BLUEPRINT: DungeonBlueprint = {
  theme: "witch_hut",
  requiredRooms: ["entrance", "potion_workshop"],
  optionalRooms: [
    "ingredient_storage",
    "divination_room",
    "sleeping_loft",
    "garden_access",
    "familiar_den",
  ],
  bossRoom: "divination_room",
  adjacencyRules: [
    {
      roomType: "potion_workshop",
      preferred: ["ingredient_storage", "garden_access"],
      forbidden: [],
    },
  ],
  creaturePool: ["hag", "scarecrow", "will_o_wisp", "animated_broom", "black_cat", "toad_familiar"],
  trapPool: UNIVERSAL_TRAPS,
  emptyRoomDescriptions: WITCH_EMPTY_DESCRIPTIONS,
};

// === Sea Cave Theme ===

const SEA_CAVE_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Tidal Surge",
    description: "A wave crashes through as the tide shifts, flooding the passage",
    damage: "1d6 STR + swept away (DC 12 STR to grab hold)",
    save: "DC 14 STR to brace",
    themes: ["sea_cave"],
    locations: ["passage"],
    trigger: "Being in the passage when the tide comes in",
    passiveHint: "The sound of crashing waves grows louder; water drips from the ceiling",
    activeHint: "Watermarks reach near the ceiling; seaweed clings to the upper walls",
    disarmMethods: [
      "Time movement between tidal surges (every 10 minutes)",
      "Climb to higher ground and wait it out",
      "Tie a rope to an anchor point before crossing",
      "Swim with the current rather than against it",
    ],
    consequence: "Gear is soaked; torches extinguished; may be swept to lower level",
    targetAttribute: "STR",
  },
  {
    name: "Razor Barnacles",
    description: "Sharp-edged barnacles coat every surface in a narrow squeeze",
    damage: "1d4 DEX per round (laceration)",
    save: "DC 11 DEX to avoid cuts",
    themes: ["sea_cave"],
    locations: ["passage"],
    trigger: "Squeezing through the narrow passage with exposed skin",
    passiveHint: "The passage narrows; white crusting covers the walls",
    activeHint: "Old blood stains the rock; shells glint with knife-sharp edges",
    disarmMethods: [
      "Wrap hands and exposed skin before climbing through",
      "Scrape a path clear with a shield or metal tool",
      "Apply oil or grease for protection",
      "Find an alternate route through a wider passage",
    ],
    consequence: "Bleeding attracts predatory sea creatures",
    targetAttribute: "DEX",
  },
  {
    name: "Sinkhole Pool",
    description: "What appears to be a shallow tide pool conceals a deep sinkhole",
    damage: "Drowning + 2d6 STR (cold water)",
    save: "DC 12 DEX to grab the edge",
    themes: ["sea_cave"],
    locations: ["room"],
    trigger: "Stepping into the deceptively deep pool",
    passiveHint: "The water is unusually dark; you can't see the bottom",
    activeHint: "A current pulls gently toward the center of the pool",
    disarmMethods: [
      "Walk around the edge of the pool",
      "Probe with a pole before stepping",
      "Drop a weighted line to check depth",
      "Light a torch and look for the water's movement",
    ],
    consequence: "Connects to underwater passages; may find air pockets",
    targetAttribute: "STR",
  },
];

const SEA_CAVE_EMPTY_DESCRIPTIONS = [
  "Seaweed drapes the walls. High tide reaches here.",
  "Shells crunch underfoot. The sea claims this space.",
  "Salt crystals glitter on every surface. Beautiful but corrosive.",
  "A shipwreck's timbers have washed in. Someone's final voyage.",
  "Tide pools teem with life. Crabs scatter at your light.",
];

export const SEA_CAVE_BLUEPRINT: DungeonBlueprint = {
  theme: "sea_cave",
  requiredRooms: ["entrance", "treasure_grotto"],
  optionalRooms: [
    "tidal_pool",
    "smuggler_dock",
    "kelp_garden",
    "shell_shrine",
    "underwater_passage",
  ],
  bossRoom: "treasure_grotto",
  adjacencyRules: [
    {
      roomType: "smuggler_dock",
      preferred: ["treasure_grotto"],
      forbidden: ["underwater_passage"],
    },
  ],
  creaturePool: ["sahuagin", "merrow", "sea_hag", "giant_crab", "giant_octopus", "water_elemental"],
  trapPool: SEA_CAVE_TRAPS,
  emptyRoomDescriptions: SEA_CAVE_EMPTY_DESCRIPTIONS,
};

// === Beast Den Theme ===

const BEAST_EMPTY_DESCRIPTIONS = [
  "Massive claw marks scar the stone. Territorial warnings.",
  "A half-eaten carcass rots in the corner. Recent kill.",
  "Nests of bone and fur fill alcoves. Young were raised here.",
  "The musk of a great beast pervades everything. It knows you're here.",
  "Tufts of fur cling to rocky outcrops. Shedding season.",
];

export const BEAST_DEN_BLUEPRINT: DungeonBlueprint = {
  theme: "beast_den",
  requiredRooms: ["entrance", "primary_nest"],
  optionalRooms: [
    "feeding_ground",
    "bone_yard",
    "young_nursery",
    "territorial_marker",
    "water_source",
  ],
  bossRoom: "primary_nest",
  adjacencyRules: [
    {
      roomType: "young_nursery",
      preferred: ["primary_nest", "water_source"],
      forbidden: ["entrance", "territorial_marker"],
    },
  ],
  creaturePool: ["dire_wolf", "cave_bear", "saber_tooth_tiger", "giant_boar", "winter_wolf"],
  trapPool: UNIVERSAL_TRAPS,
  emptyRoomDescriptions: BEAST_EMPTY_DESCRIPTIONS,
};

// === Floating Keep Theme ===

const FLOATING_TRAPS: TrapTemplate[] = [
  ...UNIVERSAL_TRAPS,
  {
    name: "Gravity Inversion Zone",
    description: "Arcane enchantments cause gravity to suddenly reverse",
    damage: "2d6 STR (fall to ceiling)",
    save: "DC 15 DEX to grab something",
    themes: ["floating_keep"],
    locations: ["room"],
    trigger: "Entering the area affected by the gravity enchantment",
    passiveHint: "Small objects float slightly; dust hangs in the air",
    activeHint: "Scorch marks on the ceiling where others fell upward",
    disarmMethods: [
      "Move along the walls where gravity is stable",
      "Tie a rope across the room before entering",
      "Trigger the inversion while braced, then walk on the ceiling",
      "Find and destroy the controlling rune crystal",
    ],
    consequence: "Gravity reverses every 1d4 rounds; time your movements",
    targetAttribute: "STR",
  },
  {
    name: "Gale Corridor",
    description: "Powerful winds funnel through the passage toward open sky",
    damage: "1d6 STR + pushed toward edge (fall risk)",
    save: "DC 14 STR to hold position",
    themes: ["floating_keep"],
    locations: ["passage"],
    trigger: "Walking into the wind tunnel while upright",
    passiveHint: "A howling whistle; your cloak whips violently",
    activeHint: "The passage ends in open sky; scratch marks show where others tried to hold on",
    disarmMethods: [
      "Crawl low where the wind is weaker",
      "Close any doors or shutters to block the wind",
      "Rope together and advance as a chain",
      "Time movement for when the wind temporarily dies",
    ],
    consequence: "Blown off the keep means falling; hope for a cloud to catch",
    targetAttribute: "STR",
  },
  {
    name: "Illusory Floor",
    description: "The floor appears solid but is merely an illusion over empty sky",
    damage: "Falling (potentially fatal)",
    save: "DC 14 WIS to disbelieve; DC 13 DEX to grab edge",
    themes: ["floating_keep"],
    locations: ["room"],
    trigger: "Stepping onto the illusory floor section",
    passiveHint: "The floor looks too clean; no dust, no footprints",
    activeHint: "Your shadow doesn't fall on the floor correctly",
    disarmMethods: [
      "Walk only on the solid edges where walls meet floor",
      "Probe ahead with a pole before stepping",
      "Throw sand or flour to reveal the illusion",
      "Dispel the illusion magically",
    ],
    consequence: "Real walkway is 10 feet below; visible once illusion is known",
    targetAttribute: "WIS",
  },
];

const FLOATING_EMPTY_DESCRIPTIONS = [
  "Windows look out on clouds. The ground is far below.",
  "Strange machinery hums. It keeps the keep aloft.",
  "Star charts cover the walls. Someone studied the heavens.",
  "Wind whistles through cracks. The altitude is dizzying.",
  "Crystal prisms catch light. They power something.",
];

export const FLOATING_KEEP_BLUEPRINT: DungeonBlueprint = {
  theme: "floating_keep",
  requiredRooms: ["entrance", "arcane_engine"],
  optionalRooms: [
    "observation_deck",
    "sky_dock",
    "wind_shrine",
    "cloud_garden",
    "storm_chamber",
  ],
  bossRoom: "arcane_engine",
  adjacencyRules: [
    {
      roomType: "arcane_engine",
      preferred: ["storm_chamber", "observation_deck"],
      forbidden: ["entrance"],
    },
  ],
  creaturePool: ["air_elemental", "djinni", "aarakocra", "griffon", "cloud_giant", "storm_giant"],
  trapPool: FLOATING_TRAPS,
  emptyRoomDescriptions: FLOATING_EMPTY_DESCRIPTIONS,
};

// === Master Blueprint Registry ===

export const DUNGEON_BLUEPRINTS: Record<DungeonTheme, DungeonBlueprint> = {
  tomb: TOMB_BLUEPRINT,
  cave: CAVE_BLUEPRINT,
  temple: TEMPLE_BLUEPRINT,
  mine: MINE_BLUEPRINT,
  fortress: FORTRESS_BLUEPRINT,
  sewer: SEWER_BLUEPRINT,
  crypt: CRYPT_BLUEPRINT,
  lair: LAIR_BLUEPRINT,
  shrine: SHRINE_BLUEPRINT,
  bandit_hideout: BANDIT_HIDEOUT_BLUEPRINT,
  cultist_lair: CULTIST_LAIR_BLUEPRINT,
  witch_hut: WITCH_HUT_BLUEPRINT,
  sea_cave: SEA_CAVE_BLUEPRINT,
  beast_den: BEAST_DEN_BLUEPRINT,
  floating_keep: FLOATING_KEEP_BLUEPRINT,
};

// === Room Config Lookup ===

export const THEME_ROOM_CONFIGS: Record<DungeonTheme, ThemeRoomConfig[]> = {
  tomb: TOMB_ROOM_CONFIGS,
  cave: [], // TODO: Add cave room configs
  temple: [], // TODO: Add temple room configs
  mine: [],
  fortress: [],
  sewer: [],
  crypt: [],
  lair: [],
  shrine: [],
  bandit_hideout: [],
  cultist_lair: [],
  witch_hut: [],
  sea_cave: [],
  beast_den: [],
  floating_keep: [],
};

/**
 * Get the blueprint for a dungeon theme.
 */
export function getBlueprint(theme: DungeonTheme): DungeonBlueprint {
  return DUNGEON_BLUEPRINTS[theme];
}

/**
 * Get room configs for a theme.
 */
export function getRoomConfigs(theme: DungeonTheme): ThemeRoomConfig[] {
  return THEME_ROOM_CONFIGS[theme] ?? [];
}
