import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { Realm } from '@domain/entities/Realm'

export async function executeUpdateRealm(
  realm: Realm,
  deps: { realmRepo: IRealmRepository }
): Promise<void> {
  await deps.realmRepo.update({ ...realm, updatedAt: Date.now() })
}
