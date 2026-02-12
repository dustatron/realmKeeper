export interface TableEntry {
  min: number
  max: number
  text: string
  subTableId?: string
}

export interface TableDef {
  id: string
  setId: string
  name: string
  diceFormula: string
  entries: TableEntry[]
  tags: string[]
  systemId: string | null
}

export interface TableSet {
  id: string
  name: string
  source: string
  systemId: string | null
  tableIds: string[]
}
