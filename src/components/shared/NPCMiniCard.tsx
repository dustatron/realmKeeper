import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { MapPin } from 'lucide-react'
import type { NPC } from '@domain/entities/NPC'

interface NPCMiniCardProps {
  npc: NPC
  poiName?: string
}

export function NPCMiniCard({ npc, poiName }: NPCMiniCardProps) {
  return (
    <Link
      to="/realms/npcs/$npcId"
      params={{ npcId: npc.id }}
      className="block"
    >
      <div className="rounded-md border p-3 hover:bg-accent transition-colors space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{npc.name}</span>
          {npc.lifeStatus !== 'alive' && (
            <Badge variant="destructive" className="text-xs">{npc.lifeStatus}</Badge>
          )}
          {npc.movementStatus !== 'present' && (
            <Badge variant="outline" className="text-xs">{npc.movementStatus}</Badge>
          )}
        </div>
        {npc.appearance && (
          <p className="text-xs text-muted-foreground italic">&ldquo;{npc.appearance}&rdquo;</p>
        )}
        {npc.voice && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Voice:</span> {npc.voice}
          </p>
        )}
        {npc.motivation && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Wants:</span> {npc.motivation}
          </p>
        )}
        {npc.traits.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Traits:</span> {npc.traits.join(', ')}
          </p>
        )}
        {poiName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3" />
            {poiName}
          </p>
        )}
      </div>
    </Link>
  )
}
