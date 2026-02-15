import { Link } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { MapPin, Users, Dices, Plus, Flag } from 'lucide-react'
import { NPCMiniCard } from '~/components/shared/NPCMiniCard'
import { EncounterTableUI } from '~/components/shared/EncounterTableUI'
import { ReadAloudBlock } from '~/components/shared/ReadAloudBlock'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { FactionPresence } from '@domain/entities/FactionPresence'
import type { EncounterCategory } from '@shared/constants'

interface DungeonTemplateProps {
  poi: POI
  children: POI[]
  npcs: NPC[]
  factionPresences: FactionPresence[]
  encounterTable: EncounterTable | null | undefined
  onRollEncounter: () => Promise<{ category: EncounterCategory; categoryRoll: number; result: string }>
  onSaveEncounterTable?: (entries: Pick<EncounterTable, 'creature' | 'signOmen' | 'loss' | 'npc' | 'discovery' | 'treasure'>) => void
  onCreateChild: () => void
  mapSection: React.ReactNode
}

export function DungeonTemplate({
  poi,
  children: childPois,
  npcs,
  factionPresences,
  encounterTable,
  onRollEncounter,
  onSaveEncounterTable,
  onCreateChild,
  mapSection,
}: DungeonTemplateProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="destructive" className="text-xs">dungeon</Badge>
          {poi.mood && <Badge variant="secondary" className="text-xs">{poi.mood}</Badge>}
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

      {/* GM Notes */}
      {poi.gmNotes && (
        <details className="rounded-md border p-3">
          <summary className="text-sm font-medium cursor-pointer">GM Notes</summary>
          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{poi.gmNotes}</p>
        </details>
      )}

      {/* Tabs */}
      <Tabs defaultValue="rooms">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="rooms">
            <MapPin className="size-4" />
            Rooms ({childPois.length})
          </TabsTrigger>
          <TabsTrigger value="denizens">
            <Users className="size-4" />
            Denizens ({npcs.length})
          </TabsTrigger>
          <TabsTrigger value="encounters">
            <Dices className="size-4" />
            Encounters
          </TabsTrigger>
        </TabsList>

        {/* Rooms tab */}
        <TabsContent value="rooms" className="space-y-4 pt-3">
          {mapSection}

          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Rooms & Areas</h4>
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
                  <div className="rounded-md border p-2 hover:bg-accent transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{child.name}</span>
                      {child.floor !== null && (
                        <Badge variant="outline" className="text-xs">Floor {child.floor}</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{child.type}</Badge>
                    </div>
                    {child.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{child.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No rooms mapped yet.</p>
          )}
        </TabsContent>

        {/* Denizens tab */}
        <TabsContent value="denizens" className="space-y-4 pt-3">
          {npcs.length > 0 ? (
            <div className="space-y-2">
              {npcs.map((npc) => <NPCMiniCard key={npc.id} npc={npc} />)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No denizens present.</p>
          )}

          {factionPresences.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Flag className="size-4" />
                Faction Presence
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
        </TabsContent>

        {/* Encounters tab */}
        <TabsContent value="encounters" className="pt-3">
          <EncounterTableUI
            table={encounterTable}
            onRoll={onRollEncounter}
            onSave={onSaveEncounterTable}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
