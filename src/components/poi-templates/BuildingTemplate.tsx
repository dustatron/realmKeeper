import { Link } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { MapPin, Users, Lock, Plus } from 'lucide-react'
import { NPCMiniCard } from '~/components/shared/NPCMiniCard'
import { ServicesList } from '~/components/shared/ServicesList'
import { ReadAloudBlock } from '~/components/shared/ReadAloudBlock'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'

interface BuildingTemplateProps {
  poi: POI
  children: POI[]
  npcs: NPC[]
  onCreateChild: () => void
  mapSection: React.ReactNode
}

export function BuildingTemplate({
  poi,
  children: childPois,
  npcs,
  onCreateChild,
  mapSection,
}: BuildingTemplateProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{poi.type}</Badge>
          {poi.subtypeLabel && <Badge variant="secondary" className="text-xs">{poi.subtypeLabel}</Badge>}
          {poi.mood && <Badge variant="secondary" className="text-xs">{poi.mood}</Badge>}
          {poi.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
        {poi.trouble && (
          <p className="text-sm text-amber-600 mt-1">{poi.trouble}</p>
        )}
      </div>

      {/* Services inline */}
      {poi.services.length > 0 && (
        <ServicesList services={poi.services} />
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="overview">
            <MapPin className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="npcs">
            <Users className="size-4" />
            NPCs ({npcs.length})
          </TabsTrigger>
          <TabsTrigger value="secrets">
            <Lock className="size-4" />
            Secrets
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 pt-3">
          <ReadAloudBlock text={poi.readAloud} />

          {poi.description && (
            <p className="text-sm whitespace-pre-wrap">{poi.description}</p>
          )}

          {poi.sensory && (
            <p className="text-sm text-muted-foreground italic">{poi.sensory}</p>
          )}

          {mapSection}

          {/* Child locations (rooms/floors) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Rooms & Areas ({childPois.length})</h4>
              <Button size="sm" variant="outline" onClick={onCreateChild}>
                <Plus className="mr-1.5 size-3.5" />
                Add Room
              </Button>
            </div>
            {childPois.length > 0 ? (
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
                        {child.floor !== null && (
                          <Badge variant="outline" className="text-xs ml-2">Floor {child.floor}</Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{child.type}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No rooms defined.</p>
            )}
          </div>
        </TabsContent>

        {/* NPCs */}
        <TabsContent value="npcs" className="space-y-2 pt-3">
          {npcs.length > 0 ? (
            npcs.map((npc) => <NPCMiniCard key={npc.id} npc={npc} />)
          ) : (
            <p className="text-sm text-muted-foreground">No NPCs here.</p>
          )}
        </TabsContent>

        {/* Secrets */}
        <TabsContent value="secrets" className="space-y-4 pt-3">
          {poi.gmNotes ? (
            <div>
              <h4 className="text-sm font-semibold mb-1">GM Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{poi.gmNotes}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No secrets recorded.</p>
          )}
          {poi.trouble && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Trouble</h4>
              <p className="text-sm text-amber-600">{poi.trouble}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
