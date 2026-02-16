import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { useFaction } from '~/ui/hooks/useFactions'
import type { FactionPresence } from '@domain/entities/FactionPresence'

interface FactionChipProps {
  presence: FactionPresence
}

export function FactionChip({ presence }: FactionChipProps) {
  const faction = useFaction(presence.factionId)
  if (!faction) return null

  return (
    <Link to="/realms/factions/$factionId" params={{ factionId: faction.id }}>
      <Badge
        variant="outline"
        className="text-xs gap-1 hover:bg-accent cursor-pointer"
      >
        {faction.name}
        <span className="text-muted-foreground">&middot; {presence.type}</span>
      </Badge>
    </Link>
  )
}
