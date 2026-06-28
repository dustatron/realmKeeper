import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { Coins, Skull, Sparkles } from 'lucide-react'
import { summarizeRegionContents } from './regionContents'

// TODO(Task 7): rebuild this panel against the new RegionContents shape
export function RegionContentsPanel({ pois, npcs }: { pois: POI[]; npcs: NPC[] }) {
  const s = summarizeRegionContents(pois, npcs)
  if (s.treasureCount === 0 && s.monsterCount === 0) return null
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What's Here</span>
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1"><Coins className="size-4" /> {s.treasureCount} treasure</span>
        <span className="flex items-center gap-1"><Sparkles className="size-4" /> {s.magicCount} magic</span>
        <span className="flex items-center gap-1"><Skull className="size-4" /> {s.monsterCount} monsters</span>
      </div>
    </div>
  )
}
