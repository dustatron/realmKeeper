export interface RelationshipEvent {
  description: string
  scoreDelta: number
  timestamp: number
}

export interface FactionRelationship {
  id: string
  factionId: string
  targetId: string
  score: number
  events: RelationshipEvent[]
  updatedAt: number
}
