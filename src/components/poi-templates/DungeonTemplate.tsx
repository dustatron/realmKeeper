import { useState } from "react";
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
  CalendarClock,
  Trash2,
  Columns2,
  Rows2,
} from "lucide-react";
import { NPCMiniCard } from "~/components/shared/NPCMiniCard";
import { FactionChip } from "~/components/shared/FactionChip";
import { EncounterTableUI } from "~/components/shared/EncounterTableUI";
import { ReadAloudBlock } from "~/components/shared/ReadAloudBlock";
import { AtAGlancePanel } from "~/components/shared/AtAGlancePanel";
import type { POI } from "@domain/entities/POI";
import type { NPC } from "@domain/entities/NPC";
import type { EncounterTable } from "@domain/entities/EncounterTable";
import type { FactionPresence } from "@domain/entities/FactionPresence";
import type { ResolvedPath } from "~/ui/hooks/useResolvedPaths";
import type { POIEvent } from "@domain/entities/POIEvent";
import type { RollEncounterResult } from "@application/use-cases/RollEncounter";

interface DungeonTemplateProps {
  poi: POI;
  children: POI[];
  npcs: NPC[];
  childNPCs?: NPC[];
  factionPresences: FactionPresence[];
  paths: ResolvedPath[];
  poiEvents: POIEvent[];
  encounterTable: EncounterTable | null | undefined;
  onRollEncounter: () => Promise<RollEncounterResult>;
  onSaveEncounterTable?: (
    entries: Pick<
      EncounterTable,
      | "creature" | "signOmen" | "loss" | "npc" | "discovery" | "treasure"
      | "customSections" | "disabledCategories"
    >,
  ) => void;
  onCreateChild: () => void;
  onCreateNPC: () => void;
  onCreateEvent: () => void;
  onDeleteEvent: (id: string) => void;
  onToggleTrapDisarmed?: (trapId: string) => void;
  onUpdateNPC?: (npc: NPC) => void;
  mapSection: React.ReactNode;
  notesSection?: React.ReactNode;
  compendiumSection?: React.ReactNode;
  dungeonEventsPanel?: React.ReactNode;
}

export function DungeonTemplate({
  poi,
  children: childPois,
  npcs,
  childNPCs = [],
  factionPresences,
  paths,
  poiEvents,
  encounterTable,
  onRollEncounter,
  onSaveEncounterTable,
  onCreateChild,
  onCreateNPC,
  onCreateEvent,
  onDeleteEvent,
  onToggleTrapDisarmed,
  onUpdateNPC,
  mapSection,
  notesSection,
  compendiumSection,
  dungeonEventsPanel,
}: DungeonTemplateProps) {
  const allNPCs = [...npcs, ...childNPCs];
  const poiNameMap = new Map<string, string>(
    [poi, ...childPois].map((p) => [p.id, p.name]),
  );
  const activeEvents = poiEvents.filter((e) => e.isActive).length;

  const [layout, setLayout] = useState<"columns" | "stacked">(() => {
    try {
      const saved = localStorage.getItem("dungeon-layout");
      if (saved === "stacked" || saved === "columns") return saved;
    } catch {}
    return "columns";
  });

  const updateLayout = (next: "columns" | "stacked") => {
    setLayout(next);
    try { localStorage.setItem("dungeon-layout", next); } catch {}
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="destructive" className="text-xs">
            dungeon
          </Badge>
          {poi.mood && (
            <Badge variant="secondary" className="text-xs">
              {poi.mood}
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
        npcCount={npcs.length}
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

      {/* GM Notes */}
      {poi.gmNotes && (
        <details className="rounded-md border p-3">
          <summary className="text-sm font-medium cursor-pointer">
            GM Notes
          </summary>
          <div className="prose prose-sm dark:prose-invert max-w-none mt-2">
            <ReactMarkdown {...markdownOptions}>{poi.gmNotes}</ReactMarkdown>
          </div>
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
            Denizens ({allNPCs.length})
          </TabsTrigger>
          <TabsTrigger value="encounters">
            <Dices className="size-4" />
            Encounters
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="size-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Rooms tab */}
        <TabsContent value="rooms" className="space-y-4 pt-3">
          {/* Layout toggle — hidden on mobile (always stacked) */}
          <div className="hidden md:flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateLayout(layout === "columns" ? "stacked" : "columns")
              }
              className="gap-1.5"
            >
              {layout === "columns" ? (
                <>
                  <Rows2 className="size-4" />
                  Stacked
                </>
              ) : (
                <>
                  <Columns2 className="size-4" />
                  Columns
                </>
              )}
            </Button>
          </div>

          {/* Map + Room list */}
          <div
            className={`grid gap-4 ${layout === "columns" ? "md:grid-cols-2" : ""}`}
          >
            {/* Map — taller in stacked mode on desktop */}
            <div
              className={layout === "stacked"
                ? "md:h-[90vh] md:[&>*]:h-full md:[&>*]:!flex md:[&>*]:!flex-col md:[&>*>*+*]:!flex-1 md:[&>*>*+*]:!h-auto md:[&>*>*+*]:min-h-0"
                : ""}
            >
              {mapSection}
            </div>

            {/* Room cards */}
            <div>
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
                      <div className={`rounded-md border p-2 hover:bg-accent transition-colors ${child.visited ? 'border-l-2 border-l-green-500' : ''}`}>
                        <div className="flex items-center gap-2">
                          {child.visited && <span className="text-xs shrink-0">✅</span>}
                          <span className="text-sm font-medium">{child.name}</span>
                          {child.floor !== null && (
                            <Badge variant="outline" className="text-xs">
                              Floor {child.floor}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {child.type}
                          </Badge>
                        </div>
                        {child.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {child.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No rooms mapped yet.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Denizens tab */}
        <TabsContent value="denizens" className="space-y-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="size-4" />
              Denizens ({allNPCs.length})
            </h4>
            <Button size="sm" variant="outline" onClick={onCreateNPC}>
              <Plus className="mr-1.5 size-3.5" />
              Add NPC
            </Button>
          </div>
          {allNPCs.length > 0 ? (
            <div className="space-y-2">
              {allNPCs.map((npc) => (
                <NPCMiniCard key={npc.id} npc={npc} poiName={npc.poiId ? poiNameMap.get(npc.poiId) : undefined} onUpdateNPC={onUpdateNPC} />
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

          {compendiumSection}

          {/* Dungeon Events Check */}
          {dungeonEventsPanel}
        </TabsContent>

        {/* Encounters tab */}
        <TabsContent value="encounters" className="pt-3">
          <EncounterTableUI
            table={encounterTable}
            onRoll={onRollEncounter}
            onSave={onSaveEncounterTable}
          />
        </TabsContent>

        {/* Notes tab */}
        <TabsContent value="notes" className="space-y-4 pt-3">
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
    </div>
  );
}
