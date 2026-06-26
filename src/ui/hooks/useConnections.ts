import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

// All connections touching an NPC (as either endpoint), within its world.
export function useNpcConnections(worldId: string | null, npcId: string | null) {
  return (
    useLiveQuery(async () => {
      if (!worldId || !npcId) return []
      const [from, to] = await Promise.all([
        db.connections.where('[worldId+fromId]').equals([worldId, npcId]).toArray(),
        db.connections.where('[worldId+toId]').equals([worldId, npcId]).toArray(),
      ])
      const seen = new Set<string>()
      return [...from, ...to].filter((c) => {
        if (seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
    }, [worldId, npcId]) ?? []
  )
}
