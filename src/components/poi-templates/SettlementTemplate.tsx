import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  MapPin,
  MessageSquare,
  Dices,
  Plus,
  CalendarClock,
  Trash2,
  Users,
  ExternalLink,
  FileText,
  Building2,
  Home,
  DoorOpen,
  Castle,
  Skull,
  TreePine,
  Flag,
  Landmark,
  LayoutGrid,
  Map,
  Tent,
  Sparkles,
} from 'lucide-react'
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
import type { EncounterCategory, NoticeType, PoiType } from '@shared/constants'
import { useFaction } from '~/ui/hooks/useFactions'

const POI_TYPE_ICONS: Record<PoiType, React.ComponentType<{ className?: string }>> = {
  settlement: Building2,
  building: Home,
  interior: DoorOpen,
  fortification: Castle,
  dungeon: Skull,
  natural: TreePine,
  landmark: Flag,
  district: LayoutGrid,
  zone: Map,
  ruin: Landmark,
  camp: Tent,
  shrine: Sparkles,
  other: MapPin,
}

interface SettlementTemplateProps {
  poi: POI
  children: POI[]
  npcs: NPC[]
  childNPCs: NPC[]
  selectedChildId: string | null
  onSelectChild: (id: string | null) => void
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
  notesSection?: React.ReactNode
}

export function SettlementTemplate({
  poi,
  children: childPois,
  npcs,
  childNPCs,
  selectedChildId,
  onSelectChild,
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
  notesSection,
}: SettlementTemplateProps) {
  // Group child NPCs by their poiId
  const npcsByPoiId = useMemo(() => {
    const map: Record<string, NPC[]> = {}
    for (const npc of childNPCs) {
      if (!npc.poiId) continue
      ;(map[npc.poiId] ??= []).push(npc)
    }
    return map
  }, [childNPCs])

  // Build a poiId → name lookup for child locations
  const childPoiNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of childPois) map[c.id] = c.name
    return map
  }, [childPois])

  // All NPCs: settlement-level first, then child-location NPCs
  const allNPCs = useMemo(() => [
    ...npcs.map((n) => ({ npc: n, poiName: undefined as string | undefined })),
    ...childNPCs.map((n) => ({ npc: n, poiName: n.poiId ? childPoiNames[n.poiId] : undefined })),
  ], [npcs, childNPCs, childPoiNames])

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
          <TabsTrigger value="notes">
            <FileText className="size-4" />
            Notes
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
                <div className="space-y-2">
                  {childPois.map((child) => {
                    const ChildIcon = POI_TYPE_ICONS[child.type]
                    const childNpcList = npcsByPoiId[child.id] ?? []
                    const isSelected = selectedChildId === child.id
                    return (
                      <div
                        key={child.id}
                        className={`rounded-md border p-3 cursor-pointer transition-colors space-y-1.5 ${
                          isSelected ? 'ring-2 ring-primary bg-accent' : 'hover:bg-accent'
                        }`}
                        onClick={() => onSelectChild(isSelected ? null : child.id)}
                      >
                        <div className="flex items-center gap-2">
                          <ChildIcon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium">{child.name}</span>
                          {child.subtypeLabel && <Badge variant="secondary" className="text-xs shrink-0">{child.subtypeLabel}</Badge>}
                          <span className="ml-auto flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs shrink-0">{child.type}</Badge>
                            {child.floor != null && <Badge variant="secondary" className="text-xs shrink-0">F{child.floor}</Badge>}
                            <Link
                              to="/realms/pois/$poiId"
                              params={{ poiId: child.id }}
                              className="inline-flex items-center justify-center size-6 rounded-md hover:bg-muted-foreground/20 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="size-3.5 text-muted-foreground" />
                            </Link>
                          </span>
                        </div>
                        {childNpcList.length > 0 && (
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {childNpcList.map((n) => (
                              <span key={n.id} className="inline-flex items-center gap-1 text-xs text-amber-500">
                                {n.name}
                                <Link
                                  to="/realms/npcs/$npcId"
                                  params={{ npcId: n.id }}
                                  className="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/20 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="size-3 text-muted-foreground" />
                                </Link>
                              </span>
                            ))}
                          </div>
                        )}
                        {child.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{child.description}</p>
                        )}
                        {(child.tags.length > 0 || child.mood) && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {child.mood && <Badge variant="secondary" className="text-xs">{child.mood}</Badge>}
                            {child.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        {child.services.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {child.services.map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs font-normal">
                                {s.name}{s.cost ? ` (${s.cost})` : ''}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
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

          {/* NPCs — settlement + child locations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4" />
                NPCs ({allNPCs.length})
              </h4>
              <Button size="sm" variant="outline" onClick={onCreateNPC}>
                <Plus className="mr-1.5 size-3.5" />
                Add NPC
              </Button>
            </div>
            {allNPCs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allNPCs.map(({ npc, poiName }) => {
                  const isHighlighted = selectedChildId != null && npc.poiId === selectedChildId
                  return (
                    <div key={npc.id} className={`w-72 rounded-md transition-all ${isHighlighted ? 'ring-2 ring-primary' : ''}`}>
                      <NPCMiniCard npc={npc} poiName={poiName} />
                    </div>
                  )
                })}
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

        {/* Notes tab */}
        <TabsContent value="notes" className="pt-3">
          {notesSection}
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
