import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { Coins, Skull, Sparkles } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { summarizeRegionContents } from './regionContents'

export function RegionContentsPanel({ pois, npcs }: { pois: POI[]; npcs: NPC[] }) {
  const [showMundane, setShowMundane] = useState(false)

  const c = summarizeRegionContents(pois, npcs)
  if (c.treasures.length === 0 && c.magic.length === 0 && c.monsters.length === 0) return null

  // Build lookup maps for labels
  const poiName = Object.fromEntries(pois.map((p) => [p.id, p.name]))
  const npcName = Object.fromEntries(npcs.map((n) => [n.id, n.name]))

  const visibleTreasures = showMundane ? c.treasures : c.treasures.filter((t) => t.notable)

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        What's Here
      </span>

      {/* Treasures */}
      {c.treasures.length > 0 && (
        <section className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Coins className="size-3" />
              Treasures ({c.treasureCount})
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs text-muted-foreground"
              onClick={() => setShowMundane((v) => !v)}
            >
              {showMundane ? 'Hide mundane' : 'Show mundane'}
            </Button>
          </div>
          <ul className="space-y-0.5">
            {visibleTreasures.map((t, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className={t.collected ? 'line-through text-muted-foreground' : ''}>
                  {t.name}
                </span>
                {t.value && (
                  <span className="text-muted-foreground">{t.value}</span>
                )}
                {t.notable && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    notable
                  </Badge>
                )}
                {t.collected && (
                  <span className="text-muted-foreground italic">looted</span>
                )}
                {t.poiId && poiName[t.poiId] && (
                  <Link
                    to="/realms/pois/$poiId"
                    params={{ poiId: t.poiId }}
                    className="text-primary hover:underline"
                  >
                    {poiName[t.poiId]}
                  </Link>
                )}
                {(t.guardianNpcId ?? t.npcId) &&
                  npcName[t.guardianNpcId ?? t.npcId ?? ''] && (
                    <Link
                      to="/realms/npcs/$npcId"
                      params={{ npcId: (t.guardianNpcId ?? t.npcId)! }}
                      className="text-primary hover:underline"
                    >
                      {npcName[(t.guardianNpcId ?? t.npcId)!]}
                    </Link>
                  )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Magic items */}
      {c.magic.length > 0 && (
        <section className="space-y-1">
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3" />
            Magic ({c.magicCount})
          </span>
          <ul className="space-y-0.5">
            {c.magic.map((m, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className={m.collected ? 'line-through text-muted-foreground' : ''}>
                  {m.name}
                </span>
                {m.collected && (
                  <span className="text-muted-foreground italic">looted</span>
                )}
                {m.poiId && poiName[m.poiId] && (
                  <Link
                    to="/realms/pois/$poiId"
                    params={{ poiId: m.poiId }}
                    className="text-primary hover:underline"
                  >
                    {poiName[m.poiId]}
                  </Link>
                )}
                {m.npcId && npcName[m.npcId] && (
                  <Link
                    to="/realms/npcs/$npcId"
                    params={{ npcId: m.npcId }}
                    className="text-primary hover:underline"
                  >
                    {npcName[m.npcId]}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Monsters */}
      {c.monsters.length > 0 && (
        <section className="space-y-1">
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <Skull className="size-3" />
            Monsters ({c.monsterCount})
          </span>
          <ul className="space-y-0.5">
            {c.monsters.map((m, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                <span>
                  {m.name} ×{m.count}
                </span>
                {m.big && (
                  <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                    big
                  </Badge>
                )}
                {m.poiId && poiName[m.poiId] && (
                  <Link
                    to="/realms/pois/$poiId"
                    params={{ poiId: m.poiId }}
                    className="text-primary hover:underline"
                  >
                    {poiName[m.poiId]}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
