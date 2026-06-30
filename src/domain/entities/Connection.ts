export type EntityRef = 'npc' | 'faction' | 'poi' | 'item'

export type ConnectionKind =
  | 'parent' | 'child' | 'spouse' | 'sibling' | 'lover'
  | 'rival' | 'enemy' | 'ally'
  | 'debtor' | 'creditor' | 'thief' | 'victim'
  | 'captive_in' | 'hides' | 'wants'
  | 'supplies'

export type ConnectionStatus =
  | 'active' | 'missing' | 'estranged' | 'dead' | 'resolved'

export interface Connection {
  id: string
  worldId: string
  fromType: EntityRef
  fromId: string
  toType: EntityRef
  toId: string
  kind: ConnectionKind
  label: string
  status: ConnectionStatus
  hookId: string | null
  createdAt: number
  updatedAt: number
}
