export interface RollHistory {
  id: string
  realmId: string
  tableId: string
  tableName: string
  result: string
  rolls: number[]
  total: number
  timestamp: number
}
