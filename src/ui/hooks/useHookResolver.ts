import { useMemo } from 'react'
import { useHooksByWorld } from './useHooks'
import { useRealmPOIs } from './usePOIs'
import { useNPCs } from './useNPCs'
import type { HookReveal, HookLink } from '~/components/shared/HookLinkChip'

/**
 * Resolves a hook id to its GM-only reveal: the secret detail text plus
 * navigable links to any POI/NPC the secret points at (target + container).
 */
export function useHookResolver(worldId: string | null) {
  const hooks = useHooksByWorld(worldId)
  const pois = useRealmPOIs(worldId)
  const npcs = useNPCs(worldId)

  const hooksById = useMemo(() => new Map(hooks.map((h) => [h.id, h])), [hooks])
  const poiNames = useMemo(() => new Map(pois.map((p) => [p.id, p.name])), [pois])
  const npcNames = useMemo(() => new Map(npcs.map((n) => [n.id, n.name])), [npcs])

  return useMemo(() => {
    return (id: string): HookReveal | null => {
      const hook = hooksById.get(id)
      if (!hook) return null
      const s = hook.secret
      const links: HookLink[] = []
      const add = (type: 'poi' | 'npc', entityId?: string) => {
        if (!entityId) return
        const name = type === 'poi' ? poiNames.get(entityId) : npcNames.get(entityId)
        if (name && !links.some((l) => l.id === entityId)) links.push({ type, id: entityId, name })
      }
      if (s.targetType === 'poi' || s.targetType === 'npc') add(s.targetType, s.targetId)
      if (s.containerType) add(s.containerType, s.containerId)
      return { detail: s.detail, links }
    }
  }, [hooksById, poiNames, npcNames])
}
