// Import all 27 rooms from The Undercity of TETSU-7
// Paste into browser console at localhost:3000

(async () => {
  const rk = window.__realmKeeper
  if (!rk) { console.error('Dev API not available'); return }

  const parentId = '01KHMTP3KVEHVBZQ7YWWH4PM7Z'
  const parent = await rk.pois.get(parentId)
  if (!parent) { console.error('Parent POI not found:', parentId); return }
  const regionId = parent.regionId
  console.log('Adding rooms to:', parent.name, '| Region:', regionId)

  const rooms = [
    {
      name: '1. Entry Atrium',
      type: 'interior',
      subtypeLabel: 'Atrium',
      tags: ['dungeon-room', 'npc', 'hidden'],
      readAloud: 'Faded murals of nakudama in ceremonial poses line the walls, bowing before a towering machine. Concrete pillars wrapped in dead cables and defunct speakers support the ceiling.',
      gmNotes: `**Murals.** Nakudama officials presenting offerings to a massive automaton. The machine resembles TETSU-7.
- *Hidden Panel.* Behind mural. First Age access badge (opens doors in Areas 5, 12, works on vending machines).

**Trapped AHA Member.** Copper, elderly volunteer (cataloger, knows relic locations). Hides behind northeast pillar. Whispers warnings about the "bronze giant" and points toward Area 4 where fish folk grabbed another researcher.
- *Knows:* Frond retreated to Area 16. Others scattered. The machine comes from the center.`,
    },
    {
      name: '2. Crystal Cave',
      type: 'natural',
      subtypeLabel: 'Cave',
      tags: ['dungeon-room', 'hazard', 'ambush', 'treasure'],
      readAloud: 'Smooth quartz formations embedded in the walls glitter—an old subway tunnel breached the complex here. 1d6 white bundles, human-sized and wrapped in organic webbing, lie in the center of the room.',
      gmNotes: `**Crystals.** Dazzlingly reflective. DC 12 DEX when entering with bright light or blinded for 1d4 rounds (fish folk wear tinted goggles, unaffected).

**Fish Folk Ambush.** If alarm raised in Area 1, three fish folk from Area 4 cling to 20' ceiling.

**White Bundles.** Five tanuki wrapped in fish folk netting. 1:6 chance one still lives. A **Ticket** to the Wandering Line hidden in one's cheek pouch.`,
    },
    {
      name: '3. Flooded Maintenance Tunnel',
      type: 'interior',
      subtypeLabel: 'Tunnel',
      tags: ['dungeon-room', 'hazard', 'hidden', 'treasure'],
      readAloud: 'Knee-deep murky water fills this tunnel. Thick algae coats the walls and floor. Rusted pipes run along the ceiling.',
      gmNotes: `**Water.** Cold, murky. DC 12 STR to move quickly each round. Submerged hazards: 1:6 chance of cutting foot on debris (1d4 damage).
- *Waterproof Case.* Lodged in pipes, 10' in. Contains dry Cassette Scroll of Hold Portal.

**Hidden Passage.** Concealed by algae curtain. Fish folk clear it each time they pass.
- *Bubbling.* Listeners hear hushed clicking speech from Area 4.`,
    },
    {
      name: '4. Fish Folk Forward Camp',
      type: 'interior',
      subtypeLabel: 'Camp',
      tags: ['dungeon-room', 'faction', 'fish-folk', 'npc', 'treasure'],
      readAloud: 'Six blue-scaled humanoids with bulging eyes and gill slits argue in clicking language over salvage rights. The cramped alcove is filled with netting and equipment. First Age scrap piles on the floor alongside one intact device. Three flooded shaft connections line the low ceiling.',
      gmNotes: `**Fish Folk.** Six total. Three go to Area 2 if alarm raised. Hostile to surface-dwellers. Might parlay if offered First Age tech worth reporting to Lionfish King. Escape through ceiling shafts if outmatched.
- *NPCs.* Sergeant Kira (scarred, disciplined), Mako (young, eager), Fin (old, cynical), Gill (nervous, complains), Coral (silent, watches), Urchin (spiny protrusions, violent).

**Salvage.** Pile of junk plus one valuable find: Portable cassette player (functions as spellbook if loaded with cassette scrolls).
- *Details.* 60 gp worth of salvage, 2 subway tokens (15 gp each to collectors), bent bicycle wheel (worthless), kei truck mirror (intact, 10 gp), waterproof flashlight (30 gp, works).`,
    },
    {
      name: '5. Locker Room',
      type: 'interior',
      subtypeLabel: 'Locker Room',
      tags: ['dungeon-room', 'treasure'],
      readAloud: 'A skeleton is pinned to the lockers by a bronze javelin through its ribcage, hands frozen mid-reach. Dented metal lockers with faded name plates line the walls. Ancient work uniforms hang on hooks.',
      gmNotes: `**Skeleton.** Wears decayed First Age jumpsuit. ID badge clipped to chest reads "MAINTENANCE - LEVEL 3."
- *Javelin.* Launched with mechanical force. Bronze, still functional as weapon.

**Lockers.** Four functional. Musty clothes, dead batteries. Access badge to Area 21 in one (requires DC 12 to find or the badge from Area 1).

**Uniforms.** Three intact. Wearing one: fish folk might mistake you for "authorized" for 1 round. TETSU-7 ignores you for 1d4 rounds before recalibrating.`,
    },
    {
      name: '6. Decontamination Chamber',
      type: 'interior',
      subtypeLabel: 'Chamber',
      tags: ['dungeon-room', 'trap', 'hazard'],
      readAloud: 'A wall-mounted nozzle array points at a metal grate floor. A control panel with buttons and switches sits dark and silent until touched.',
      gmNotes: `**Nozzles.** Pressing the green button causes scalding steam burst (DC 12 DEX or 1d4 damage). Red button: cold water spray (harmless but loud—roll encounter check).

**Grate.** Drainage below. DC 15 STR to lift.
- *Beneath Grate.* Accumulated 1:6 chance of disturbing a sewer crawler nest (1d4 giant centipedes).`,
    },
    {
      name: '7. Turret Alcove A',
      type: 'interior',
      subtypeLabel: 'Alcove',
      tags: ['dungeon-room', 'trap', 'treasure'],
      readAloud: 'A recessed alcove holds a bronze mechanical arm mounted on the ceiling. A sensor lens glows faint red. The 15-foot-high corridor bears blast marks and old stains on the opposite wall.',
      gmNotes: `**Turret.** Motion-activated security system. 3:6 chance/round it activates and fires bronze darts down corridor (ignores TETSU-7). DC 15 DEX or 2d6 damage. Resets after 1 round.
- *Power Core.* Glowing crystal embedded in turret housing. Removing (AC 20, HP 3) deactivates turret. Crystal worth 80 gp, or can power other First Age devices for 1 week.`,
    },
    {
      name: '8. Offering Alcoves',
      type: 'interior',
      subtypeLabel: 'Alcoves',
      tags: ['dungeon-room', 'interactive'],
      readAloud: 'Small shelves line the alcoves, each holding a vending machine button panel salvaged from larger machines.',
      gmNotes: `**Panels.** Six, each with different drink symbols. Placing a subway token on any panel causes it to dispense a First Age beverage can.
- *Beverages.* Roll d6: 1-2 soda (heals 1d4 HP, carbonated magic), 3-4 empty/flat, 5 energy drink (+2 to next roll, then crash: -2 to following roll), 6 spoiled (1d4 poison damage, DC 12 CON negates).`,
    },
    {
      name: '9. Pillar Chamber',
      type: 'interior',
      subtypeLabel: 'Chamber',
      tags: ['dungeon-room', 'trap', 'treasure', 'magic-item'],
      readAloud: 'Four pairs of metal columns pulse with lights in sequence. A blue-scaled humanoid lies facedown halfway across the room. Beyond the pillars, a bronze rod is embedded in a black console.',
      gmNotes: `**Pillars.** Walking between each pair activates security countermeasure. Returning past deactivates. In order from north to south:
- *Red Pulse.* Electrical surge. 1d4 damage/round to anyone carrying metal.
- *Blue Pulse.* Flash-freeze mist. DC 12 CON or movement halved.
- *Green Pulse.* Toxic gas. DC 12 CON each round or lose turn coughing.
- *Purple Pulse.* Sensory overload. Blinded and deafened.

**Body.** Fish folk scout. Burn marks. Frost on scales. Clawed at own ears.

**Bronze Rod.** DC 12 STR to pull from console. +1 mace called **COMPLIANCE**. On critical hit, target is stunned for 1 round.`,
    },
    {
      name: '10. Turret Alcove B',
      type: 'interior',
      subtypeLabel: 'Alcove',
      tags: ['dungeon-room', 'trap', 'treasure'],
      readAloud: 'Another recessed turret alcove, identical to others in the complex. A collapsed figure is impaled on a bronze dart.',
      gmNotes: `**Turret.** As Area 7. Collapsed dead impaled on dart conceals power crystal.`,
    },
    {
      name: '11. Barricaded Storage',
      type: 'interior',
      subtypeLabel: 'Storage',
      tags: ['dungeon-room', 'undead', 'locked'],
      readAloud: 'A heavy metal door, cold to touch. Scratching sounds come from inside.',
      gmNotes: `**Door.** Locked, barricaded from inside. DC 18 STR to force.
- *Listening.* Faint shuffling and clicking.
- *Peering Through Gap.* Darkness, occasional sparking light.

**Inside.** Four collapsed dead (ancient maintenance workers in jumpsuits) shuffle around, tangled in old cables anchored to the floor. Four bronze javelins braced through door handle (break if door forced).
- *Walls.* Scratched in old Common: "DAY 47. TETSU STILL PATROLS. DOOR HOLDS." Tally marks fade into darkness.`,
    },
    {
      name: '12. Equipment Storage',
      type: 'interior',
      subtypeLabel: 'Storage',
      tags: ['dungeon-room', 'undead', 'treasure', 'magic-item'],
      readAloud: 'Scattered remains litter the floor—ancient jumpsuits, shattered helmets, dropped tools. A bicycle handlebar sticks out of rubble near the wall. Collapsed metal racks lean against each other.',
      gmNotes: `**Remains.** Twelve skeletons in work clothes. Several crushed flat—earthquake victims.
- *Disturbing Remains.* Cumulative 1:12 chance one rises as wight (once only). Otherwise, skeleton stirs, then crumbles.
- *Treasure.* The wight wears a First Age Digital Watch of Protection (as Scarab of Protection: DC 18 CON to survive death, once per day).

**Shelves.** Intact flashlight (dead battery), three bronze javelins, hard hat.

**Bicycle.** Buried, but extractable with 10 minutes work. Functional with DC 13 repair check. Worth 40 gp to Granny Yuzu.

**Tanuki.** Three listen from Area 14. Loud/destructive PCs shift their attitude one step hostile.`,
    },
    {
      name: '13. Turret Alcove C',
      type: 'interior',
      subtypeLabel: 'Alcove',
      tags: ['dungeon-room', 'trap', 'treasure'],
      readAloud: 'A ceiling-mounted turret alcove, similar to others found throughout the complex. Scattered coins glint on the floor.',
      gmNotes: `**Turret.** As Area 7. 40 gp in dropped coins scattered at turret base.`,
    },
    {
      name: '14. Hidden Maintenance Corridor',
      type: 'interior',
      subtypeLabel: 'Corridor',
      tags: ['dungeon-room', 'tanuki', 'npc', 'hidden'],
      readAloud: 'A narrow, silent corridor with stale recycled air. An eye-watering musk and old food smell pervades. Insect husks and crumbs scatter the floor.',
      gmNotes: `**Tanuki.** Three. Scruffy fur, nervous eyes. Each stands by one hidden door, listening. Regroup here if PCs enter. If PCs are noisy, attitude shifts hostile.
- *NPCs.* Pompoko (round, suspicious), Bunta (young, curious), Shinobu (scarred ear, gruff). Speak in harsh whispers. Flinch at loud sounds.

**Hidden Doors.** All visible from this side. Pressure-release panels.`,
    },
    {
      name: '15. Vending Machine Alcove',
      type: 'interior',
      subtypeLabel: 'Alcove',
      tags: ['dungeon-room', 'interactive', 'treasure'],
      readAloud: 'Three First Age vending machines stand dark and silent, with various buttons, coin slots, and faded product images. The air is stale with a faint chemical smell. A scratched kanji warning marks the south door.',
      gmNotes: `**Machines.** Mostly non-functional. Each has 1d6 functional buttons.
- *Using Machine.* Insert coin/token, press button. 1:6 chance of explosion from internal malfunction (DC 12 DEX or 1d4 damage, possible chain reaction if machines adjacent).
- *Treasure.* Cumulative 1:20 chance of dispensing a Cube of Cubes (wondrous item, puzzle cube) per button pressed.

**South Door.** Scratched in Common: "REST IN PEACE - ORWYN THE YOUNGER. DON'T OPEN."`,
    },
    {
      name: '16. Shrine Alcove',
      type: 'shrine',
      subtypeLabel: 'Shrine',
      tags: ['dungeon-room', 'npc', 'key-npc'],
      readAloud: 'Small altars sit in each alcove with dead emergency candles. Faded murals depict workers bowing before machines, offering coins and tokens.',
      gmNotes: `**Altars.** Worn metal. Placing food, coins, or a subway token grants a Luck Token (once per character).

**Trapped AHA Member.** Dr. Zalia Frond herself (practical, exhausted, dirt-stained goggles). Hides behind southeast altar with two other survivors.
- *Frond Knows:* TETSU-7's patrol patterns, that the tanuki might help, that the fish folk are hostile. She wants to evacuate survivors first, then properly explore. Will pay 200 gp for rescue, more for artifacts recovered.`,
    },
    {
      name: '17. Crushed Turret',
      type: 'interior',
      subtypeLabel: 'Corridor',
      tags: ['dungeon-room', 'treasure'],
      readAloud: 'A ceiling-mounted turret lies smashed flat against a cracked wall. A body is pinned between the turret and the wall.',
      gmNotes: `**Turret.** Destroyed in structural collapse. Power crystal shattered (fragments worth 15 gp total).

**Body.** Young nakudama in ancient ceremonial robes. Carried bronze short sword and a cracked shell-shield.
- *Satchel.* Waterproof flashlight (works), 10 bronze spikes, 60' rope, withered fruit, and a tiny painting of a nakudama village on a ceramic tile (historical value, 20 gp to AHA).`,
    },
    {
      name: '18. Central Atrium (Charging Station)',
      type: 'interior',
      subtypeLabel: 'Atrium',
      tags: ['dungeon-room', 'boss', 'tetsu-7', 'treasure', 'magic-item'],
      readAloud: 'A 12-foot-tall bronze automaton sits dormant on a raised platform connected to cables and conduits, its red sensor eye dark. The open atrium reaches to upper levels. Cracked concrete floor scattered with bones and debris. Support columns, some crumbling, cast deep shadows.',
      gmNotes: `**TETSU-7.** 3:6 chance of being present and active. If not, cumulative 1:6 chance per round it returns from patrol. Bronze chassis scarred, one arm ends in a crushing claw, the other in a First Age plasma cutter (counts as +1 greataxe called **PACIFIER**; wielder deals x4 damage on critical).
- *The Spirit Within.* Nakudama Officer Yomei, merged with the machine during a failed evacuation. Insane from centuries of isolation. Occasionally speaks through crackling speakers: "EVACUATION CANCELED. FACILITY SECURED. REMAIN CALM."
- *Deactivation Options.* Control panel on platform (DC 15 to operate, requires access badge from Area 5 or 21). Exorcism of the spirit (DC 16 WIS-based, requires speaking to Yomei and convincing them the crisis is over). Destroying the core (HP 30, AC 16).

**Platform.** Ritual circle scratched into metal beneath charging cables. Nakudama glyphs.
- *Studying Glyphs.* DC 14 INT: This was an emergency soul-binding, trapping a dying operator in the machine. References "secondary vault" and "Oghmai protocols."

**Debris.** Crushed equipment, earthquake rubble.
- *Treasure.* Each round spent sifting reveals one of:
1. First Age hard hat with built-in lamp (20 gp, functional)
2. Bag of 60 gp in old coins (historical value doubles it to AHA)
3. Cassette Scroll of Burning Hands in a waterproof case
4. Bronze short sword with moon-phase pommel (silvered, 30 gp)`,
    },
    {
      name: '19. Mural Corridor',
      type: 'interior',
      subtypeLabel: 'Corridor',
      tags: ['dungeon-room', 'npc', 'tanuki', 'hidden', 'treasure'],
      readAloud: 'A scruffy tanuki lies sprawled facedown with a small cloth bundle near its paw. Carved reliefs showing nakudama history line the walls.',
      gmNotes: `**Tanuki NPC.** Chibi (small, anxious). Fell and knocked himself out fleeing a noise. Wakes in 1d4 rounds.
- *Traits.* Younger sibling of tanuki leader Gonpachi (Area 23). Desperately wants approval. Naively loyal.
- *Cloth Bundle.* Two dead beetles, carefully wrapped. A gift for Gonpachi.

**Carvings.** Scenes of nakudama building the First Age infrastructure, machines and workers together.
- *Hidden Panel.* Behind carving of a vending machine. Contains First Age headphones (worth 15 gp, or can be used by wizards for spellcasting).`,
    },
    {
      name: '20. Camouflage Room',
      type: 'interior',
      subtypeLabel: 'Room',
      tags: ['dungeon-room', 'hazard', 'monster'],
      readAloud: 'The floor is a mosaic of orange, red, and brown tiles in a swirling pattern.',
      gmNotes: `**Mosaic.** Pattern camouflages a sludge ooze (corrupted vending machine soda, mutated by centuries). 3:6 chance of stepping on it without careful inspection. Tastes faintly of grape.`,
    },
    {
      name: '21. Control Room',
      type: 'interior',
      subtypeLabel: 'Control Room',
      tags: ['dungeon-room', 'locked', 'treasure', 'magic-item', 'lore'],
      readAloud: 'A heavy metal door with a keypad beside it, marked with warning symbols.',
      gmNotes: `**Door.** Requires access badge from Area 5 or 12. Keypad still works—wrong code (1:6 chance per attempt) triggers alarm (encounter check with -4 penalty).

**Inside.** Control consoles, one intact chair with skeleton (not undead) still seated. Headphones around skull. Screens show static.
- *Skeleton.* Nakudama operator. Wears gold-inlaid headphones (60 gp, magical: wielder can hear TETSU-7 from 100' away). Hands rest on +1 bronze dagger called **AUTHORIZED**. Wielder cannot be detected by First Age security systems (turrets ignore them).
- *Consoles.* Records in First Age language. DC 14 INT to decipher: manifests for "Secondary Vault 7 - OGHMAI PROTOCOL," evacuation logs, final entry: "TETSU-7 non-responsive. Officer Yomei attempting manual override. Emperor preserve us."`,
    },
    {
      name: '22. Collapsed Subway Access',
      type: 'interior',
      subtypeLabel: 'Tunnel',
      tags: ['dungeon-room', 'exploration', 'treasure'],
      readAloud: 'Narrow maintenance passages with 20-foot ceilings lost in darkness. Hot, stale air. Rubble and sand cover the floor.',
      gmNotes: `**Rubble.** Collapsed subway tunnel. Could be cleared with effort (8 hours work, or explosives). Leads to Yatamon Station proper and potentially the greater subway network.

**Dead-Ends.** Clusters of ancient vending machines, smashed or dark.
- *Functional Machines.* 1d6 per dead-end. Each has 1d4 gp worth of ancient coins inside. Taking coins: 1:20 chance of activating a spirit alarm (ghostly wailing, encounter check).`,
    },
    {
      name: '23. Tanuki Warren',
      type: 'interior',
      subtypeLabel: 'Warren',
      tags: ['dungeon-room', 'faction', 'tanuki', 'npc', 'key-npc'],
      readAloud: 'Fifteen tanuki in various forms—some fox-like, some humanoid, some just big fuzzy balls with eyes—eat beetles and whisper. One lounges on a pile of old First Age magazines. The cramped space is messy, scattered with shiny junk. The musk and old food smell is overpowering.',
      gmNotes: `**Tanuki.** Hostile toward noisemakers. Superstitious about TETSU-7 ("the Bronze Demon") and believe it guards the only exit.
- *NPCs.* Gonpachi (large, lazy, clever leader). Minions: Tantan (wiry, paranoid), Ponzu (eyes too big, agrees with everything), Hachi (obsessive planner, schemes constantly).
- *Alliance.* Gonpachi wants TETSU-7 destroyed so his people can finally leave. Will send his annoying brother Chibi (Area 19) and non-favorites into danger to "help." Knows all hidden doors, patrol patterns.

**Hidden Doors.** All visible from this side. A tanuki guards each.`,
    },
    {
      name: '24. Forward Watch Post',
      type: 'interior',
      subtypeLabel: 'Watch Post',
      tags: ['dungeon-room', 'tanuki', 'npc'],
      readAloud: 'Two tanuki in humanoid form stand with ears twitching, listening at doors. The space is cluttered with silent warning bells and stolen First Age gadgets.',
      gmNotes: `**NPCs.** Momo (young, earnest, wants to be brave), Kuro (missing ear, disciplined). If PCs are noisy, attitude shifts hostile.

**Hidden Doors.** All visible from this side.`,
    },
    {
      name: '25. Security Armory',
      type: 'interior',
      subtypeLabel: 'Armory',
      tags: ['dungeon-room', 'trap', 'treasure'],
      readAloud: 'Five sets of bronze-reinforced armor stand on racks—ancient security uniforms. A dust-covered cabinet holds bronze weapons. Blast marks and old damage scar the walls.',
      gmNotes: `**Armor.** Touching armor or taking weapon causes three suits to animate (animated armor) and attack for 1d4 rounds, then collapse.

**Cabinet.** Five short swords, javelins, and riot shields (as regular shields with +1 to saves vs. being knocked down).`,
    },
    {
      name: '26. Hall of Operators',
      type: 'interior',
      subtypeLabel: 'Hall',
      tags: ['dungeon-room', 'trap', 'lore', 'tetsu-7'],
      readAloud: 'Bronze plaques with portrait reliefs line the alcoves. Offerings are placed before each one.',
      gmNotes: `**Plaques.** Nakudama operators who served here. Similar features—family lineage. Each has a ceremonial item before them.
- *Inscriptions.* In old Common: "Supervisor Akemi, First of the Line" (bronze baton), "Operator Hiroto, Keeper of Protocols" (bronze key ring), "Officer Yomei, Last of the Line" (empty—Yomei is in TETSU-7).
- *Offerings.* Trapped. Touching any item causes the plaque's eyes to glow and a dart to fire (+5 attack, 1d6 damage).
- *Yomei's Plaque.* Placing an offering here (any valuable) causes TETSU-7 to pause for 1 round if within sight, speakers crackling: "...thank you..."`,
    },
    {
      name: '27. Flooded Ritual Chamber',
      type: 'interior',
      subtypeLabel: 'Chamber',
      tags: ['dungeon-room', 'hazard', 'treasure', 'magic-item', 'lore'],
      readAloud: 'A cold, damp chamber with a 30-foot ceiling. Water drips from pipes above. A murky pool fills a depression in the floor, dark and still. The air smells of machine oil and something older.',
      gmNotes: `**Spirits.** Dozen flickering forms—past workers, nakudama officials—hover at the edge of light. If light goes out, they descend shrieking (1d8 damage/round to each character).

**Pool.** 15' deep. Cursed runoff from centuries of spirit activity. DC 12 CON for each round of contact or temporarily lose 1 WIS (heals after rest). At 0 WIS, catatonic.
- *At Bottom.* Graveyard of bones (workers who didn't escape), rusted equipment. Among them: 200 gp in old coins, a Cassette Wand of Blind/Deafen, three bronze tanuki statuettes (15 gp each, one is hollow and contains a subway map showing connection to Gomura Subway), Boots of the Cat, and a sealed jar containing the dormant echo of a First Age city-spirit named MURA who knows the location of Gomura's heart.`,
    },
  ]

  console.log(`Creating ${rooms.length} rooms...`)
  const results = []

  for (const room of rooms) {
    try {
      const poi = await rk.pois.add({
        regionId,
        parentPoiId: parentId,
        ...room,
      })
      results.push({ name: room.name, id: poi.id, status: 'ok' })
      console.log(`  ✓ ${room.name}`)
    } catch (e) {
      results.push({ name: room.name, status: 'error', error: e.message })
      console.error(`  ✗ ${room.name}:`, e.message)
    }
  }

  const ok = results.filter(r => r.status === 'ok').length
  const fail = results.filter(r => r.status === 'error').length
  console.log(`\nDone: ${ok} created, ${fail} failed`)
  console.table(results)
})()
