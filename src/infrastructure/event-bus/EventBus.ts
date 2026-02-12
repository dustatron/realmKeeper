import type { DomainEvent, IEventBus } from '@application/ports/IEventBus'

export class EventBus implements IEventBus {
  private listeners = new Map<string, Set<(event: DomainEvent) => void>>()

  publish(event: DomainEvent): void {
    const handlers = this.listeners.get(event.type)
    if (handlers) {
      handlers.forEach((handler) => handler(event))
    }
  }

  subscribe(
    eventType: string,
    handler: (event: DomainEvent) => void
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(handler)
    return () => {
      this.listeners.get(eventType)?.delete(handler)
    }
  }
}
