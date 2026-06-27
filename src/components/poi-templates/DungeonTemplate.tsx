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
  Lock,
  KeyRound,
  Eye,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { DispositionBadge } from "~/components/shared/DispositionBadge";
import { NPCMiniCard } from "~/components/shared/NPCMiniCard";
import { FactionChip } from "~/components/shared/FactionChip";
import { EncounterCascade } from "~/components/shared/EncounterCascade";
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
import type { KeyLockPair, Discovery, DiscoveryType, SpatialRoom } from "~/lib/dungeon/types";
import type { RollEncounterResult } from "@application/use-cases/RollEncounter";
import type { CascadeAction } from "@application/use-cases/RollEncounterCascade";
import type { EncounterRollResult } from "@domain/value-objects/EncounterRollResult";

const DISCOVERY_ICONS: Record<DiscoveryType, string> = {
  document: '\u{1F4C4}',
  evidence: '\u{1F50D}',
  clue: '\u{1F4A1}',
  secret: '\u{1F52E}',
};

const DISCOVERY_COLORS: Record<DiscoveryType, { border: string; bg: string; label: string }> = {
  document: { border: 'border-blue-500/20', bg: 'bg-blue-500/5', label: 'text-blue-400' },
  evidence: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', label: 'text-amber-400' },
  clue:     { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', label: 'text-emerald-400' },
  secret:   { border: 'border-purple-500/20', bg: 'bg-purple-500/5', label: 'text-purple-400' },
};

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

          {/* Abilities — render HTML from compendium (strong → bold, em → italic) */}
          {sb && sb.abilities && sb.abilities.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1">
              {sb.abilities.map((ability, i) => (
                <div
                  key={i}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: ability }}
                  className="[&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic"
                />
              ))}
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

function extractRoomActivity(description: string | undefined): string | null {
  if (!description) return null;
  const match = description.match(/Creatures here are (\w+)\./);
  return match ? match[1] : null;
}

interface RoomKeyLockInfo {
  /** Keys found in this room */
  keysHere: { keyName: string; unlocksPassageDesc: string }[];
  /** Locked passages in this room */
  locksHere: { keyName: string; keyRoomName: string }[];
}

