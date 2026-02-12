import type { TableDef } from '@domain/entities/TableDef'
import type { DiceResult } from '@shared/dice'
import { rollOnTable, type TableResult } from './RandomTableEngine'

export interface ChainResult {
  results: TableResult[]
  summary: Record<string, string> // tableName -> result text
}

// Takes an ordered array of TableDefs and rolls each in sequence
export function runTableChain(
  tables: TableDef[],
  rollDice: (notation: string) => DiceResult
): ChainResult {
  const results: TableResult[] = []
  const summary: Record<string, string> = {}

  for (const table of tables) {
    const result = rollOnTable(table, rollDice)
    results.push(result)
    summary[table.name] = result.entry.text

    // If the entry references a sub-table, the caller must resolve it
    // (we don't have table lookup here -- that's the use case's job)
  }

  return { results, summary }
}
