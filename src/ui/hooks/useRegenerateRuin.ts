import { useContainer } from '~/ui/hooks/useContainer'
import { executeGenerateRuin } from '@application/use-cases/GenerateRuin'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { newId } from '@shared/ulid'

export function useRegenerateRuin() {
  const container = useContainer()
  const realm = useActiveRealm()
  return async (poiId: string) => {
    if (!realm) return
    await executeGenerateRuin(
      { poiId, worldId: realm.id, systemId: realm.systemId, seed: `ruin-${newId()}` },
      { poiRepo: container.poiRepo, npcRepo: container.npcRepo, regionRepo: container.regionRepo, factionRepo: container.factionRepo }
    )
  }
}