function RoomDetailPanel({
  room,
  index,
  npcs,
  onUpdateNPC,
  siblings,
  onSelectChild,
  keyLockInfo,
  discoveries,
  onToggleDiscoveryFound,
}: {
  room: POI;
  index: number;
  npcs: NPC[];
  onUpdateNPC?: (npc: NPC) => void;
  siblings: POI[];
  onSelectChild?: (id: string) => void;
  keyLockInfo?: RoomKeyLockInfo;
  discoveries?: Discovery[];
  onToggleDiscoveryFound?: (discoveryId: string) => void;
}) {
  const unmappedTags = getUnmappedTags(room.tags);
  const connections = parseRoomConnections(room.description, siblings);
  const activity = extractRoomActivity(room.description);
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-3">
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

      {/* Keys & Locks */}
      {keyLockInfo && (keyLockInfo.keysHere.length > 0 || keyLockInfo.locksHere.length > 0) && (
        <div className="space-y-1">
          {keyLockInfo.keysHere.map((k, i) => (
            <div key={`key-${i}`} className="flex items-center gap-1.5 text-xs rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5">
              <KeyRound className="size-3.5 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-medium">Key:</span>
              <span className="text-foreground/80">{k.keyName} — unlocks {k.unlocksPassageDesc}</span>
            </div>
          ))}
          {keyLockInfo.locksHere.map((l, i) => (
            <div key={`lock-${i}`} className="flex items-center gap-1.5 text-xs rounded-md border border-red-500/30 bg-red-500/5 px-2 py-1.5">
              <Lock className="size-3.5 text-red-400 shrink-0" />
              <span className="text-red-400 font-medium">Locked:</span>
              <span className="text-foreground/80">key ({l.keyName}) in {l.keyRoomName}</span>
            </div>
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

      {/* Activity + Mood + Dimensions row */}
      {(activity || room.mood || room.roomWidth || room.roomLength) && (
        <div className="flex items-center gap-2 flex-wrap">
          {activity && (
            <Badge variant="secondary" className="text-xs capitalize">
              ⚡ {activity}
            </Badge>
          )}
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
                  <div className="flex items-start justify-between gap-2 px-2 pb-1.5">
                    <p className="text-xs text-muted-foreground italic flex-1">{item.description}</p>
                    {item.compendiumId && item.isMagic && !isScroll && (
                      <Link
                        to="/realms/compendium/magic-items/$itemId"
                        params={{ itemId: item.compendiumId }}
                        className="text-xs text-amber-500 hover:underline shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Details →
                      </Link>
                    )}
                    {item.compendiumId && item.isMagic && isScroll && (
                      <Link
                        to="/realms/compendium/spells/$spellId"
                        params={{ spellId: item.compendiumId }}
                        className="text-xs text-purple-400 hover:underline shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Spell →
                      </Link>
                    )}
                  </div>
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

      {/* Discoveries */}
      {discoveries && discoveries.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">! Discoveries</div>
          {discoveries.map((disc) => {
            const colors = DISCOVERY_COLORS[disc.type];
            return (
              <div key={disc.id} className={`rounded border ${colors.border} ${colors.bg} overflow-hidden`}>
                <button
                  className="w-full flex items-start gap-2 text-sm px-2 py-1.5 hover:bg-accent transition-colors text-left"
                  onClick={() => onToggleDiscoveryFound?.(disc.id)}
                >
                  {/* Found checkbox */}
                  <span className="shrink-0 mt-0.5">
                    {disc.found ? (
                      <CheckCircle2 className="size-4 text-green-500" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground/40" />
                    )}
                  </span>
                  {/* Type icon */}
                  <span className="text-base leading-none shrink-0">{DISCOVERY_ICONS[disc.type]}</span>
                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-xs font-medium uppercase tracking-wide ${colors.label}`}>
                      {disc.type}
                    </span>
                    <p className={`text-sm leading-snug ${disc.found ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {disc.description}
                    </p>
                    {disc.content && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">{disc.content}</p>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
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
  onRollCascade: (action: CascadeAction) => Promise<EncounterRollResult>;
  onSaveEncounterNpc?: () => Promise<void>;
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
  onRollCascade,
  onSaveEncounterNpc,
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

  // Key-lock lookup: map POI IDs to their key/lock info
  const keyLockByPoiId = (() => {
    const sd = poi.spatialDungeon;
    if (!sd?.keyLockPairs?.length) return new Map<string, RoomKeyLockInfo>();
    const roomPoiMap = sd.roomPoiMap ?? {};
    const rooms = sd.rooms ?? [];
    const passages = sd.passages ?? [];
    const roomNameById = new Map(rooms.map((r) => [r.id, r.name]));
    const result = new Map<string, RoomKeyLockInfo>();

    const getOrCreate = (poiId: string): RoomKeyLockInfo => {
      let info = result.get(poiId);
      if (!info) { info = { keysHere: [], locksHere: [] }; result.set(poiId, info); }
      return info;
    };

    for (const kl of sd.keyLockPairs) {
      const keyPoiId = roomPoiMap[kl.keyRoomId];
      const passage = passages.find((p) => p.id === kl.lockedPassageId);
      if (!passage) continue;

      // Figure out passage description (from→to room names)
      const fromName = roomNameById.get(passage.fromRoomId) ?? "?";
      const toName = roomNameById.get(passage.toRoomId) ?? "?";
      const passageDesc = `${passage.connectionType} between ${fromName} and ${toName}`;

      // Key room
      if (keyPoiId) {
        getOrCreate(keyPoiId).keysHere.push({ keyName: kl.keyName, unlocksPassageDesc: passageDesc });
      }

      // Locked room(s) — both sides of the passage
      const lockedPoiIds = [roomPoiMap[passage.fromRoomId], roomPoiMap[passage.toRoomId]].filter(Boolean);
      const keyRoomName = roomNameById.get(kl.keyRoomId) ?? "unknown room";
      for (const lockedPoiId of lockedPoiIds) {
        if (lockedPoiId !== keyPoiId) {
          getOrCreate(lockedPoiId).locksHere.push({ keyName: kl.keyName, keyRoomName });
        }
      }
    }
    return result;
  })();

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

  const [overviewOpen, setOverviewOpen] = useState(true);

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

  // Build reverse map: child POI id → spatial room (for discoveries)
  const poiIdToSpatialRoom = (() => {
    const map = new Map<string, SpatialRoom>();
    const sd = poi.spatialDungeon;
    if (!sd?.roomPoiMap) return map;
    for (const room of sd.rooms) {
      const childPoiId = sd.roomPoiMap[room.id];
      if (childPoiId) map.set(childPoiId, room);
    }
    return map;
  })();

  const getDiscoveriesForRoom = (childPoiId: string): Discovery[] => {
    return poiIdToSpatialRoom.get(childPoiId)?.discoveries ?? [];
  };

  const handleToggleDiscoveryFound = (childPoiId: string, discoveryId: string) => {
    const sd = poi.spatialDungeon;
    if (!sd) return;
    const spatialRoom = poiIdToSpatialRoom.get(childPoiId);
    if (!spatialRoom?.discoveries) return;
    const updatedRooms = sd.rooms.map((r) =>
      r.id === spatialRoom.id
        ? {
            ...r,
            discoveries: r.discoveries?.map((d) =>
              d.id === discoveryId ? { ...d, found: !d.found } : d
            ),
          }
        : r
    );
    db.pois.update(poi.id, {
      spatialDungeon: { ...sd, rooms: updatedRooms },
      updatedAt: Date.now(),
    });
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

      {/* Tabs */}
      <Tabs value={activeTab ?? "rooms"} onValueChange={onTabChange}>
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="rooms">
            <MapPin className="size-4" />
            Rooms ({childPois.length})
          </TabsTrigger>
          <TabsTrigger value="denizens">
            <Users className="size-4" />
            Denizens{allNPCs.length > 0 ? ` (${allNPCs.length})` : ''}
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
          {/* Overview — description + dungeon lore (collapsible, like settlement) */}
          {(() => {
            const ecology = poi.spatialDungeon?.ecology;
            const hasLore = !!(
              ecology &&
              (ecology.builderCulture ||
                ecology.currentInhabitants ||
                ecology.history ||
                (ecology.historyLayers?.length ?? 0) > 0)
            );
            const description = poi.description?.trim();
            if (!description && !hasLore) return null;
            return (
              <Collapsible open={overviewOpen} onOpenChange={setOverviewOpen}>
                <div className="rounded-lg border">
                  <CollapsibleTrigger asChild>
                    <button className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50">
                      <span className="flex items-center gap-2">
                        <ChevronRight
                          className={`size-4 text-muted-foreground transition-transform ${overviewOpen ? "rotate-90" : ""}`}
                        />
                        <Eye className="size-4 text-muted-foreground" />
                        Overview
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {poi.subtypeLabel && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {poi.subtypeLabel}
                          </Badge>
                        )}
                        {poi.floor != null && (
                          <Badge variant="outline" className="text-xs">
                            F{poi.floor}
                          </Badge>
                        )}
                      </span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 px-4 pb-3">
                      {description && (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                          {description}
                        </p>
                      )}
                      {hasLore && ecology && (
                        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">🏚</span>
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Dungeon Lore
                            </span>
                          </div>
                          {ecology.history && (
                            <p className="text-sm italic text-foreground">{ecology.history}</p>
                          )}
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {ecology.builderCulture && (
                              <span>
                                Built by:{" "}
                                <span className="font-medium capitalize text-foreground">
                                  {ecology.builderCulture}
                                </span>
                              </span>
                            )}
                            {ecology.currentInhabitants && (
                              <span>
                                Inhabitants:{" "}
                                <span className="font-medium capitalize text-foreground">
                                  {ecology.currentInhabitants}
                                </span>
                              </span>
                            )}
                          </div>
                          {ecology.historyLayers && ecology.historyLayers.length > 0 && (
                            <div className="space-y-1 border-t border-border pt-1">
                              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                History Layers
                              </span>
                              {ecology.historyLayers.map((layer, i) => (
                                <div key={i} className="text-xs">
                                  <span className="font-medium capitalize text-foreground">
                                    {layer.builders}
                                  </span>
                                  <span className="ml-1 text-muted-foreground">({layer.era})</span>
                                  {layer.fate && (
                                    <p className="ml-2 italic text-muted-foreground">{layer.fate}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })()}

          {/* Map — full width above the grid */}
          {mapSection && <div>{mapSection}</div>}

          {/* Rooms master–detail grid */}
          <div
            className={`grid gap-4 ${layout === "columns" ? "md:grid-cols-2" : ""}`}
          >
            {/* LEFT — Room list */}
            <div className="space-y-3">
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
                <div className="flex items-center gap-2">
                  {/* Add Room creates a list-only room with no spatial placement or
                      connection — only offer it when there's no spatial map. With a
                      map, rooms are created + connected in the map's edit mode. */}
                  {!poi.spatialDungeon && (
                    <Button size="sm" variant="outline" onClick={onCreateChild}>
                      <Plus className="mr-1.5 size-3.5" />
                      Add Room
                    </Button>
                  )}
                  {/* Layout toggle — hidden on mobile (always stacked) */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateLayout(layout === "columns" ? "stacked" : "columns")
                    }
                    className="hidden md:flex gap-1.5"
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
              </div>

              {/* Compact room cards */}
              {childPois.length > 0 ? (
                <div className="space-y-1.5">
                  {childPois.map((child, idx) => {
                    const isSelected = selectedChildId === child.id;
                    const childNpcList = npcsByPoiId[child.id] ?? [];
                    const hasActiveTraps = child.traps?.some((t) => !t.disarmed);
                    const hasUncollectedTreasure = child.treasure?.some((t) => !t.collected);
                    const roomDiscoveries = getDiscoveriesForRoom(child.id);
                    const hasUnfoundDiscoveries = roomDiscoveries.some((d) => !d.found);
                    const tagEmojis = getTagEmojis(child.tags);
                    const roomKL = keyLockByPoiId.get(child.id);
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
                            {hasUnfoundDiscoveries && (
                              <span title="Unfound discoveries" className="text-xs font-bold text-emerald-400">!</span>
                            )}
                            {childNpcList.length > 0 && (
                              <span title={`${childNpcList.length} NPC${childNpcList.length > 1 ? "s" : ""}`}><Users className="size-3.5 text-blue-400" /></span>
                            )}
                            {roomKL?.keysHere.length ? (
                              <span title={`Key: ${roomKL.keysHere.map(k => k.keyName).join(', ')}`}><KeyRound className="size-3.5 text-amber-400" /></span>
                            ) : null}
                            {roomKL?.locksHere.length ? (
                              <span title={`Locked passage`}><Lock className="size-3.5 text-red-400" /></span>
                            ) : null}
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

                        {/* Inline detail (stacked mode only) */}
                        {layout === "stacked" && isSelected && (
                          <div
                            className="mt-2.5 pt-2.5 border-t cursor-default"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <RoomDetailPanel
                              room={child}
                              index={idx}
                              npcs={childNpcList}
                              onUpdateNPC={onUpdateNPC}
                              siblings={childPois}
                              onSelectChild={onSelectChild}
                              keyLockInfo={roomKL}
                              discoveries={roomDiscoveries}
                              onToggleDiscoveryFound={(discoveryId) => handleToggleDiscoveryFound(child.id, discoveryId)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {poi.spatialDungeon
                    ? "No rooms yet. Use the map's edit mode to add and connect rooms."
                    : "No rooms mapped yet."}
                </p>
              )}
            </div>

            {/* RIGHT — Room detail panel (columns mode only; stacked renders inline in the card) */}
            {layout === "columns" && (
              <div className="space-y-3">
                <div ref={detailPanelRef} />
                {selectedRoom ? (
                  <RoomDetailPanel
                    room={selectedRoom}
                    index={selectedRoomIndex}
                    npcs={npcsByPoiId[selectedRoom.id] ?? []}
                    onUpdateNPC={onUpdateNPC}
                    siblings={childPois}
                    onSelectChild={onSelectChild}
                    keyLockInfo={keyLockByPoiId.get(selectedRoom.id)}
                    discoveries={getDiscoveriesForRoom(selectedRoom.id)}
                    onToggleDiscoveryFound={(discoveryId) => handleToggleDiscoveryFound(selectedRoom.id, discoveryId)}
                  />
                ) : childPois.length > 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Select a room to see details
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Wandering Monsters — full width below the grid */}
          <div>
            <WanderingMonsterTable
              entries={poi.wanderingMonsters ?? []}
              onSave={handleSaveWanderingMonsters}
              npcs={allNPCs}
              poiChildren={childPois}
              systemId={systemId}
              worldId={worldId}
              encounterChance={poi.encounterChance}
              onSaveEncounterChance={(n) =>
                db.pois.update(poi.id, { encounterChance: n, updatedAt: Date.now() })
              }
            />
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
                    <p className="text-xs font-medium text-muted-foreground">🎒 Gear</p>
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

          {/* ── Keys & Locks ── */}
          {poi.spatialDungeon?.keyLockPairs && poi.spatialDungeon.keyLockPairs.length > 0 && (() => {
            const sd = poi.spatialDungeon;
            const rooms = sd.rooms ?? [];
            const passages = sd.passages ?? [];
            const roomPoiMap = sd.roomPoiMap ?? {};
            const roomNameById = new Map(rooms.map((r) => [r.id, r.name]));
            return (
              <div className="space-y-2 rounded-md border p-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <KeyRound className="size-3.5" /> Keys & Locks ({sd.keyLockPairs!.length})
                </p>
                <div className="space-y-1.5">
                  {sd.keyLockPairs!.map((kl) => {
                    const passage = passages.find((p) => p.id === kl.lockedPassageId);
                    const fromName = passage ? roomNameById.get(passage.fromRoomId) ?? "?" : "?";
                    const toName = passage ? roomNameById.get(passage.toRoomId) ?? "?" : "?";
                    const keyRoomName = roomNameById.get(kl.keyRoomId) ?? "unknown";
                    const keyPoiId = roomPoiMap[kl.keyRoomId];
                    return (
                      <div key={kl.keyId} className="flex items-start gap-2 text-xs rounded border border-border/50 px-2 py-1.5">
                        <KeyRound className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-0.5">
                          <p className="font-medium">{kl.keyName}</p>
                          <p className="text-muted-foreground">
                            Found in{' '}
                            {keyPoiId ? (
                              <button
                                className="text-blue-400 hover:underline"
                                onClick={() => { onSelectChild(keyPoiId); onTabChange?.('rooms'); }}
                              >
                                {keyRoomName}
                              </button>
                            ) : (
                              <span>{keyRoomName}</span>
                            )}
                            {' · unlocks '}
                            {passage?.connectionType ?? 'passage'} between {fromName} and {toName}
                          </p>
                        </div>
                        <Lock className="size-3.5 text-red-400 shrink-0 mt-0.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Creature Roster — compact battle reference ── */}
          {(() => {
            const creatures = allNPCs.filter((n) => n.tags?.includes('creature'))
            if (creatures.length === 0) return null
            return (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Skull className="size-3.5" /> Creatures ({creatures.length})
                </p>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Room</th>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Creature</th>
                        <th className="text-center px-2 py-1.5 font-medium text-muted-foreground w-10">AC</th>
                        <th className="text-center px-2 py-1.5 font-medium text-muted-foreground w-14">HP</th>
                        <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Attack</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creatures.map((npc, i) => {
                        const sb = npc.systemBlock
                        const roomName = npc.poiId ? poiNameMap.get(npc.poiId) ?? '—' : '—'
                        const isDead = npc.lifeStatus !== 'alive'
                        return (
                          <tr key={npc.id} className={`border-t ${i % 2 === 0 ? '' : 'bg-muted/20'} ${isDead ? 'opacity-40' : ''}`}>
                            <td className="px-2 py-1.5 truncate max-w-[100px]">
                              {npc.poiId ? (
                                <Link to="/realms/pois/$poiId" params={{ poiId: npc.poiId }} className="text-muted-foreground hover:underline">{roomName}</Link>
                              ) : (
                                <span className="text-muted-foreground">{roomName}</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <Link to="/realms/npcs/$npcId" params={{ npcId: npc.id }} className="font-medium hover:underline text-foreground">
                                {npc.name}
                              </Link>
                            </td>
                            <td className="px-2 py-1.5 text-center font-mono">{sb?.armor ?? '—'}</td>
                            <td className="px-2 py-1.5 text-center">
                              {sb && sb.maxHp > 0 ? (
                                <span className={`font-mono ${sb.hp <= sb.maxHp * 0.25 ? 'text-destructive' : sb.hp <= sb.maxHp * 0.5 ? 'text-amber-400' : 'text-green-500'}`}>
                                  {sb.hp}/{sb.maxHp}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">
                              {sb?.attacks?.[0] ? `${sb.attacks[0].name} ${sb.attacks[0].damage}` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}

          {/* ── Named NPCs — role-play opportunities ── */}
          {(() => {
            const named = allNPCs.filter((n) => !n.tags?.includes('creature'))
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Heart className="size-3.5" /> Named NPCs ({named.length})
                  </p>
                  <Button size="sm" variant="outline" onClick={onCreateNPC}>
                    <Plus className="mr-1.5 size-3.5" />
                    Add NPC
                  </Button>
                </div>
                {named.length > 0 ? (
                  <div className="space-y-1.5">
                    {named.map((npc) => {
                      const roomName = npc.poiId ? poiNameMap.get(npc.poiId) : undefined
                      const sb = npc.systemBlock
                      const wants = npc.want ? npc.want.split(',').map((w) => w.trim()).filter(Boolean) : []
                      return (
                        <div key={npc.id} className="rounded-md border bg-card/50 overflow-hidden">
                          {/* Header row */}
                          <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
                            <Heart className={`size-3.5 shrink-0 ${npc.lifeStatus === 'alive' ? 'text-green-500 fill-green-500' : 'text-muted-foreground'}`} />
                            <Link to="/realms/npcs/$npcId" params={{ npcId: npc.id }} className="font-medium text-sm text-amber-500 hover:underline">
                              {npc.name}
                            </Link>
                            <DispositionBadge npc={npc} />
                            {/* Stats */}
                            {sb && sb.maxHp > 0 && (
                              <Badge variant="outline" className="text-xs font-mono gap-1 ml-auto">
                                <Heart className="size-2.5" /> {sb.hp}/{sb.maxHp}
                              </Badge>
                            )}
                            {sb && sb.armor > 0 && (
                              <Badge variant="outline" className="text-xs font-mono gap-1">
                                <Shield className="size-2.5" /> {sb.armor}
                              </Badge>
                            )}
                          </div>
                          {/* Details row */}
                          <div className="px-3 pb-2 space-y-1.5 border-t border-border/30 pt-1.5">
                            {roomName && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="size-3 shrink-0" />
                                {npc.poiId ? (
                                  <Link to="/realms/pois/$poiId" params={{ poiId: npc.poiId }} className="hover:underline">{roomName}</Link>
                                ) : (
                                  roomName
                                )}
                              </div>
                            )}
                            {wants.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs text-muted-foreground mr-0.5">Wants:</span>
                                {wants.map((w) => (
                                  <Badge key={w} variant="secondary" className="text-xs capitalize px-1.5 py-0">{w}</Badge>
                                ))}
                              </div>
                            )}
                            {npc.description && (
                              <p className="text-xs text-muted-foreground italic leading-snug line-clamp-2">{npc.description}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No named NPCs yet.</p>
                )}
              </div>
            )
          })()}

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
          <EncounterCascade
            table={encounterTable}
            onRollCascade={onRollCascade}
            onSaveNpc={onSaveEncounterNpc}
            onSaveTable={onSaveEncounterTable}
            onRoll={onRollEncounter}
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
