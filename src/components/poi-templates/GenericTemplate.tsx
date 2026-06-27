import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { markdownOptions } from "~/shared/markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  MapPin,
  Users,
  Dices,
  Plus,
  FileText,
  ExternalLink,
  CalendarClock,
  Trash2,
  Navigation,
  LinkIcon,
} from "lucide-react";
import { NPCMiniCard } from "~/components/shared/NPCMiniCard";
import { FactionChip } from "~/components/shared/FactionChip";
import { NPCSearchDrawer } from "~/components/shared/NPCSearchDrawer";
import { SensoryBlock } from "~/components/shared/SensoryBlock";
import { ReadAloudBlock } from "~/components/shared/ReadAloudBlock";
import { AtAGlancePanel } from "~/components/shared/AtAGlancePanel";
import { LocationSeedEditor } from "~/components/shared/LocationSeedEditor";
import { EncounterCascade } from "~/components/shared/EncounterCascade";
import { RumorList } from "~/components/shared/RumorList";
import { RuinLoreBlock } from "./RuinLoreBlock";
import { LandmarkLoreBlock } from "./LandmarkLoreBlock";
import { RuinAreasSection } from "./RuinAreasSection";
import { ServicesList } from "~/components/shared/ServicesList";
import { PathCard } from "~/components/shared/PathCard";
import { EmptyState } from "~/components/shared/EmptyState";
import { POI_TYPE_ICONS } from "@shared/poi-icons";
import type { POI } from "@domain/entities/POI";
import type { NPC } from "@domain/entities/NPC";
import type { FactionPresence } from "@domain/entities/FactionPresence";
import type { ResolvedPath } from "~/ui/hooks/useResolvedPaths";
import type { POIEvent } from "@domain/entities/POIEvent";
import type { EncounterTable } from "@domain/entities/EncounterTable";
import type { Rumor } from "@domain/entities/Rumor";
import type { LocationSeed } from "@domain/value-objects/LocationSeed";
import type { RollEncounterResult } from "@application/use-cases/RollEncounter";
import type { CascadeAction } from "@application/use-cases/RollEncounterCascade";
import type { EncounterRollResult } from "@domain/value-objects/EncounterRollResult";

interface GenericTemplateProps {
  poi: POI;
  children: POI[];
  npcs: NPC[];
  /** NPCs that live in this POI's child locations; rolled up into the denizen list. */
  childNPCs: NPC[];
  factionPresences: FactionPresence[];
  paths: ResolvedPath[];
  poiEvents: POIEvent[];
  encounterTable: EncounterTable | null | undefined;
  rumors: Rumor[];
  onRollEncounter: () => Promise<RollEncounterResult>;
  onRollCascade: (action: CascadeAction) => Promise<EncounterRollResult>;
  onSaveEncounterNpc?: () => Promise<void>;
  onSaveEncounterTable?: (
    entries: Pick<
      EncounterTable,
      | "creature" | "signOmen" | "loss" | "npc" | "discovery" | "treasure"
      | "customSections" | "disabledCategories"
    >,
  ) => void;
  onCreateRumor: (input: {
    text: string;
    source: string;
    isQuestHook: boolean;
  }) => void;
  onToggleRumorUsed: (rumor: Rumor) => void;
  onDeleteRumor: (id: string) => void;
  allWorldNPCs: NPC[];
  onCreateChild: () => void;
  onCreateNPC: () => void;
  onLinkNPC: (npcId: string) => void;
  onCreateEvent: () => void;
  onDeleteEvent: (id: string) => void;
  onToggleTrapDisarmed?: (trapId: string) => void;
  onUpdateNPC?: (npc: NPC) => void;
  onUpdateLocationSeed: (seed: LocationSeed) => void;
  mapSection: React.ReactNode;
  notesSection?: React.ReactNode;
}

