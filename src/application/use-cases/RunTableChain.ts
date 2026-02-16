import { runTableChain, type ChainResult } from '@domain/services/TableChainRunner'
import { createTableRolledEvent } from '@domain/events/TableRolled'
import type { ITableRepository } from '@application/ports/ITableRepository'
import type { IRollHistoryRepository } from '@application/ports/IRollHistoryRepository'
import type { IEventBus } from '@application/ports/IEventBus'
import type { DiceResult } from '@shared/dice'
import { newId } from '@shared/ulid'

export interface RunTableChainDeps {
  tableRepo: ITableRepository
  rollHistoryRepo: IRollHistoryRepository
  eventBus: IEventBus
  rollDice: (notation: string) => DiceResult
}

export async function executeRunTableChain(
  tableIds: string[],
  worldId: string | undefined,
  deps: RunTableChainDeps
): Promise<ChainResult | null> {
  // Fetch all tables
  const tables = await Promise.all(
    tableIds.map((id) => deps.tableRepo.getTableById(id))
  )
  const validTables = tables.filter((t): t is NonNullable<typeof t> => t != null)
  if (validTables.length === 0) return null

  const chainResult = runTableChain(validTables, deps.rollDice)

  // Persist each roll
  for (const result of chainResult.results) {
    await deps.rollHistoryRepo.create({
      id: newId(),
      worldId: worldId ?? '',
      tableId: result.tableId,
      tableName: result.tableName,
      result: result.entry.text,
      rolls: result.diceResult.rolls,
      total: result.diceResult.total,
      timestamp: Date.now(),
    })

    deps.eventBus.publish(
      createTableRolledEvent(
        result.tableId,
        result.tableName,
        result.entry.text,
        result.diceResult.rolls,
        result.diceResult.total,
        worldId
      )
    )
  }

  return chainResult
}
