export interface TableRolledEvent {
  type: 'table_rolled'
  payload: {
    tableId: string
    tableName: string
    resultText: string
    rolls: number[]
    total: number
    realmId?: string
  }
  timestamp: number
}

export function createTableRolledEvent(
  tableId: string,
  tableName: string,
  resultText: string,
  rolls: number[],
  total: number,
  realmId?: string
): TableRolledEvent {
  return {
    type: 'table_rolled',
    payload: { tableId, tableName, resultText, rolls, total, realmId },
    timestamp: Date.now(),
  }
}
