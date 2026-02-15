import { Link } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { MapPin, Users, MessageSquare, Dices, Plus, Flag } from 'lucide-react'
import { NPCMiniCard } from '~/components/shared/NPCMiniCard'
import { PathCard } from '~/components/shared/PathCard'
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
import type { ResolvedPath } from '~/ui/hooks/useResolvedPaths'
import type { GameMap } from '@domain/entities/GameMap'
import type { EncounterCategory, NoticeType } from '@shared/constants'
import { useFaction } from '~/ui/hooks/useFactions'

interface SettlementTemplateProps {
  poi: POI
  children: POI[]
  npcs: NPC[]
  factionPresences: FactionPresence[]
  paths: ResolvedPath[]
  rumors: Rumor[]
  notices: Notice[]
  encounterTable: EncounterTable | null | undefined
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
  mapSection: React.ReactNode
}

export function SettlementTemplate({
  poi,
  children: childPois,
  npcs,
  factionPresences,
  paths,
  rumors,
  notices,
  encounterTable,
  onToggleRumorUsed,
  onCreateRumor,
  onDeleteRumor,
  onToggleNoticeUsed,
  onCreateNotice,
  onDeleteNotice,
  onRollEncounter,
  onSaveEncounterTable,
  onCreateChild,
  mapSection,
}: SettlementTemplateProps) {
  // Aggregate services from child POIs + this POI
  const allServices = [
    ...poi.services,
    ...childPois.flatMap((c) => c.services),
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
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
            Locations ({childPois.length})
          </TabsTrigger>
          <TabsTrigger value="npcs">
            <Users className="size-4" />
            NPCs ({npcs.length})
          </TabsTrigger>
          <TabsTrigger value="rumors">
            <MessageSquare className="size-4" />
            Rumors ({rumors.length + notices.length})
          </TabsTrigger>
          <TabsTrigger value="encounters">
            <Dices className="size-4" />
            Encounters
          </TabsTrigger>
        </TabsList>

        {/* Locations tab */}
        <TabsContent value="locations" className="space-y-4 pt-3">
          {/* Map */}
          {mapSection}

          {/* Key Locations */}
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

          {/* Aggregate Services */}
          {allServices.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Available Services</h4>
              <ServicesList services={allServices} />
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
                  <FactionPresenceBadge key={fp.id} presence={fp} />
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
        </TabsContent>

        {/* NPCs tab */}
        <TabsContent value="npcs" className="space-y-2 pt-3">
          {npcs.length > 0 ? (
            npcs.map((npc) => <NPCMiniCard key={npc.id} npc={npc} />)
          ) : (
            <p className="text-sm text-muted-foreground">No NPCs present.</p>
          )}
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
      </Tabs>
    </div>
  )
}

function FactionPresenceBadge({ presence }: { presence: FactionPresence }) {
  const faction = useFaction(presence.factionId)
  if (!faction) return null

  return (
    <Link to="/realms/factions/$factionId" params={{ factionId: faction.id }} className="block">
      <div className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent transition-colors">
        <span className="text-sm font-medium">{faction.name}</span>
        <Badge variant="outline" className="text-xs">{presence.type}</Badge>
        {presence.notes && <span className="text-xs text-muted-foreground">{presence.notes}</span>}
      </div>
    </Link>
  )
}
