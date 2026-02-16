import type { TableDef, TableSet } from '@domain/entities/TableDef'

// ---------------------------------------------------------------------------
// TableSets
// ---------------------------------------------------------------------------

export const treasureTableSets: TableSet[] = [
  {
    id: 'tableset-treasure',
    name: 'Treasure Tables',
    source: 'System Agnostic',
    systemId: null,
    tableIds: [
      'table-treasure-gold',
      'table-treasure-gems',
      'table-treasure-valuables',
    ],
  },
]

// ---------------------------------------------------------------------------
// TableDefs
// ---------------------------------------------------------------------------

export const treasureTableDefs: TableDef[] = [
  {
    id: 'table-treasure-gold',
    setId: 'tableset-treasure',
    name: 'Gold',
    diceFormula: '1d20',
    entries: [
      // 1-5: small amounts
      { min: 1, max: 1, text: '2d6 copper pieces' },
      { min: 2, max: 2, text: '1d10 copper pieces' },
      { min: 3, max: 3, text: '3d6 copper pieces' },
      { min: 4, max: 4, text: '1d6 silver pieces' },
      { min: 5, max: 5, text: '2d6 silver pieces' },
      // 6-10: moderate
      { min: 6, max: 6, text: '3d6 silver pieces' },
      { min: 7, max: 7, text: '5d6 silver pieces' },
      { min: 8, max: 8, text: '1d6 gold pieces' },
      { min: 9, max: 9, text: '2d6 gold pieces' },
      { min: 10, max: 10, text: '3d6 gold pieces' },
      // 11-15: good
      { min: 11, max: 11, text: '4d6 gold pieces' },
      { min: 12, max: 12, text: '5d6 gold pieces' },
      { min: 13, max: 13, text: '1d6 \u00d7 10 gold pieces' },
      { min: 14, max: 14, text: '2d6 \u00d7 10 gold pieces' },
      { min: 15, max: 15, text: '3d6 \u00d7 10 gold pieces' },
      // 16-20: jackpot
      { min: 16, max: 16, text: '4d6 \u00d7 10 gold pieces' },
      { min: 17, max: 17, text: '1d4 \u00d7 100 gold pieces' },
      { min: 18, max: 18, text: '1d6 \u00d7 100 gold pieces' },
      { min: 19, max: 19, text: '2d4 \u00d7 100 gold pieces' },
      { min: 20, max: 20, text: '2d6 \u00d7 100 gold pieces' },
    ],
    tags: ['treasure', 'gold'],
    systemId: null,
  },
  {
    id: 'table-treasure-gems',
    setId: 'tableset-treasure',
    name: 'Gems & Jewels',
    diceFormula: '1d12',
    entries: [
      { min: 1, max: 1, text: 'Quartz (10 gp)' },
      { min: 2, max: 2, text: 'Turquoise (10 gp)' },
      { min: 3, max: 3, text: 'Onyx (50 gp)' },
      { min: 4, max: 4, text: 'Garnet (100 gp)' },
      { min: 5, max: 5, text: 'Jade (100 gp)' },
      { min: 6, max: 6, text: 'Pearl (100 gp)' },
      { min: 7, max: 7, text: 'Topaz (500 gp)' },
      { min: 8, max: 8, text: 'Opal (500 gp)' },
      { min: 9, max: 9, text: 'Sapphire (1,000 gp)' },
      { min: 10, max: 10, text: 'Emerald (1,000 gp)' },
      { min: 11, max: 11, text: 'Diamond (1,000 gp)' },
      { min: 12, max: 12, text: 'Crown Jewel (10,000 gp)' },
    ],
    tags: ['treasure', 'gems'],
    systemId: null,
  },
  {
    id: 'table-treasure-valuables',
    setId: 'tableset-treasure',
    name: 'Valuable Objects',
    diceFormula: '1d20',
    entries: [
      { min: 1, max: 1, text: 'Silver ring (5 gp)' },
      { min: 2, max: 2, text: 'Bronze figurine (10 gp)' },
      { min: 3, max: 3, text: 'Ornate dagger (15 gp)' },
      { min: 4, max: 4, text: 'Ivory comb (25 gp)' },
      { min: 5, max: 5, text: 'Silver chalice (30 gp)' },
      { min: 6, max: 6, text: 'Embroidered silk scarf (40 gp)' },
      { min: 7, max: 7, text: 'Gold holy symbol (50 gp)' },
      { min: 8, max: 8, text: 'Silver mirror (75 gp)' },
      { min: 9, max: 9, text: 'Platinum ring (100 gp)' },
      { min: 10, max: 10, text: 'Gold necklace (150 gp)' },
      { min: 11, max: 11, text: 'Jeweled brooch (200 gp)' },
      { min: 12, max: 12, text: 'Masterwork painting (250 gp)' },
      { min: 13, max: 13, text: 'Golden goblet (300 gp)' },
      { min: 14, max: 14, text: 'Electrum tiara (400 gp)' },
      { min: 15, max: 15, text: 'Gilded scepter (500 gp)' },
      { min: 16, max: 16, text: 'Jeweled crown (750 gp)' },
      { min: 17, max: 17, text: 'Gold idol (1,000 gp)' },
      { min: 18, max: 18, text: 'Ancient reliquary (1,500 gp)' },
      { min: 19, max: 19, text: 'Bejeweled scepter (2,500 gp)' },
      { min: 20, max: 20, text: 'Royal regalia set (5,000 gp)' },
    ],
    tags: ['treasure', 'valuables'],
    systemId: null,
  },
]
