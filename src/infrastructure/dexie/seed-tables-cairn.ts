import type { TableSet, TableDef } from '@domain/entities/TableDef'

// ---------------------------------------------------------------------------
// TableSets
// ---------------------------------------------------------------------------

export const cairnTableSets: TableSet[] = [
  {
    id: 'tableset-cairn-npc',
    name: 'Cairn NPC Tables',
    source: 'Cairn 2e',
    systemId: 'system-cairn-2e',
    tableIds: [
      'table-cairn-names-female',
      'table-cairn-names-male',
      'table-cairn-surnames',
    ],
  },
  {
    id: 'tableset-cairn-traits',
    name: 'Cairn Character Traits',
    source: 'Cairn 2e',
    systemId: 'system-cairn-2e',
    tableIds: [
      'table-cairn-trait-physique',
      'table-cairn-trait-skin',
      'table-cairn-trait-hair',
      'table-cairn-trait-face',
      'table-cairn-trait-speech',
      'table-cairn-trait-clothing',
      'table-cairn-trait-virtue',
      'table-cairn-trait-vice',
    ],
  },
  {
    id: 'tableset-cairn-factions',
    name: 'Cairn Faction Tables',
    source: 'Cairn 2e',
    systemId: 'system-cairn-2e',
    tableIds: [
      'table-cairn-faction-type',
      'table-cairn-faction-trait',
      'table-cairn-faction-advantage',
      'table-cairn-faction-agenda',
    ],
  },
  {
    id: 'tableset-cairn-weather',
    name: 'Cairn Weather',
    source: 'Cairn 2e',
    systemId: 'system-cairn-2e',
    tableIds: [
      'table-cairn-weather-spring',
      'table-cairn-weather-summer',
      'table-cairn-weather-fall',
      'table-cairn-weather-winter',
    ],
  },
]

// ---------------------------------------------------------------------------
// Helper — builds numbered entries from a string array
// ---------------------------------------------------------------------------

function entries(items: string[]) {
  return items.map((text, i) => ({ min: i + 1, max: i + 1, text }))
}

// ---------------------------------------------------------------------------
// TableDefs
// ---------------------------------------------------------------------------

