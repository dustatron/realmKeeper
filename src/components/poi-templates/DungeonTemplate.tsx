import { useState } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { markdownOptions } from "~/shared/markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
} from "~/components/ui/collapsible";
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
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  Gem,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { NPCMiniCard } from "~/components/shared/NPCMiniCard";
import { FactionChip } from "~/components/shared/FactionChip";
import { EncounterTableUI } from "~/components/shared/EncounterTableUI";
import { ReadAloudBlock } from "~/components/shared/ReadAloudBlock";
import { AtAGlancePanel } from "~/components/shared/AtAGlancePanel";
import { WanderingMonsterTable } from "~/components/shared/WanderingMonsterTable";
import { db } from "@infrastructure/dexie/db";
import { getTagEmojis, getUnmappedTags } from "~/shared/room-card-utils";
import type { POI } from "@domain/entities/POI";
import type { NPC } from "@domain/entities/NPC";
import type { WanderingMonsterEntry } from "@domain/value-objects/WanderingMonster";
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
  selectedChildId: string | null;
  onSelectChild: (id: string | null) => void;
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
  selectedChildId,
  onSelectChild,
  mapSection,
  notesSection,
  compendiumSection,
  dungeonEventsPanel,
}: DungeonTemplateProps) {
  const allNPCs = [...npcs, ...childNPCs];
  const npcsByPoiId: Record<string, NPC[]> = {};
  for (const npc of childNPCs) {
    if (npc.poiId) {
      (npcsByPoiId[npc.poiId] ??= []).push(npc);
    }
  }
  const poiNameMap = new Map<string, string>(
    [poi, ...childPois].map((p) => [p.id, p.name]),
  );
  const activeEvents = poiEvents.filter((e) => e.isActive).length;

  // Room rollup stats
  const roomsExplored = childPois.filter((c) => c.visited).length;
  const totalRoomTraps = childPois.flatMap((c) => c.traps ?? []);
  const totalRoomTreasure = childPois.flatMap((c) => c.treasure ?? []);
  const activeRoomTraps = totalRoomTraps.filter((t) => !t.disarmed).length;
  const uncollectedRoomTreasure = totalRoomTreasure.filter((t) => !t.collected).length;

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

  const handleSaveWanderingMonsters = (entries: WanderingMonsterEntry[]) => {
    db.pois.update(poi.id, { wanderingMonsters: entries, updatedAt: Date.now() });
  };

  return (
    <div className="space-y-4">
      {/* Header — only non-duplicate tags (dungeon type + mood shown in At A Glance) */}
      {poi.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {poi.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* At A Glance — uses room rollup stats for traps/treasure/NPCs */}
      <AtAGlancePanel
        mood={poi.mood}
        trouble={poi.trouble}
        factionPresences={factionPresences}
        npcCount={allNPCs.length}
        activeEvents={activeEvents}
        paths={paths}
        currentPoiId={poi.id}
        traps={totalRoomTraps.length > 0 ? totalRoomTraps : poi.traps}
        onToggleTrapDisarmed={onToggleTrapDisarmed}
        treasure={totalRoomTreasure.length > 0 ? totalRoomTreasure : poi.treasure}
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
            <div>
              <div
                className={layout === "stacked"
                  ? "md:h-[90vh] md:[&>*]:h-full md:[&>*]:!flex md:[&>*]:!flex-col md:[&>*>*+*]:!flex-1 md:[&>*>*+*]:!h-auto md:[&>*>*+*]:min-h-0"
                  : ""}
              >
                {mapSection}
              </div>

              {/* ⚔️ Wandering Monsters d6 Table */}
              <div className="mt-3">
                <WanderingMonsterTable
                  entries={poi.wanderingMonsters ?? []}
                  onSave={handleSaveWanderingMonsters}
                />
              </div>
            </div>

            {/* Room cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  Rooms & Areas
                  {childPois.length > 0 && (
                    <Badge variant={roomsExplored === childPois.length ? "default" : "secondary"} className="text-xs">
                      ✅ {roomsExplored}/{childPois.length} explored
                    </Badge>
                  )}
                </h4>
                <Button size="sm" variant="outline" onClick={onCreateChild}>
                  <Plus className="mr-1.5 size-3.5" />
                  Add Room
                </Button>
              </div>
              {childPois.length > 0 ? (
                <div className="space-y-1.5">
                  {childPois.map((child) => {
                    const isSelected = selectedChildId === child.id;
                    const childNpcList = npcsByPoiId[child.id] ?? [];
                    const hasActiveTraps = child.traps?.some((t) => !t.disarmed);
                    const hasUncollectedTreasure = child.treasure?.some((t) => !t.collected);
                    const tagEmojis = getTagEmojis(child.tags);
                    const unmappedTags = getUnmappedTags(child.tags);
                    return (
                      <Collapsible key={child.id} open={isSelected} onOpenChange={(open) => onSelectChild(open ? child.id : null)}>
                        <div
                          className={`rounded-md border p-2.5 cursor-pointer transition-colors ${
                            isSelected
                              ? "ring-2 ring-primary bg-accent"
                              : "hover:bg-accent"
                          } ${child.visited ? "border-l-2 border-l-green-500" : ""}`}
                          onClick={() =>
                            onSelectChild(isSelected ? null : child.id)
                          }
                        >
                          {/* Title row */}
                          <div className="flex items-center gap-1.5">
                            {/* Visited toggle */}
                            <button
                              className="shrink-0 p-0.5 rounded hover:bg-muted-foreground/20 transition-colors"
                              title={child.visited ? "Mark unvisited" : "Mark visited"}
                              onClick={(e) => {
                                e.stopPropagation();
                                db.pois.update(child.id, { visited: !child.visited, updatedAt: Date.now() });
                              }}
                            >
                              {child.visited ? (
                                <CheckCircle2 className="size-4 text-green-500" />
                              ) : (
                                <Circle className="size-4 text-muted-foreground/40" />
                              )}
                            </button>
                            {/* Chevron */}
                            <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${isSelected ? "rotate-180" : ""}`} />
                            {/* Room name */}
                            <span className="text-sm font-medium truncate">
                              {child.name}
                            </span>
                            {/* Feature indicators */}
                            <span className="flex items-center gap-1 shrink-0">
                              {hasActiveTraps && (
                                <span title="Active traps"><AlertTriangle className="size-3.5 text-amber-500" /></span>
                              )}
                              {hasUncollectedTreasure && (
                                <span title="Uncollected treasure"><Gem className="size-3.5 text-emerald-500" /></span>
                              )}
                              {childNpcList.length > 0 && (
                                <span title={`${childNpcList.length} NPC${childNpcList.length > 1 ? "s" : ""}`}><Users className="size-3.5 text-blue-400" /></span>
                              )}
                              {tagEmojis.map((emoji, i) => (
                                <span key={i} className="text-sm" title={child.tags[i]}>{emoji}</span>
                              ))}
                              {child.lightLevel && (
                                <span className="text-sm" title={child.lightLevel}>
                                  {child.lightLevel === "bright" ? "☀️" : child.lightLevel === "dim" ? "🌓" : "🌑"}
                                </span>
                              )}
                            </span>
                            {/* Right side: type + external link */}
                            <span className="ml-auto flex items-center gap-1.5 shrink-0">
                              {child.floor != null && (
                                <Badge variant="secondary" className="text-xs">
                                  F{child.floor}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {child.type}
                              </Badge>
                              <Link
                                to="/realms/pois/$poiId"
                                params={{ poiId: child.id }}
                                target="_blank"
                                className="inline-flex items-center justify-center size-6 rounded-md hover:bg-muted-foreground/20 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="size-3.5 text-muted-foreground" />
                              </Link>
                            </span>
                          </div>

                          {/* Expanded content */}
                          <CollapsibleContent>
                            <div
                              className="mt-2.5 space-y-3 border-t pt-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Read Aloud */}
                              {child.readAloud && (
                                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
                                  <div className="text-xs font-medium text-amber-500 mb-1">📖 Read Aloud</div>
                                  <p className="text-sm italic text-foreground/80 leading-relaxed">{child.readAloud}</p>
                                </div>
                              )}

                              {/* Description */}
                              {child.description && (
                                <p className="text-sm text-muted-foreground leading-relaxed">{child.description}</p>
                              )}

                              {/* Sensory */}
                              {child.sensory && (
                                <p className="text-sm italic text-muted-foreground">
                                  👃 {child.sensory}
                                </p>
                              )}

                              {/* Mood + Dimensions row */}
                              {(child.mood || child.roomWidth || child.roomLength) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {child.mood && (
                                    <Badge variant="secondary" className="text-xs">
                                      🎭 {child.mood}
                                    </Badge>
                                  )}
                                  {(child.roomWidth || child.roomLength) && (
                                    <Badge variant="outline" className="text-xs">
                                      📐 {child.roomWidth && child.roomLength
                                        ? `${child.roomWidth} × ${child.roomLength} ft`
                                        : `${child.roomWidth ?? child.roomLength} ft`}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Traps */}
                              {child.traps?.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-amber-500 uppercase tracking-wide">⚠️ Traps</div>
                                  {child.traps.map((trap) => (
                                    <div key={trap.id} className="flex items-start gap-2 text-sm rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
                                      <span className={trap.disarmed ? "line-through text-muted-foreground" : "text-foreground"}>
                                        {trap.name}
                                      </span>
                                      {trap.dc != null && (
                                        <Badge variant="outline" className="text-xs shrink-0">DC {trap.dc}</Badge>
                                      )}
                                      {trap.damage && (
                                        <span className="text-xs text-red-400 shrink-0">{trap.damage}</span>
                                      )}
                                      <span className="ml-auto text-xs shrink-0">
                                        {trap.disarmed ? "✅ disarmed" : "❌ armed"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Treasure */}
                              {child.treasure?.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">💎 Treasure</div>
                                  {child.treasure.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 text-sm rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5">
                                      <span className={item.collected ? "line-through text-muted-foreground" : "text-foreground"}>
                                        {item.name}
                                        {item.quantity > 1 && ` (×${item.quantity})`}
                                      </span>
                                      {item.value && (
                                        <span className="text-xs text-amber-400">{item.value}</span>
                                      )}
                                      <span className="ml-auto text-xs shrink-0">
                                        {item.collected ? "✅ collected" : "💰 loot"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* NPCs */}
                              {childNpcList.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide">👤 NPCs</div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    {childNpcList.map((n) => (
                                      <span
                                        key={n.id}
                                        className="inline-flex items-center gap-1 text-sm text-amber-500"
                                      >
                                        {n.name}
                                        <Link
                                          to="/realms/npcs/$npcId"
                                          params={{ npcId: n.id }}
                                          target="_blank"
                                          className="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/20 transition-colors"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ExternalLink className="size-3 text-muted-foreground" />
                                        </Link>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Remaining tags */}
                              {unmappedTags.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {unmappedTags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
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
