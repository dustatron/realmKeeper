import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import type { Hook } from '@domain/entities/Hook'

export interface NpcHook extends Hook {
  /** How this NPC relates to the hook: its contact (quest-giver) or its subject. */
  role: 'contact' | 'target'
}

// Hooks that involve an NPC — either as the contact who offers the quest, or as
// the subject the secret points at.
export function useNpcHooks(worldId: string | null, npcId: string | null): NpcHook[] {
  return (
    useLiveQuery(async () => {
      if (!worldId || !npcId) return []
      const all = await db.hooks.where('worldId').equals(worldId).toArray()
      return all
        .filter((h) => h.contactNpcId === npcId || (h.secret.targetType === 'npc' && h.secret.targetId === npcId))
        .map((h) => ({ ...h, role: h.contactNpcId === npcId ? 'contact' : 'target' }) as NpcHook)
    }, [worldId, npcId]) ?? []
  )
}