export const cairnTableDefs: TableDef[] = [
  // ---- NPC Names ---------------------------------------------------------
  {
    id: 'table-cairn-names-female',
    setId: 'tableset-cairn-npc',
    name: 'Female Names',
    diceFormula: '1d20',
    tags: ['npc', 'name', 'female'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Agune', 'Beatrice', 'Breagan', 'Bronwyn', 'Cannora',
      'Drelda', 'Elgile', 'Esme', 'Gryta', 'Hennie',
      'Lirann', 'Lissette', 'Maniga', 'Morgwen', 'Nora',
      'Oda', 'Orla', 'Pendra', 'Sybil', 'Wenlan',
    ]),
  },
  {
    id: 'table-cairn-names-male',
    setId: 'tableset-cairn-npc',
    name: 'Male Names',
    diceFormula: '1d20',
    tags: ['npc', 'name', 'male'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Arwel', 'Bevan', 'Boroth', 'Borrid', 'Breagle',
      'Breglor', 'Canhoreal', 'Emrys', 'Ethex', 'Gringle',
      'Grinwit', 'Gruwid', 'Hrald', 'Hreldig', 'Loral',
      'Msjin', 'Odgan', 'Sywit', 'Wenlan', 'Wargrim',
    ]),
  },
  {
    id: 'table-cairn-surnames',
    setId: 'tableset-cairn-npc',
    name: 'Surnames',
    diceFormula: '1d20',
    tags: ['npc', 'name', 'surname'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Abernathy', 'Addercap', 'Burl', 'Candlewick', 'Coppercod',
      'Crumwaller', 'Dunswoggle', 'Getri', 'Glass', 'Harkness',
      'Harper', 'Loam', 'Midnocket', 'Oleander', 'Oxhide',
      'Purl', 'Rowan', 'Saddleworth', 'Slitherly', 'Stavish',
    ]),
  },

  // ---- Character Traits --------------------------------------------------
  {
    id: 'table-cairn-trait-physique',
    setId: 'tableset-cairn-traits',
    name: 'Physique',
    diceFormula: '1d10',
    tags: ['trait', 'physique'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Athletic', 'Brawny', 'Flabby', 'Lanky', 'Rugged',
      'Scrawny', 'Short', 'Statuesque', 'Stout', 'Towering',
    ]),
  },
  {
    id: 'table-cairn-trait-skin',
    setId: 'tableset-cairn-traits',
    name: 'Skin',
    diceFormula: '1d10',
    tags: ['trait', 'skin'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Birthmarked', 'Dark', 'Elongated', 'Pockmarked', 'Rosy',
      'Round', 'Soft', 'Tanned', 'Tattooed', 'Weathered',
    ]),
  },
  {
    id: 'table-cairn-trait-hair',
    setId: 'tableset-cairn-traits',
    name: 'Hair',
    diceFormula: '1d10',
    tags: ['trait', 'hair'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Bald', 'Braided', 'Curly', 'Filthy', 'Frizzy',
      'Long', 'Luxurious', 'Oily', 'Wavy', 'Wispy',
    ]),
  },
  {
    id: 'table-cairn-trait-face',
    setId: 'tableset-cairn-traits',
    name: 'Face',
    diceFormula: '1d10',
    tags: ['trait', 'face'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Bony', 'Broken', 'Chiseled', 'Elongated', 'Pale',
      'Perfect', 'Rat-like', 'Sharp', 'Square', 'Sunken',
    ]),
  },
  {
    id: 'table-cairn-trait-speech',
    setId: 'tableset-cairn-traits',
    name: 'Speech',
    diceFormula: '1d10',
    tags: ['trait', 'speech'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Blunt', 'Booming', 'Cryptic', 'Droning', 'Formal',
      'Gravelly', 'Precise', 'Squeaky', 'Stuttering', 'Whispery',
    ]),
  },
  {
    id: 'table-cairn-trait-clothing',
    setId: 'tableset-cairn-traits',
    name: 'Clothing',
    diceFormula: '1d10',
    tags: ['trait', 'clothing'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Antique', 'Bloody', 'Elegant', 'Filthy', 'Foreign',
      'Frayed', 'Frumpy', 'Livery', 'Rancid', 'Soiled',
    ]),
  },
  {
    id: 'table-cairn-trait-virtue',
    setId: 'tableset-cairn-traits',
    name: 'Virtue',
    diceFormula: '1d10',
    tags: ['trait', 'virtue'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Ambitious', 'Cautious', 'Courageous', 'Disciplined', 'Gregarious',
      'Honorable', 'Humble', 'Merciful', 'Serene', 'Tolerant',
    ]),
  },
  {
    id: 'table-cairn-trait-vice',
    setId: 'tableset-cairn-traits',
    name: 'Vice',
    diceFormula: '1d10',
    tags: ['trait', 'vice'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Aggressive', 'Bitter', 'Craven', 'Deceitful', 'Greedy',
      'Lazy', 'Nervous', 'Rude', 'Vain', 'Vengeful',
    ]),
  },

  // ---- Faction Tables ----------------------------------------------------
  {
    id: 'table-cairn-faction-type',
    setId: 'tableset-cairn-factions',
    name: 'Faction Type',
    diceFormula: '1d6',
    tags: ['faction', 'type'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Academic', 'Arcane', 'Cabal', 'Civic', 'Criminal', 'Religious',
    ]),
  },
  {
    id: 'table-cairn-faction-trait',
    setId: 'tableset-cairn-factions',
    name: 'Faction Trait',
    diceFormula: '1d6',
    tags: ['faction', 'trait'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Ambitious', 'Cruel', 'Honorable', 'Pragmatic', 'Resourceful', 'Secretive',
    ]),
  },
  {
    id: 'table-cairn-faction-advantage',
    setId: 'tableset-cairn-factions',
    name: 'Faction Advantage',
    diceFormula: '1d6',
    tags: ['faction', 'advantage'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Alliances', 'Espionage', 'Magical Power', 'Popular Support', 'Vast Resources', 'Wealthy',
    ]),
  },
  {
    id: 'table-cairn-faction-agenda',
    setId: 'tableset-cairn-factions',
    name: 'Faction Agenda',
    diceFormula: '1d6',
    tags: ['faction', 'agenda'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Acquire Territory', 'Destroy Rival', 'Expand Influence', 'Infiltrate', 'Overthrow Power', 'Protect Secret',
    ]),
  },

  // ---- Weather -----------------------------------------------------------
  {
    id: 'table-cairn-weather-spring',
    setId: 'tableset-cairn-weather',
    name: 'Spring Weather',
    diceFormula: '1d6',
    tags: ['weather', 'spring'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Gentle rain', 'Mild and breezy', 'Overcast', 'Clear skies', 'Warm and sunny', 'Thunderstorm',
    ]),
  },
  {
    id: 'table-cairn-weather-summer',
    setId: 'tableset-cairn-weather',
    name: 'Summer Weather',
    diceFormula: '1d6',
    tags: ['weather', 'summer'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Scorching heat', 'Clear and hot', 'Humid and still', 'Afternoon storms', 'Warm breeze', 'Drought conditions',
    ]),
  },
  {
    id: 'table-cairn-weather-fall',
    setId: 'tableset-cairn-weather',
    name: 'Fall Weather',
    diceFormula: '1d6',
    tags: ['weather', 'fall'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Cool and crisp', 'Fog and mist', 'Light rain', 'Windy', 'Overcast', 'Early frost',
    ]),
  },
  {
    id: 'table-cairn-weather-winter',
    setId: 'tableset-cairn-weather',
    name: 'Winter Weather',
    diceFormula: '1d6',
    tags: ['weather', 'winter'],
    systemId: 'system-cairn-2e',
    entries: entries([
      'Bitter cold', 'Heavy snow', 'Freezing rain', 'Clear and frigid', 'Blizzard', 'Sleet',
    ]),
  },
]
