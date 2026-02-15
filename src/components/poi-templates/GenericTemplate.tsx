import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { MapPin, Users, Flag, Plus } from 'lucide-react'
import { NPCMiniCard } from '~/components/shared/NPCMiniCard'
import { PathCard } from '~/components/shared/PathCard'
import { ServicesList } from '~/components/shared/ServicesList'
import { ReadAloudBlock } from '~/components/shared/ReadAloudBlock'
import { EmptyState } from '~/components/shared/EmptyState'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import type { FactionPresence } from '@domain/entities/FactionPresence'
import type { ResolvedPath } from '~/ui/hooks/useResolvedPaths'
import type { POIEvent } from '@domain/entities/POIEvent'

interface GenericTemplateProps {
  poi: POI
  children: POI[]
  npcs: NPC[]
  factionPresences: FactionPresence[]
  paths: ResolvedPath[]
  poiEvents: POIEvent[]
  onCreateChild: () => void
  mapSection: React.ReactNode
}

export function GenericTemplate({
  poi,
  children: childPois,
  npcs,
  factionPresences,
  paths,
  poiEvents,
  onCreateChild,
  mapSection,
}: GenericTemplateProps) {
  const hasContent = childPois.length > 0 || npcs.length > 0 || factionPresences.length > 0 || paths.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{poi.type}</Badge>
          {poi.subtypeLabel && <Badge variant="secondary" className="text-xs">{poi.subtypeLabel}</Badge>}
          {poi.mood && <Badge variant="secondary" className="text-xs">{poi.mood}</Badge>}
          {poi.floor !== null && <Badge variant="outline" className="text-xs">Floor {poi.floor}</Badge>}
          {poi.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
        {poi.trouble && (
          <p className="text-sm text-amber-600 mt-1">{poi.trouble}</p>
        )}
      </div>

      {/* Read Aloud */}
      <ReadAloudBlock text={poi.readAloud} />

      {/* Description */}
      {poi.description && (
        <p className="text-sm whitespace-pre-wrap">{poi.description}</p>
      )}

      {/* Sensory */}
      {poi.sensory && (
        <p className="text-sm text-muted-foreground italic">{poi.sensory}</p>
      )}

      {/* GM Notes */}
      {poi.gmNotes && (
        <details className="rounded-md border p-3">
          <summary className="text-sm font-medium cursor-pointer">GM Notes</summary>
          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{poi.gmNotes}</p>
        </details>
      )}

      {/* Services */}
      {poi.services.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Services</h4>
          <ServicesList services={poi.services} />
        </div>
      )}

      {/* Map */}
      {mapSection}

      {/* Child Locations */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="size-4" />
            Locations ({childPois.length})
          </h4>
          <Button size="sm" variant="outline" onClick={onCreateChild}>
            <Plus className="mr-1.5 size-3.5" />
            Add Location
          </Button>
        </div>
        {childPois.length > 0 && (
          <div className="space-y-1">
            {childPois.map((child) => (
              <Link
                key={child.id}
                to="/realms/pois/$poiId"
                params={{ poiId: child.id }}
                className="block"
              >
                <div className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{child.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{child.type}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* NPCs */}
      {npcs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Users className="size-4" />
            NPCs ({npcs.length})
          </h4>
          <div className="space-y-2">
            {npcs.map((npc) => <NPCMiniCard key={npc.id} npc={npc} />)}
          </div>
        </div>
      )}

      {/* Faction Presence */}
      {factionPresences.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Flag className="size-4" />
            Faction Presence ({factionPresences.length})
          </h4>
          <div className="space-y-1">
            {factionPresences.map((fp) => (
              <div key={fp.id} className="flex items-center gap-2 rounded-md border p-2">
                <Badge variant="outline" className="text-xs">{fp.type}</Badge>
                {fp.notes && <span className="text-xs text-muted-foreground">{fp.notes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paths */}
      {paths.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Connected Paths</h4>
          <div className="space-y-1">
            {paths.map((path) => (
              <PathCard key={path.id} path={path} currentPoiId={poi.id} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasContent && !poi.description && !poi.readAloud && (
        <EmptyState
          icon={MapPin}
          title="Nothing here yet"
          description="Add locations, NPCs, or faction presences to populate this location"
        />
      )}
    </div>
  )
}
