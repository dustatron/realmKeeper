export interface DomainEvent {
  type: string
  payload: Record<string, unknown>
  timestamp: number
}

export interface IEventBus {
  publish(event: DomainEvent): void
  subscribe(eventType: string, handler: (event: DomainEvent) => void): () => void
}
