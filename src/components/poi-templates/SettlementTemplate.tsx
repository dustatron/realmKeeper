import { Link } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { MapPin, MessageSquare, Dices, Plus, CalendarClock, Trash2, Users } from 'lucide-react'
import { NPCMiniCard } from '~/components/shared/NPCMiniCard'
import { RumorList } from '~/components/shared/RumorList'
import { NoticeBoard } from '~/components/shared/NoticeBoard'
import { EncounterTableUI } from '~/components/shared/EncounterTableUI'
import { ServicesList } from '~/components/shared/ServicesList'
import { ReadAloudBlock } from '~/components/shared/ReadAloudBlock'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import type { Rumor } from '@domain/entities/Rumor'
import type { Notice } from '@domain/entities/Notice'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { FactionPresence } from '@domain/entities/FactionPresence'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { GameMap } from '@domain/entities/GameMap'
import type { EncounterCategory, NoticeType } from '@shared/constants'
import { useFaction } from '~/ui/hooks/useFactions'

interface SettlementTemplateProps {
  poi: POI
  children: POI[]
  npcs: NPC[]
  factionPresences: FactionPresence[]
  rumors: Rumor[]
  notices: Notice[]
  encounterTable: EncounterTable | null | undefined
  poiEvents: POIEvent[]
  poiMaps: GameMap[]
  onToggleRumorUsed: (rumor: Rumor) => void
  onCreateRumor: (input: { text: string; source: string; isQuestHook: boolean }) => void
  onDeleteRumor: (id: string) => void
  onToggleNoticeUsed: (notice: Notice) => void
  onCreateNotice: (input: { title: string; description: string; type: NoticeType; reward: string }) => void
  onDeleteNotice: (id: string) => void
  onRollEncounter: () => Promise<{ category: EncounterCategory; categoryRoll: number; result: string }>
  onSaveEncounterTable?: (entries: Pick<EncounterTable, 'creature' | 'signOmen' | 'loss' | 'npc' | 'discovery' | 'treasure'>) => void
  onCreateChild: () => void
  onCreateNPC: () => void
  onCreateEvent: () => void
  onDeleteEvent: (id: string) => void
  mapSection: React.ReactNode
}

