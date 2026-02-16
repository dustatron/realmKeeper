import { rollOnTable, type TableResult } from '@domain/services/RandomTableEngine'
import { createTableRolledEvent } from '@domain/events/TableRolled'
import type { ITableRepository } from '@application/ports/ITableRepository'
import type { IRollHistoryRepository } from '@application/ports/IRollHistoryRepository'
import type { IEventBus } from '@application/ports/IEventBus'
import type { DiceResult } from '@shared/dice'
import { newId } from '@shared/ulid'

export interface RollOnTableDeps {
  tableRepo: ITableRepository
  rollHistoryRepo: IRollHistoryRepository
  eventBus: IEventBus
  rollDice: (notation: string) => DiceResult
}

export async function executeRollOnTable(
  tableId: string,
  worldId: string | undefined,
  deps: RollOnTableDeps
): Promise<TableResult | null> {
  const table = await deps.tableRepo.getTableById(tableId)
  if (!table) return null

  const result = rollOnTable(table, deps.rollDice)

  // Persist roll history
  await deps.rollHistoryRepo.create({
    id: newId(),
    worldId: worldId ?? '',
    tableId: table.id,
    tableName: table.name,
    result: result.entry.text,
    rolls: result.diceResult.rolls,
    total: result.diceResult.total,
    timestamp: Date.now(),
  })

  // Publish event
  deps.eventBus.publish(
    createTableRolledEvent(
      table.id,
      table.name,
      result.entry.text,
      result.diceResult.rolls,
      result.diceResult.total,
      worldId
    )
  )

  return result
}
