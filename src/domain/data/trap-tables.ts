import type { TableDef, TableSet } from '@domain/entities/TableDef'

// ---------------------------------------------------------------------------
// TableSets
// ---------------------------------------------------------------------------

export const trapTableSets: TableSet[] = [
  {
    id: 'tableset-traps',
    name: 'Trap Tables',
    source: 'Cairn 2e Dungeon Seeds',
    systemId: 'cairn-2e',
    tableIds: [
      'table-trap-effect',
      'table-trap-trigger',
    ],
  },
]

// ---------------------------------------------------------------------------
// TableDefs — Cairn 2e Dungeon Seeds SRD
// ---------------------------------------------------------------------------

export const trapTableDefs: TableDef[] = [
  {
    id: 'table-trap-effect',
    setId: 'tableset-traps',
    name: 'Trap Effect',
    diceFormula: '1d20',
    entries: [
      { min: 1, max: 1, text: 'Ages' },
      { min: 2, max: 2, text: 'Burns' },
      { min: 3, max: 3, text: 'Captures' },
      { min: 4, max: 4, text: 'Carries' },
      { min: 5, max: 5, text: 'Confuses' },
      { min: 6, max: 6, text: 'Crushes' },
      { min: 7, max: 7, text: 'Curses' },
      { min: 8, max: 8, text: 'Cuts' },
      { min: 9, max: 9, text: 'Deafens' },
      { min: 10, max: 10, text: 'Drops' },
      { min: 11, max: 11, text: 'Drowns' },
      { min: 12, max: 12, text: 'Freezes' },
      { min: 13, max: 13, text: 'Glues' },
      { min: 14, max: 14, text: 'Hypnotizes' },
      { min: 15, max: 15, text: 'Impales' },
      { min: 16, max: 16, text: 'Infects' },
      { min: 17, max: 17, text: 'Lifts' },
      { min: 18, max: 18, text: 'Poisons' },
      { min: 19, max: 19, text: 'Shocks' },
      { min: 20, max: 20, text: 'Shoots' },
    ],
    tags: ['trap', 'effect'],
    systemId: 'cairn-2e',
  },
  {
    id: 'table-trap-trigger',
    setId: 'tableset-traps',
    name: 'Trap Trigger',
    diceFormula: '1d20',
    entries: [
      { min: 1, max: 1, text: 'Activating' },
      { min: 2, max: 2, text: 'Breaking' },
      { min: 3, max: 3, text: 'Crossing' },
      { min: 4, max: 4, text: 'Disturbing' },
      { min: 5, max: 5, text: 'Entering' },
      { min: 6, max: 6, text: 'Extinguishing' },
      { min: 7, max: 7, text: 'Focusing' },
      { min: 8, max: 8, text: 'Interacting' },
      { min: 9, max: 9, text: 'Lighting' },
      { min: 10, max: 10, text: 'Moving' },
      { min: 11, max: 11, text: 'Opening' },
      { min: 12, max: 12, text: 'Pulling' },
      { min: 13, max: 13, text: 'Pushing' },
      { min: 14, max: 14, text: 'Reading' },
      { min: 15, max: 15, text: 'Speaking' },
      { min: 16, max: 16, text: 'Stepping' },
      { min: 17, max: 17, text: 'Taking' },
      { min: 18, max: 18, text: 'Talking' },
      { min: 19, max: 19, text: 'Touching' },
      { min: 20, max: 20, text: 'Tripping' },
    ],
    tags: ['trap', 'trigger'],
    systemId: 'cairn-2e',
  },
]