export function SettlementTemplate({
  poi,
  children: childPois,
  npcs,
  factionPresences,
  rumors,
  notices,
  encounterTable,
  poiEvents,
  onToggleRumorUsed,
  onCreateRumor,
  onDeleteRumor,
  onToggleNoticeUsed,
  onCreateNotice,
  onDeleteNotice,
  onRollEncounter,
  onSaveEncounterTable,
  onCreateChild,
  onCreateNPC,
  onCreateEvent,
  onDeleteEvent,
  mapSection,
}: SettlementTemplateProps) {
  // Aggregate services from child POIs + this POI
  const allServices = [
    ...poi.services,
    ...childPois.flatMap((c) => c.services),
  ]

  return (
    <div className="space-y-4">
      {/* Header — badges + factions */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          {poi.mood && <Badge variant="secondary" className="text-xs">{poi.mood}</Badge>}
          {poi.subtypeLabel && <Badge variant="outline" className="text-xs">{poi.subtypeLabel}</Badge>}
          {poi.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
        {poi.trouble && (
          <p className="text-sm text-amber-600 mt-1">{poi.trouble}</p>
        )}

        {/* Factions present */}
        {factionPresences.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {factionPresences.map((fp) => (
              <FactionChip key={fp.id} presence={fp} />
            ))}
          </div>
        )}
      </div>

      {/* Read Aloud */}
      <ReadAloudBlock text={poi.readAloud} />

      {/* GM Notes (collapsible) */}
      {poi.gmNotes && (
        <details className="rounded-md border p-3">
          <summary className="text-sm font-medium cursor-pointer">GM Notes</summary>
          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{poi.gmNotes}</p>
        </details>
      )}

      {/* Tabs */}
      <Tabs defaultValue="locations">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="locations">
            <MapPin className="size-4" />
            Locations & NPCs
          </TabsTrigger>
          <TabsTrigger value="rumors">
            <MessageSquare className="size-4" />
            Rumors ({rumors.length + notices.length})
          </TabsTrigger>
          <TabsTrigger value="encounters">
            <Dices className="size-4" />
            Encounters
          </TabsTrigger>
          <TabsTrigger value="events">
            <CalendarClock className="size-4" />
            Events ({poiEvents.length})
          </TabsTrigger>
        </TabsList>

        {/* Locations & NPCs tab */}
        <TabsContent value="locations" className="space-y-6 pt-3">
          {/* Map + Key Locations — 2-col on desktop */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Left: Map */}
            <div>
              {mapSection}
            </div>

            {/* Right: Location cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Key Locations</h4>
                <Button size="sm" variant="outline" onClick={onCreateChild}>
                  <Plus className="mr-1.5 size-3.5" />
                  Add Location
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
                          <div className="text-sm font-medium">{child.name}</div>
                          {child.services.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {child.services.map((s, i) => (
                                <span key={i} className="text-xs text-muted-foreground">
                                  {s.name}{s.cost ? ` (${s.cost})` : ''}{i < child.services.length - 1 ? ' · ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{child.type}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No locations yet.</p>
              )}
            </div>
          </div>

          {/* Aggregate Services */}
          {allServices.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Available Services</h4>
              <ServicesList services={allServices} />
            </div>
          )}

          {/* NPCs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4" />
                NPCs ({npcs.length})
              </h4>
              <Button size="sm" variant="outline" onClick={onCreateNPC}>
                <Plus className="mr-1.5 size-3.5" />
                Add NPC
              </Button>
            </div>
            {npcs.length > 0 ? (
              <div className="space-y-2">
                {npcs.map((npc) => <NPCMiniCard key={npc.id} npc={npc} />)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No NPCs present.</p>
            )}
          </div>
        </TabsContent>

        {/* Rumors & Notices tab */}
        <TabsContent value="rumors" className="space-y-6 pt-3">
          <RumorList
            rumors={rumors}
            onToggleUsed={onToggleRumorUsed}
            onCreate={onCreateRumor}
            onDelete={onDeleteRumor}
          />
          <NoticeBoard
            notices={notices}
            onToggleUsed={onToggleNoticeUsed}
            onCreate={onCreateNotice}
            onDelete={onDeleteNotice}
          />
        </TabsContent>

        {/* Encounters tab */}
        <TabsContent value="encounters" className="pt-3">
          <EncounterTableUI
            table={encounterTable}
            onRoll={onRollEncounter}
            onSave={onSaveEncounterTable}
          />
        </TabsContent>

        {/* Events tab */}
        <TabsContent value="events" className="pt-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Events</h4>
            <Button size="sm" variant="outline" onClick={onCreateEvent}>
              <Plus className="mr-1.5 size-3.5" />
              Add Event
            </Button>
          </div>
          {poiEvents.length > 0 ? (
            <div className="space-y-2">
              {poiEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2 rounded-md border p-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{event.name}</span>
                      <Badge variant="outline" className="text-xs">{event.type}</Badge>
                      {event.isActive && <Badge className="text-xs bg-green-600">Active</Badge>}
                      {event.recurring && <Badge variant="secondary" className="text-xs">Recurring</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {event.trigger.season.charAt(0).toUpperCase() + event.trigger.season.slice(1)} Day {event.trigger.day}
                      {event.trigger.year !== null && `, Year ${event.trigger.year}`}
                      {event.trigger.watch !== null && `, Watch ${event.trigger.watch}`}
                      {' · '}{event.durationWatches} watch{event.durationWatches !== 1 ? 'es' : ''}
                    </div>
                    {event.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteEvent(event.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No events scheduled.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FactionChip({ presence }: { presence: FactionPresence }) {
  const faction = useFaction(presence.factionId)
  if (!faction) return null

  return (
    <Link to="/realms/factions/$factionId" params={{ factionId: faction.id }}>
      <Badge variant="outline" className="text-xs gap-1 hover:bg-accent cursor-pointer">
        {faction.name}
        <span className="text-muted-foreground">· {presence.type}</span>
      </Badge>
    </Link>
  )
}
