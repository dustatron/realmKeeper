import { useMemo } from 'react'
import { useRealmPOIs } from './usePOIs'
import { useNPCs } from './useNPCs'
import type { HookLink } from '~/components/shared/HookLinkChip'

/**
 * All POIs and NPCs in a world, as {type, id, name} options — used to populate
 * link pickers and to resolve stored EntityLinks back to display names.
 */
export function useLinkableEntities(worldId: string | null): HookLink[] {
  const pois = useRealmPOIs(worldId)
  const npcs = useNPCs(worldId)

  return useMemo(() => {
    const poiLinks: HookLink[] = pois.map((p) => ({ type: 'poi', id: p.id, name: p.name }))
    const npcLinks: HookLink[] = npcs.map((n) => ({ type: 'npc', id: n.id, name: n.name }))
    return [...poiLinks, ...npcLinks]
  }, [pois, npcs])
}
