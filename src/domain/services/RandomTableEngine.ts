import type { TableDef, TableEntry } from '@domain/entities/TableDef'
import type { DiceResult } from '@shared/dice'

export interface TableResult {
  tableId: string
  tableName: string
  entry: TableEntry
  diceResult: DiceResult
}

// Takes a TableDef and a dice roller function (injected, not imported directly to keep domain pure)
export function rollOnTable(
  table: TableDef,
  rollDice: (notation: string) => DiceResult
): TableResult {
  const diceResult = rollDice(table.diceFormula)
  const entry = table.entries.find(
    (e) => diceResult.total >= e.min && diceResult.total <= e.max
  )
  if (!entry) {
    // Fallback to last entry if roll somehow out of range
    const fallback = table.entries[table.entries.length - 1]
    return { tableId: table.id, tableName: table.name, entry: fallback, diceResult }
  }
  return { tableId: table.id, tableName: table.name, entry, diceResult }
}
