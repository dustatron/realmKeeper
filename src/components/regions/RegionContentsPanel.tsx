import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { Coins, Skull, Sparkles } from 'lucide-react'
import { summarizeRegionContents } from './regionContents'

export function RegionContentsPanel({ pois, npcs }: { pois: POI[]; npcs: NPC[] }) {
  const s = summarizeRegionContents(pois, npcs)
  if (s.treasureCount === 0 && s.monsters.length === 0) return null
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What's Here</span>
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1"><Coins className="size-4" /> {s.treasureCount} treasure</span>
        <span className="flex items-center gap-1"><Sparkles className="size-4" /> {s.magicCount} magic</span>
        <span className="flex items-center gap-1"><Skull className="size-4" /> {s.monsters.reduce((a, m) => a + m.count, 0)} monsters</span>
      </div>
      {s.highlights.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Notable finds: {s.highlights.map((h) => `${h.name} — ${h.location}`).join(', ')}
        </p>
      )}
      {s.bigMonsters.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Big monsters: {s.bigMonsters.map((m) => `${m.name} — ${m.location}${m.count > 1 ? ` ×${m.count}` : ''}`).join(', ')}
        </p>
      )}
      {s.monsters.length > 0 && s.bigMonsters.length === 0 && (
        <p className="text-xs text-muted-foreground">Threats: {s.monsters.map((m) => `${m.name}${m.count > 1 ? ` ×${m.count}` : ''}`).join(', ')}</p>
      )}
    </div>
  )
}
