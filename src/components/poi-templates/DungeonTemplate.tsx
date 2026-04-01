import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { markdownOptions } from "~/shared/markdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
  ChevronRight,
  ChevronUp,
  AlertTriangle,
  Gem,
  CheckCircle2,
  Circle,
  Heart,
  Skull,
  Shield,
  Swords,
  Minus,
} from "lucide-react";
import { DispositionBadge } from "~/components/shared/DispositionBadge";
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

function RoomNPCCard({ npc, onUpdateNPC }: { npc: NPC; onUpdateNPC?: (npc: NPC) => void }) {
  const sb = npc.systemBlock;
  const isDead = npc.lifeStatus !== "alive";
  const [expanded, setExpanded] = useState(false);
  const [editingHp, setEditingHp] = useState(false);
  const [hpInput, setHpInput] = useState("");

  const updateHp = (newHp: number) => {
    if (!onUpdateNPC || !sb) return;
    const clamped = Math.max(0, Math.min(newHp, sb.maxHp));
    onUpdateNPC({ ...npc, systemBlock: { ...sb, hp: clamped } });
  };

  const commitHpEdit = () => {
    if (!sb) return;
    const val = parseInt(hpInput);
    if (!isNaN(val)) updateHp(val);
    setEditingHp(false);
  };

  return (
    <div className={`rounded-md border bg-card/50 ${isDead ? "opacity-50" : ""}`}>
      {/* Header: Name + HP/AC — always visible, clickable to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full p-2.5 text-left hover:bg-muted-foreground/5 transition-colors"
      >
        <ChevronRight className={`size-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
        {isDead ? (
          <Skull className="size-3.5 text-muted-foreground shrink-0" />
        ) : npc.tags?.includes('creature') ? (
          <Skull className="size-3.5 text-red-400 shrink-0" />
        ) : (
          <Heart className="size-3.5 text-green-500 fill-green-500 shrink-0" />
        )}
        <Link
          to="/realms/npcs/$npcId"
          params={{ npcId: npc.id }}
          className="font-medium text-amber-500 hover:underline truncate text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {npc.name}
        </Link>
        <DispositionBadge npc={npc} onUpdateNPC={onUpdateNPC} />
        {/* HP + AC on right */}
        {sb && (
          <span className="ml-auto flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {sb.maxHp > 0 && (
              <span className="inline-flex items-center gap-0.5">
                {onUpdateNPC && (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateHp(sb.hp - 1); }}
                    className="size-6 rounded flex items-center justify-center hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Minus className="size-3" />
                  </button>
                )}
                {editingHp ? (
                  <Input
                    type="number"
                    value={hpInput}
                    onChange={(e) => setHpInput(e.target.value)}
                    onBlur={commitHpEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitHpEdit();
                      if (e.key === "Escape") setEditingHp(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-12 h-6 text-xs font-mono text-center px-0.5"
                    autoFocus
                  />
                ) : (
                  <Badge
                    variant={sb.hp <= sb.maxHp * 0.25 ? "destructive" : sb.hp <= sb.maxHp * 0.5 ? "secondary" : "outline"}
                    className={`text-xs font-mono px-2 py-0.5 gap-1 ${onUpdateNPC ? "cursor-pointer" : ""}`}
                    onClick={onUpdateNPC ? (e) => {
                      e.stopPropagation();
                      setHpInput(String(sb.hp));
                      setEditingHp(true);
                    } : undefined}
                  >
                    <Heart className="size-3" />
                    {sb.hp}/{sb.maxHp}
                  </Badge>
                )}
                {onUpdateNPC && (
                  <button
                    onClick={(e) => { e.stopPropagation(); updateHp(sb.hp + 1); }}
                    className="size-6 rounded flex items-center justify-center hover:bg-green-500/20 text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    <Plus className="size-3" />
                  </button>
                )}
              </span>
            )}
            {sb.armor > 0 && (
              <Badge variant="outline" className="text-xs font-mono px-2 py-0.5 gap-1">
                <Shield className="size-3" />
                {sb.armor}
              </Badge>
            )}
          </span>
        )}
      </button>

      {/* Collapsible body */}
      {expanded && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-border/50 pt-2">
          {/* Attacks */}
          {sb && sb.attacks.length > 0 && (
            <div className="space-y-1">
              {sb.attacks.map((atk, i) => (
                <div key={i} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <Swords className="size-3 text-red-400 shrink-0" />
                    <span className="font-medium">{atk.name}</span>
                  </div>
                  <div className="pl-5 text-muted-foreground">
                    <span className="font-mono">{atk.damage}</span>
                    {atk.description && <span className="ml-1">{atk.description}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Abilities — bold the name before the first colon */}
          {sb && sb.abilities && sb.abilities.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              {sb.abilities.map((ability, i) => {
                const colonIdx = ability.indexOf(':')
                if (colonIdx > 0 && colonIdx < 30) {
                  return (
                    <div key={i}>
                      <span className="font-semibold text-foreground">{ability.slice(0, colonIdx)}</span>
                      <span>{ability.slice(colonIdx)}</span>
                    </div>
                  )
                }
                return <div key={i}>{ability}</div>
              })}
            </div>
          )}

          {/* Description — eye icon + lore text, activity as badge */}
          {npc.description && (() => {
            const [lore, ...rest] = npc.description.split('\n\nActivity:')
            const activity = rest.length > 0 ? rest.join('').trim() : null
            return (
              <div className="space-y-1.5 pt-1 border-t border-border/30">
                {lore && (
                  <p className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="shrink-0 mt-0.5">👁</span>
                    <span>{lore.trim()}</span>
                  </p>
                )}
                {activity && (
                  <span className="inline-block text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground capitalize">
                    {activity}
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  );
}

function parseRoomConnections(description: string, siblings: POI[]) {
  if (!description) return [];
  const segments = description.split('|').map((s) => s.trim());
  return segments.map((seg) => {
    const match = seg.match(/^([NSEW]+)\s*→\s*(.+)$/);
    if (!match) return { dir: '', label: seg, roomId: null };
    const dir = match[1];
    const label = match[2];
    // Try to match by room number prefix
    const numMatch = label.match(/^(\d+)\./);
    let roomId: string | null = null;
    if (numMatch) {
      const num = numMatch[1];
      const sibling = siblings.find((s) => s.name.startsWith(num + '.'));
      if (sibling) roomId = sibling.id;
    }
    return { dir, label, roomId };
  });
}

function RoomDetailPanel({
  room,
  index,
  npcs,
  onUpdateNPC,
  siblings,
  onSelectChild,
}: {
  room: POI;
  index: number;
  npcs: NPC[];
  onUpdateNPC?: (npc: NPC) => void;
  siblings: POI[];
  onSelectChild?: (id: string) => void;
}) {
  const unmappedTags = getUnmappedTags(room.tags);
  const connections = parseRoomConnections(room.description, siblings);
  return (
    <div className="rounded-md border bg-card p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-muted-foreground">{index + 1}.</span>
        <h4 className="text-sm font-semibold truncate">{room.name}</h4>
        <Link
          to="/realms/pois/$poiId"
          params={{ poiId: room.id }}
          className="ml-auto inline-flex items-center justify-center size-6 rounded-md hover:bg-muted-foreground/20 transition-colors shrink-0"
        >
          <ExternalLink className="size-3.5 text-muted-foreground" />
        </Link>
      </div>

      {/* Room Connections */}
      {connections.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {connections.map((conn, i) => (
            conn.roomId ? (
              <button
                key={i}
                onClick={() => onSelectChild?.(conn.roomId!)}
                className="inline-flex items-center gap-1 text-xs rounded-md border px-1.5 py-0.5 hover:bg-muted-foreground/20 transition-colors text-blue-400 hover:text-blue-300"
              >
                <span className="font-mono text-muted-foreground">{conn.dir}</span>
                <span>{conn.label}</span>
              </button>
            ) : (
              <span key={i} className="inline-flex items-center gap-1 text-xs rounded-md border px-1.5 py-0.5 text-muted-foreground">
                <span className="font-mono">{conn.dir}</span>
                <span>{conn.label}</span>
              </span>
            )
          ))}
        </div>
      )}

      {/* Read Aloud */}
      {room.readAloud && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
          <div className="text-xs font-medium text-amber-500 mb-1">📖 Read Aloud</div>
          <div className="text-sm italic text-foreground/80 leading-relaxed prose prose-sm prose-invert max-w-none">
            <ReactMarkdown {...markdownOptions}>{room.readAloud}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Sensory */}
      {room.sensory && (
        <p className="text-sm italic text-muted-foreground">
          👃 {room.sensory}
        </p>
      )}

      {/* Mood + Dimensions row */}
      {(room.mood || room.roomWidth || room.roomLength) && (
        <div className="flex items-center gap-2 flex-wrap">
          {room.mood && (
            <Badge variant="secondary" className="text-xs">
              🎭 {room.mood}
            </Badge>
          )}
          {(room.roomWidth || room.roomLength) && (
            <Badge variant="outline" className="text-xs">
              📐 {room.roomWidth && room.roomLength
                ? `${room.roomWidth} × ${room.roomLength} ft`
                : `${room.roomWidth ?? room.roomLength} ft`}
            </Badge>
          )}
        </div>
      )}

      {/* Traps */}
      {room.traps?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-amber-500 uppercase tracking-wide">⚠️ Traps</div>
          {room.traps.map((trap) => (
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
      {room.treasure?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">💎 Treasure</div>
          {room.treasure.map((item) => {
            const isScroll = item.name.startsWith('Scroll of')
            const isWeapon = item.description?.includes('Damage:')
            const isGear = !item.isMagic && !isWeapon && item.description?.startsWith('Condition:')
            const icon = item.collected ? '✅'
              : item.isMagic && isScroll ? '📜'
              : item.isMagic ? '✨'
              : isWeapon ? '⚔'
              : isGear ? '🎒'
              : '💰'
            return (
              <div key={item.id} className="rounded border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
                <button
                  className="w-full flex items-center gap-2 text-sm px-2 py-1.5 hover:bg-emerald-500/10 transition-colors text-left"
                  onClick={() => {
                    const updated = room.treasure.map((t) =>
                      t.id === item.id ? { ...t, collected: !t.collected } : t
                    )
                    db.pois.update(room.id, { treasure: updated, updatedAt: Date.now() })
                  }}
                >
                  <span className="text-base leading-none shrink-0">{icon}</span>
                  <span className={item.collected ? 'line-through text-muted-foreground flex-1' : 'flex-1'}>
                    {item.name}
                    {item.quantity > 1 && ` (×${item.quantity})`}
                  </span>
                  {item.value && <span className="text-xs text-amber-400 shrink-0">{item.value}</span>}
                  {isWeapon && item.description && (
                    <span className="text-xs text-muted-foreground shrink-0">{item.description.replace('Damage: ', '')}</span>
                  )}
                </button>
                {item.description && !isWeapon && (
                  <p className="text-xs text-muted-foreground px-2 pb-1.5 italic">{item.description}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Creatures (battle encounters) */}
      {npcs.filter((n) => n.tags?.includes('creature')).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-red-400 uppercase tracking-wide">⚔ Creatures</div>
          <div className="space-y-2">
            {npcs.filter((n) => n.tags?.includes('creature')).map((n) => (
              <RoomNPCCard key={n.id} npc={n} onUpdateNPC={onUpdateNPC} />
            ))}
          </div>
        </div>
      )}

      {/* NPCs (roleplay opportunities) */}
      {npcs.filter((n) => !n.tags?.includes('creature')).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide">👤 Denizens</div>
          <div className="space-y-2">
            {npcs.filter((n) => !n.tags?.includes('creature')).map((n) => (
              <RoomNPCCard key={n.id} npc={n} onUpdateNPC={onUpdateNPC} />
            ))}
          </div>
        </div>
      )}

      {/* GM Notes */}
      {room.gmNotes && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wide">📋 GM Notes</div>
          <div className="rounded border border-purple-500/20 bg-purple-500/5 p-2.5 prose prose-sm prose-invert max-w-none">
            <ReactMarkdown {...markdownOptions}>{room.gmNotes}</ReactMarkdown>
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
  );
}

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
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  mapSection: React.ReactNode;
  notesSection?: React.ReactNode;
  compendiumSection?: React.ReactNode;
  dungeonEventsPanel?: React.ReactNode;
  /** System ID for bestiary search */
  systemId?: string | null;
  /** World ID for custom compendium entries */
  worldId?: string | null;
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
  activeTab,
  onTabChange,
  mapSection,
  notesSection,
  compendiumSection,
  dungeonEventsPanel,
  systemId,
  worldId,
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

  const selectedRoom = selectedChildId
    ? childPois.find((c) => c.id === selectedChildId) ?? null
    : null;
  const selectedRoomIndex = selectedRoom ? childPois.indexOf(selectedRoom) : -1;

  const detailPanelRef = useRef<HTMLDivElement>(null);

  // Scroll to detail panel when a room is selected
  useEffect(() => {
    if (selectedChildId && detailPanelRef.current) {
      detailPanelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedChildId]);

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

      {/* Dungeon Lore — shows generated ecology data (above tabs, always visible) */}
      {poi.spatialDungeon?.ecology && (() => {
        const { builderCulture, currentInhabitants, history, historyLayers } = poi.spatialDungeon.ecology
        if (!builderCulture && !currentInhabitants && !history) return null
        return (
          <div className="rounded-lg border border-stone-600/50 bg-stone-900/40 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs">🏚</span>
              <span className="text-xs font-semibold text-stone-300 uppercase tracking-wide">Dungeon Lore</span>
            </div>
            {history && (
              <p className="text-sm italic text-stone-300">{history}</p>
            )}
            <div className="flex gap-4 text-xs text-stone-400">
              {builderCulture && (
                <span>Built by: <span className="text-stone-200 font-medium capitalize">{builderCulture}</span></span>
              )}
              {currentInhabitants && (
                <span>Inhabitants: <span className="text-stone-200 font-medium capitalize">{currentInhabitants}</span></span>
              )}
            </div>
            {historyLayers && historyLayers.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-stone-700">
                <span className="text-xs text-stone-500 uppercase tracking-wide">History Layers</span>
                {historyLayers.map((layer, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-stone-300 capitalize">{layer.builders}</span>
                    <span className="text-stone-500 ml-1">({layer.era})</span>
                    {layer.fate && <p className="text-stone-400 italic ml-2">{layer.fate}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Tabs */}
      <Tabs value={activeTab ?? "rooms"} onValueChange={onTabChange}>
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="rooms">
            <MapPin className="size-4" />
            Rooms ({childPois.length})
          </TabsTrigger>
          <TabsTrigger value="denizens">
            <Users className="size-4" />
            Details
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
            {/* Map + Wandering Monsters — sticky in columns mode */}
            <div className={layout === "columns" ? "md:sticky md:top-0 md:self-start" : ""}>
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
                  npcs={allNPCs}
                  poiChildren={childPois}
                  systemId={systemId}
                  worldId={worldId}
                />
              </div>
            </div>

            {/* Detail panel + Room list */}
            <div className="space-y-3">
              {/* Room detail panel */}
              <div ref={detailPanelRef} />
              {selectedRoom ? (
                <RoomDetailPanel
                  room={selectedRoom}
                  index={selectedRoomIndex}
                  npcs={npcsByPoiId[selectedRoom.id] ?? []}
                  onUpdateNPC={onUpdateNPC}
                  siblings={childPois}
                  onSelectChild={onSelectChild}
                />
              ) : childPois.length > 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Select a room to see details
                </div>
              ) : null}

              {/* Room list header */}
              <div className="flex items-center justify-between">
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

              {/* Compact room cards */}
              {childPois.length > 0 ? (
                <div className="space-y-1.5">
                  {childPois.map((child, idx) => {
                    const isSelected = selectedChildId === child.id;
                    const childNpcList = npcsByPoiId[child.id] ?? [];
                    const hasActiveTraps = child.traps?.some((t) => !t.disarmed);
                    const hasUncollectedTreasure = child.treasure?.some((t) => !t.collected);
                    const tagEmojis = getTagEmojis(child.tags);
                    return (
                      <div
                        key={child.id}
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
                          <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
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
                          <ChevronRight className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
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
                            {child.subtypeLabel && (
                              <Badge variant="outline" className="text-xs">
                                {child.subtypeLabel}
                              </Badge>
                            )}
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
                      </div>
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

        {/* Details tab */}
        <TabsContent value="denizens" className="space-y-4 pt-3">
          {/* At A Glance stats — aggregate dungeon status */}
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

          {/* Treasure manifest — all notable loot across rooms */}
          {(() => {
            const allLoot = childPois.flatMap((c) =>
              (c.treasure ?? []).map((t) => ({ ...t, roomName: c.name }))
            )
            const weapons  = allLoot.filter((t) => !t.isMagic && t.description?.startsWith('Damage:'))
            const gear     = allLoot.filter((t) => !t.isMagic && !t.description?.startsWith('Damage:') && t.value === '')
            const magic    = allLoot.filter((t) => t.isMagic && !t.name.startsWith('Scroll of'))
            const scrolls  = allLoot.filter((t) => t.isMagic && t.name.startsWith('Scroll of'))
            if (weapons.length + gear.length + magic.length + scrolls.length === 0) return null
            return (
              <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loot Manifest</p>
                {magic.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-amber-400">✨ Magic Items</p>
                    {magic.map((t) => (
                      <div key={t.id} className={`flex items-center gap-2 text-xs ${t.collected ? 'line-through text-muted-foreground' : ''}`}>
                        <span className="font-medium flex-1">{t.name}</span>
                        <span className="text-muted-foreground">{t.roomName}</span>
                      </div>
                    ))}
                  </div>
                )}
                {scrolls.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-purple-400">📜 Spell Scrolls</p>
                    {scrolls.map((t) => (
                      <div key={t.id} className={`flex items-center gap-2 text-xs ${t.collected ? 'line-through text-muted-foreground' : ''}`}>
                        <span className="font-medium flex-1">{t.name}</span>
                        <span className="text-muted-foreground">{t.roomName}</span>
                      </div>
                    ))}
                  </div>
                )}
                {weapons.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-red-400">⚔ Weapons</p>
                    {weapons.map((t) => (
                      <div key={t.id} className={`flex items-center gap-2 text-xs ${t.collected ? 'line-through text-muted-foreground' : ''}`}>
                        <span className="font-medium flex-1">{t.name}</span>
                        <span className="text-muted-foreground">{t.description?.replace('Damage: ', '')} · {t.roomName}</span>
                      </div>
                    ))}
                  </div>
                )}
                {gear.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-stone-400">🎒 Gear</p>
                    {gear.map((t) => (
                      <div key={t.id} className={`flex items-center gap-2 text-xs ${t.collected ? 'line-through text-muted-foreground' : ''}`}>
                        <span className="font-medium flex-1">{t.name}</span>
                        <span className="text-muted-foreground">{t.roomName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