export function GenericTemplate({
  poi,
  children: childPois,
  npcs,
  childNPCs,
  factionPresences,
  paths,
  poiEvents,
  encounterTable,
  rumors,
  onRollEncounter,
  onRollCascade,
  onSaveEncounterNpc,
  onSaveEncounterTable,
  onCreateRumor,
  onToggleRumorUsed,
  onDeleteRumor,
  allWorldNPCs,
  onCreateChild,
  onCreateNPC,
  onLinkNPC,
  onCreateEvent,
  onDeleteEvent,
  onToggleTrapDisarmed,
  onUpdateNPC,
  onUpdateLocationSeed,
  mapSection,
  notesSection,
}: GenericTemplateProps) {
  const activeEvents = poiEvents.filter((e) => e.isActive).length;
  const [linkNPCOpen, setLinkNPCOpen] = useState(false);

  // Roll up NPCs from child locations (e.g. NPCs in a fort's buildings), labeled by location.
  const childPoiNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of childPois) map[c.id] = c.name;
    return map;
  }, [childPois]);

  const allNPCs = useMemo(
    () => [
      ...npcs.map((n) => ({ npc: n, poiName: undefined as string | undefined })),
      ...childNPCs.map((n) => ({
        npc: n,
        poiName: n.poiId ? childPoiNames[n.poiId] : undefined,
      })),
    ],
    [npcs, childNPCs, childPoiNames],
  );

  return (
    <div className="space-y-4">
      {/* Header badges */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {poi.type}
          </Badge>
          {poi.subtypeLabel && (
            <Badge variant="secondary" className="text-xs">
              {poi.subtypeLabel}
            </Badge>
          )}
          {poi.floor !== null && (
            <Badge variant="outline" className="text-xs">
              Floor {poi.floor}
            </Badge>
          )}
          {poi.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* At A Glance */}
      <AtAGlancePanel
        mood={poi.mood}
        trouble={poi.trouble}
        factionPresences={factionPresences}
        npcCount={allNPCs.length}
        activeEvents={activeEvents}
        paths={paths}
        currentPoiId={poi.id}
        traps={poi.traps}
        onToggleTrapDisarmed={onToggleTrapDisarmed}
        roomWidth={poi.roomWidth}
        roomLength={poi.roomLength}
        treasure={poi.treasure}
        lightLevel={poi.lightLevel}
      />

      {/* Read Aloud */}
      <ReadAloudBlock text={poi.readAloud} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="overview">
            <MapPin className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="denizens">
            <Users className="size-4" />
            Denizens ({allNPCs.length})
          </TabsTrigger>
          <TabsTrigger value="encounters">
            <Dices className="size-4" />
            Encounters
          </TabsTrigger>
          <TabsTrigger value="paths">
            <Navigation className="size-4" />
            Paths ({paths.length})
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="size-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-4 pt-3">
          {/* Description */}
          {poi.description && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown {...markdownOptions}>
                {poi.description}
              </ReactMarkdown>
            </div>
          )}

          {/* Sensory */}
          <SensoryBlock text={poi.sensory} />

          {/* Ruin lore + areas (ruin POIs only) */}
          {poi.type === "ruin" && poi.ruinSite && (
            <>
              <RuinLoreBlock site={poi.ruinSite} />
              <RuinAreasSection
                areas={poi.ruinSite.areas}
                npcs={allNPCs.map(({ npc }) => npc)}
                treasure={poi.treasure}
              />
            </>
          )}

          {/* Landmark lore (landmark POIs only) */}
          {poi.type === "landmark" && poi.landmarkLore && (
            <LandmarkLoreBlock lore={poi.landmarkLore} />
          )}

          {/* Map */}
          {mapSection}

          {/* Child locations */}
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
            {childPois.length > 0 ? (
              <div className="space-y-2">
                {childPois.map((child) => {
                  const ChildIcon = POI_TYPE_ICONS[child.type];
                  return (
                    <Link
                      key={child.id}
                      to="/realms/pois/$poiId"
                      params={{ poiId: child.id }}
                      className="block"
                    >
                      <div className={`rounded-md border p-3 hover:bg-accent transition-colors space-y-1.5 ${child.visited ? 'border-l-2 border-l-green-500' : ''}`}>
                        <div className="flex items-center gap-2">
                          {child.visited ? (
                            <span className="text-xs shrink-0">✅</span>
                          ) : (
                            <ChildIcon className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">
                            {child.name}
                          </span>
                          {child.subtypeLabel && (
                            <Badge
                              variant="secondary"
                              className="text-xs shrink-0"
                            >
                              {child.subtypeLabel}
                            </Badge>
                          )}
                          <span className="ml-auto flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0"
                            >
                              {child.type}
                            </Badge>
                            <ExternalLink className="size-3.5 text-muted-foreground" />
                          </span>
                        </div>
                        {child.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {child.description}
                          </p>
                        )}
                        {(child.mood || child.services.length > 0) && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {child.mood && (
                              <Badge variant="secondary" className="text-xs">
                                {child.mood}
                              </Badge>
                            )}
                            {child.services.map((s, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs font-normal"
                              >
                                {s.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No locations yet.</p>
            )}
          </div>

          {/* Services */}
          {poi.services.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Services</h4>
              <ServicesList services={poi.services} />
            </div>
          )}
        </TabsContent>

        {/* Denizens & Factions tab */}
        <TabsContent value="denizens" className="space-y-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="size-4" />
              Denizens ({allNPCs.length})
            </h4>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLinkNPCOpen(true)}
              >
                <LinkIcon className="mr-1.5 size-3.5" />
                Link NPC
              </Button>
              <Button size="sm" variant="outline" onClick={onCreateNPC}>
                <Plus className="mr-1.5 size-3.5" />
                New NPC
              </Button>
            </div>
          </div>
          {allNPCs.length > 0 ? (
            <div className="space-y-2">
              {allNPCs.map(({ npc, poiName }) => (
                <NPCMiniCard
                  key={npc.id}
                  npc={npc}
                  poiName={poiName}
                  onUpdateNPC={onUpdateNPC}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No denizens present.
            </p>
          )}

          {factionPresences.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Faction Presence</h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {factionPresences.map((fp) => (
                  <FactionChip key={fp.id} presence={fp} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Encounters tab */}
        <TabsContent value="encounters" className="space-y-6 pt-3">
          <EncounterCascade
            table={encounterTable}
            onRollCascade={onRollCascade}
            onSaveNpc={onSaveEncounterNpc}
            onSaveTable={onSaveEncounterTable}
            onRoll={onRollEncounter}
          />
          {poi.type === "ruin" && (
            <RumorList
              rumors={rumors}
              onToggleUsed={onToggleRumorUsed}
              onCreate={onCreateRumor}
              onDelete={onDeleteRumor}
            />
          )}
        </TabsContent>

        {/* Paths tab */}
        <TabsContent value="paths" className="pt-3">
          {paths.length > 0 ? (
            <div className="space-y-1">
              {paths.map((path) => (
                <PathCard key={path.id} path={path} currentPoiId={poi.id} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Navigation}
              title="No paths"
              description="Create paths from the region map to connect this location"
            />
          )}
        </TabsContent>

        {/* Notes tab */}
        <TabsContent value="notes" className="space-y-4 pt-3">
          {/* Location Seed */}
          <LocationSeedEditor
            seed={poi.locationSeed}
            poiType={poi.type}
            onChange={onUpdateLocationSeed}
          />

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CalendarClock className="size-4" />
                Events ({poiEvents.length})
              </h4>
              <Button size="sm" variant="outline" onClick={onCreateEvent}>
                <Plus className="mr-1.5 size-3.5" />
                Add Event
              </Button>
            </div>
            {poiEvents.length > 0 ? (
              <div className="space-y-2">
                {poiEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 rounded-md border p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {event.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        {event.isActive && (
                          <Badge className="text-xs bg-green-600">Active</Badge>
                        )}
                        {event.recurring && (
                          <Badge variant="secondary" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {event.trigger.season.charAt(0).toUpperCase() +
                          event.trigger.season.slice(1)}{" "}
                        Day {event.trigger.day}
                        {event.trigger.year !== null &&
                          `, Year ${event.trigger.year}`}
                        {event.trigger.watch !== null &&
                          `, Watch ${event.trigger.watch}`}
                        {" \u00B7 "}
                        {event.durationWatches} watch
                        {event.durationWatches !== 1 ? "es" : ""}
                      </div>
                      {event.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {event.description}
                        </div>
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
              <p className="text-sm text-muted-foreground">
                No events scheduled.
              </p>
            )}
          </div>

          {notesSection}
        </TabsContent>
      </Tabs>

      {/* Link Existing NPC Drawer */}
      <NPCSearchDrawer
        open={linkNPCOpen}
        onOpenChange={setLinkNPCOpen}
        allNPCs={allWorldNPCs}
        excludeNpcIds={allNPCs.map(({ npc }) => npc.id)}
        onSelect={(npcId) => {
          onLinkNPC(npcId);
          setLinkNPCOpen(false);
        }}
      />
    </div>
  );
}
