import ReactMarkdown from "react-markdown";
import { markdownOptions } from "~/shared/markdown";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Users, Plus, CalendarClock, Trash2, Book } from "lucide-react";
import { NPCMiniCard } from "~/components/shared/NPCMiniCard";
import { FactionChip } from "~/components/shared/FactionChip";
import { ReadAloudBlock } from "~/components/shared/ReadAloudBlock";
import { SensoryBlock } from "~/components/shared/SensoryBlock";
import { AtAGlancePanel } from "~/components/shared/AtAGlancePanel";
import type { POI } from "@domain/entities/POI";
import type { NPC } from "@domain/entities/NPC";
import type { FactionPresence } from "@domain/entities/FactionPresence";
import type { ResolvedPath } from "~/ui/hooks/useResolvedPaths";
import type { POIEvent } from "@domain/entities/POIEvent";
import { Card } from "../ui/card";

interface DungeonRoomTemplateProps {
  poi: POI;
  npcs: NPC[];
  factionPresences: FactionPresence[];
  paths: ResolvedPath[];
  poiEvents: POIEvent[];
  parentMapSection: React.ReactNode;
  onCreateNPC: () => void;
  onCreateEvent: () => void;
  onDeleteEvent: (id: string) => void;
  onUpdateNPC?: (npc: NPC) => void;
  compendiumSection?: React.ReactNode;
  trapSection?: React.ReactNode;
  treasureSection?: React.ReactNode;
  dungeonEventsPanel?: React.ReactNode;
  notesSection?: React.ReactNode;
}

function extractRoomActivity(description: string | undefined): string | null {
  if (!description) return null;
  const match = description.match(/Creatures here are (\w+)\./);
  return match ? match[1] : null;
}

export function DungeonRoomTemplate({
  poi,
  npcs,
  factionPresences,
  paths,
  poiEvents,
  parentMapSection,
  onCreateNPC,
  onCreateEvent,
  onDeleteEvent,
  onUpdateNPC,
  compendiumSection,
  trapSection,
  treasureSection,
  dungeonEventsPanel,
  notesSection,
}: DungeonRoomTemplateProps) {
  const activeEvents = poiEvents.filter((e) => e.isActive).length;
  const activity = extractRoomActivity(poi.description);

  return (
    <div className="space-y-4">
      {/* Dungeon Map (from parent) */}
      {parentMapSection}

      <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <SensoryBlock text={poi.sensory} />

          {activity && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs capitalize">
                ⚡ {activity}
              </Badge>
            </div>
          )}

          <ReadAloudBlock text={poi.readAloud} />
          {poi.description && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown {...markdownOptions}>
                {poi.description}
              </ReactMarkdown>
            </div>
          )}
        </Card>
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
          roomWidth={poi.roomWidth}
          roomLength={poi.roomLength}
          treasure={poi.treasure}
          lightLevel={poi.lightLevel}
        />
      </div>

      {/* Denizens */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Users className="size-4" />
            Denizens ({npcs.length})
          </h4>
          <Button size="sm" variant="outline" onClick={onCreateNPC}>
            <Plus className="mr-1.5 size-3.5" />
            Add NPC
          </Button>
        </div>
        {npcs.length > 0 ? (
          <div className="space-y-2">
            {npcs.map((npc) => (
              <NPCMiniCard key={npc.id} npc={npc} onUpdateNPC={onUpdateNPC} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No denizens present.</p>
        )}

        {factionPresences.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold mb-2">Faction Presence</h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              {factionPresences.map((fp) => (
                <FactionChip key={fp.id} presence={fp} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Compendium */}
      {compendiumSection}

      {/* Traps */}
      {trapSection}

      {/* Treasure */}
      {treasureSection}

      {/* Dungeon Events Check */}
      {dungeonEventsPanel}

      {/* Events */}
      {poiEvents.length > 0 && (
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
          <div className="space-y-2">
            {poiEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2 rounded-md border p-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{event.name}</span>
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
        </div>
      )}

      {/* Notes */}
      {notesSection}
    </div>
  );
}
