import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { markdownOptions } from "~/shared/markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  MapPin,
  Users,
  Lock,
  Plus,
  FileText,
  Dices,
  CalendarClock,
  Trash2,
} from "lucide-react";
import { NPCMiniCard } from "~/components/shared/NPCMiniCard";
import { FactionChip } from "~/components/shared/FactionChip";
import { ServicesList } from "~/components/shared/ServicesList";
import { ReadAloudBlock } from "~/components/shared/ReadAloudBlock";
import { SensoryBlock } from "~/components/shared/SensoryBlock";
import { AtAGlancePanel } from "~/components/shared/AtAGlancePanel";
import { EncounterTableUI } from "~/components/shared/EncounterTableUI";
import type { POI } from "@domain/entities/POI";
import type { NPC } from "@domain/entities/NPC";
import type { FactionPresence } from "@domain/entities/FactionPresence";
import type { ResolvedPath } from "~/ui/hooks/useResolvedPaths";
import type { POIEvent } from "@domain/entities/POIEvent";
import type { EncounterTable } from "@domain/entities/EncounterTable";
import type { RollEncounterResult } from "@application/use-cases/RollEncounter";

interface BuildingTemplateProps {
  poi: POI;
  children: POI[];
  npcs: NPC[];
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
  mapSection: React.ReactNode;
  notesSection?: React.ReactNode;
}

export function BuildingTemplate({
  poi,
  children: childPois,
  npcs,
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
  mapSection,
  notesSection,
}: BuildingTemplateProps) {
  const activeEvents = poiEvents.filter((e) => e.isActive).length;

  return (
    <div className="space-y-4">
      {/* Header */}
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
      />

      {/* Services inline */}
      {poi.services.length > 0 && <ServicesList services={poi.services} />}

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
          <TabsTrigger value="encounters">
            <Dices className="size-4" />
            Encounters
          </TabsTrigger>
          <TabsTrigger value="secrets">
            <Lock className="size-4" />
            GM Notes
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="size-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 pt-3">
          <ReadAloudBlock text={poi.readAloud} />

          {poi.description && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown {...markdownOptions}>
                {poi.description}
              </ReactMarkdown>
            </div>
          )}

          <SensoryBlock text={poi.sensory} />

          {mapSection}

          {/* Child locations (rooms/floors) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">
                Rooms & Areas ({childPois.length})
              </h4>
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
                        <span className="text-sm font-medium">
                          {child.name}
                        </span>
                        {child.floor !== null && (
                          <Badge variant="outline" className="text-xs ml-2">
                            Floor {child.floor}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {child.type}
                      </Badge>
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
        <TabsContent value="npcs" className="space-y-4 pt-3">
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
              {npcs.map((npc) => (
                <NPCMiniCard key={npc.id} npc={npc} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No NPCs here.</p>
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

        {/* Encounters */}
        <TabsContent value="encounters" className="pt-3">
          <EncounterTableUI
            table={encounterTable}
            onRoll={onRollEncounter}
            onSave={onSaveEncounterTable}
          />
        </TabsContent>

        {/* Secrets */}
        <TabsContent value="secrets" className="space-y-4 pt-3">
          {poi.gmNotes ? (
            <div>
              <h4 className="text-sm font-semibold mb-1">GM Notes</h4>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown {...markdownOptions}>
                  {poi.gmNotes}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No secrets recorded.
            </p>
          )}

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
        </TabsContent>

        {/* Notes tab */}
        <TabsContent value="notes" className="pt-3">
          {notesSection}
        </TabsContent>
      </Tabs>
    </div>
  );
}
