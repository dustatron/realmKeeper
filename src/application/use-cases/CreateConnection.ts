import type { IConnectionRepository } from '@application/ports/IConnectionRepository'
import type {
  Connection, EntityRef, ConnectionKind, ConnectionStatus,
} from '@domain/entities/Connection'
import { newId } from '@shared/ulid'

export interface CreateConnectionInput {
  worldId: string
  fromType: EntityRef
  fromId: string
  toType: EntityRef
  toId: string
  kind: ConnectionKind
  label?: string
  status?: ConnectionStatus
  hookId?: string | null
}

export async function executeCreateConnection(
  input: CreateConnectionInput,
  deps: { connectionRepo: IConnectionRepository }
): Promise<Connection> {
  const now = Date.now()
  const connection: Connection = {
    id: newId(),
    worldId: input.worldId,
    fromType: input.fromType,
    fromId: input.fromId,
    toType: input.toType,
    toId: input.toId,
    kind: input.kind,
    label: input.label ?? '',
    status: input.status ?? 'active',
    hookId: input.hookId ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await deps.connectionRepo.create(connection)
  return connection
}
