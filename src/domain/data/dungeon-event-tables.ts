import type { TableDef, TableSet } from '@domain/entities/TableDef'

// ---------------------------------------------------------------------------
// TableSets
// ---------------------------------------------------------------------------

export const dungeonEventTableSets: TableSet[] = [
  {
    id: 'tableset-dungeon-events',
    name: 'Dungeon Event Tables',
    source: 'Cairn 2e',
    systemId: 'cairn-2e',
    tableIds: [
      'table-dungeon-event',
      'table-monster-activity',
      'table-npc-reaction',
    ],
  },
]

// ---------------------------------------------------------------------------
// TableDefs — Cairn 2e SRD
// ---------------------------------------------------------------------------

export const dungeonEventTableDefs: TableDef[] = [
  {
    id: 'table-dungeon-event',
    setId: 'tableset-dungeon-events',
    name: 'Dungeon Events',
    diceFormula: '1d6',
    entries: [
      { min: 1, max: 1, text: 'Encounter' },
      { min: 2, max: 2, text: 'Sign' },
      { min: 3, max: 3, text: 'Environment' },
      { min: 4, max: 4, text: 'Loss' },
      { min: 5, max: 5, text: 'Exhaustion' },
      { min: 6, max: 6, text: 'Quiet' },
    ],
    tags: ['dungeon', 'event'],
    systemId: 'cairn-2e',
  },
  {
    id: 'table-monster-activity',
    setId: 'tableset-dungeon-events',
    name: 'Monster Activity',
    diceFormula: '1d20',
    entries: [
      { min: 1, max: 1, text: 'Building' },
      { min: 2, max: 2, text: 'Devouring' },
      { min: 3, max: 3, text: 'Dying' },
      { min: 4, max: 4, text: 'Fighting' },
      { min: 5, max: 5, text: 'Growing' },
      { min: 6, max: 6, text: 'Haunting' },
      { min: 7, max: 7, text: 'Hiding' },
      { min: 8, max: 8, text: 'Killing' },
      { min: 9, max: 9, text: 'Mating' },
      { min: 10, max: 10, text: 'Mourning' },
      { min: 11, max: 11, text: 'Patrolling' },
      { min: 12, max: 12, text: 'Praying' },
      { min: 13, max: 13, text: 'Protecting' },
      { min: 14, max: 14, text: 'Recuperating' },
      { min: 15, max: 15, text: 'Scheming' },
      { min: 16, max: 16, text: 'Sleeping' },
      { min: 17, max: 17, text: 'Stalking' },
      { min: 18, max: 18, text: 'Torturing' },
      { min: 19, max: 19, text: 'Training' },
      { min: 20, max: 20, text: 'Trapped' },
    ],
    tags: ['dungeon', 'monster', 'activity'],
    systemId: 'cairn-2e',
  },
  {
    id: 'table-npc-reaction',
    setId: 'tableset-dungeon-events',
    name: 'NPC Reaction',
    diceFormula: '2d6',
    entries: [
      { min: 2, max: 2, text: 'Hostile' },
      { min: 3, max: 5, text: 'Wary' },
      { min: 6, max: 8, text: 'Curious' },
      { min: 9, max: 11, text: 'Kind' },
      { min: 12, max: 12, text: 'Helpful' },
    ],
    tags: ['dungeon', 'reaction'],
    systemId: 'cairn-2e',
  },
]
