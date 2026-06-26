import type { IRealmRepository } from '@application/ports/IRealmRepository'
import { executeDeleteRealm } from './DeleteRealm'

export async function executeDeleteRealms(
  worldIds: string[],
  deps: { realmRepo: IRealmRepository }
): Promise<void> {
  for (const id of worldIds) {
    await executeDeleteRealm(id, deps)
  }
}
