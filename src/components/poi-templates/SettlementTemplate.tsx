import { useMemo, useState, useRef, useEffect, type ReactNode } from "react";
import { useHookResolver } from "~/ui/hooks/useHookResolver";
import { useLinkableEntities } from "~/ui/hooks/useLinkableEntities";
import type { EntityLink } from "@domain/value-objects/EntityLink";
import { Link } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
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
  Columns2,
  Rows2,
  ChevronRight,
  Eye,
  ShoppingBag,
  Gem,
  Sparkles,
  ShieldAlert,
  Landmark,
  RefreshCw,
  Skull,
} from "lucide-react";
import { NPCMiniCard } from "~/components/shared/NPCMiniCard";
import { WealthBadge } from "~/components/shared/WealthBadge";
import { RumorList } from "~/components/shared/RumorList";
import { NoticeBoard } from "~/components/shared/NoticeBoard";
import { EncounterCascade } from "~/components/shared/EncounterCascade";
import { ServicesList } from "~/components/shared/ServicesList";
import { POI_TYPE_ICONS } from "@shared/poi-icons";
import { settlementSize } from "@domain/data/worldgen/settlementSize";
import { formatDistance } from "~/lib/hexmap/travel";
import type { POI } from "@domain/entities/POI";
import type { ResolvedPath } from "~/ui/hooks/useResolvedPaths";
import type { NPC } from "@domain/entities/NPC";
import type { Rumor } from "@domain/entities/Rumor";
import type { Notice } from "@domain/entities/Notice";
import type { EncounterTable } from "@domain/entities/EncounterTable";
import type { POIEvent } from "@domain/entities/POIEvent";
import type { GameMap } from "@domain/entities/GameMap";
import type { Faction } from "@domain/entities/Faction";
import type { FactionPresence } from "@domain/entities/FactionPresence";

// Territory presence type → badge tint (controlled vs contested at a glance).
const PRESENCE_TYPE_COLORS: Record<string, string> = {
  controls: "border-emerald-500/60 text-emerald-400",
  operates: "border-blue-500/60 text-blue-400",
  contests: "border-red-500/60 text-red-400",
  patrols: "border-amber-500/60 text-amber-400",
  hidden: "border-purple-500/60 text-purple-400",
};
import type { TreasureItem } from "@domain/value-objects/TreasureItem";
import {
  OPPOSITE_DIRECTION,
  type Direction,
  type NoticeType,
} from "@shared/constants";
import type { RollEncounterResult } from "@application/use-cases/RollEncounter";
import type { CascadeAction } from "@application/use-cases/RollEncounterCascade";
import type { EncounterRollResult } from "@domain/value-objects/EncounterRollResult";

type SettlementTab =
  | "locations"
  | "denizens"
  | "rumors"
  | "encounters"
  | "events"
  | "notes";

const SETTLEMENT_TABS: readonly SettlementTab[] = [
  "locations",
  "denizens",
  "rumors",
  "encounters",
  "events",
  "notes",
];

function isSettlementTab(
  value: string | null | undefined,
): value is SettlementTab {
  return SETTLEMENT_TABS.includes(value as SettlementTab);
}

function LocationDetailContent({
  location,
  npcs,
  onUpdateNPC,
  onUpdateTreasure,
}: {
  location: POI;
  npcs: NPC[];
  onUpdateNPC?: (npc: NPC) => void;
  onUpdateTreasure?: (
    location: POI,
    treasure: TreasureItem[],
  ) => void | Promise<void>;
}) {
  const handleToggleTreasure = (itemId: string) => {
    if (!onUpdateTreasure) return;
    void onUpdateTreasure(
      location,
      location.treasure.map((item) =>
        item.id === itemId ? { ...item, collected: !item.collected } : item,
      ),
    );
  };

  return (
    <div className="space-y-3">
      {/* Read Aloud */}
      {location.readAloud && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
          <div className="text-xs font-medium text-amber-500 mb-1">
            📖 Read Aloud
          </div>
          <p className=" italic text-foreground/80 leading-relaxed">
            {location.readAloud}
          </p>
        </div>
      )}

      {/* Description */}
      {location.description && (
        <p className="text-muted-foreground leading-relaxed">
          {location.description}
        </p>
      )}

      {/* Sensory */}
      {location.sensory && (
        <p className="italic text-muted-foreground">👃 {location.sensory}</p>
      )}

      {/* Mood + Tags */}
      {(location.tags.length > 0 || location.mood) && (
        <div className="flex items-center gap-1 flex-wrap">
          {location.mood && (
            <Badge variant="secondary" className="text-xs">
              🎭 {location.mood}
            </Badge>
          )}
          {location.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* NPCs */}
      {npcs.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
            👤 NPCs
          </div>
          <div className="space-y-1.5">
            {npcs.map((n) => (
              <NPCMiniCard key={n.id} npc={n} onUpdateNPC={onUpdateNPC} />
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {location.services.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            🏪 Services
          </div>
          <ServicesList services={location.services} />
        </div>
      )}

      {/* Traps */}
      {location.traps?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
            ⚠️ Traps
          </div>
          {location.traps.map((trap) => (
            <div
              key={trap.id}
              className="flex items-start gap-2 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5"
            >
              <span
                className={
                  trap.disarmed
                    ? "line-through text-muted-foreground"
                    : "text-foreground"
                }
              >
                {trap.name}
              </span>
              {trap.dc != null && (
                <Badge variant="outline" className="text-xs shrink-0">
                  DC {trap.dc}
                </Badge>
              )}
              <span className="ml-auto text-xs shrink-0">
                {trap.disarmed ? "✅ disarmed" : "❌ armed"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Treasure */}
      {location.treasure?.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">
            💎 Treasure
          </div>
          {location.treasure.map((item) => {
            const treasureLabel = (
              <>
                {item.name}
                {item.quantity > 1 && ` (×${item.quantity})`}
              </>
            );
            const treasureLabelClassName = `min-w-0 flex-1 truncate ${
              item.collected
                ? "line-through text-muted-foreground"
                : "text-foreground"
            }`;

            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5"
              >
                {item.isMagic && item.compendiumId ? (
                  <Link
                    to="/realms/compendium/magic-items/$itemId"
                    params={{ itemId: item.compendiumId }}
                    className={`${treasureLabelClassName} hover:underline`}
                  >
                    {treasureLabel}
                  </Link>
                ) : (
                  <span className={treasureLabelClassName}>
                    {treasureLabel}
                  </span>
                )}
                {item.value && (
                  <span className="text-xs text-amber-400">{item.value}</span>
                )}
                {onUpdateTreasure ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={item.collected ? "secondary" : "outline"}
                    className="h-7 shrink-0 px-2 text-xs"
                    onClick={() => handleToggleTreasure(item.id)}
                  >
                    {item.collected ? "Collected" : "Collect"}
                  </Button>
                ) : (
                  <span className="ml-auto text-xs shrink-0">
                    {item.collected ? "✅ collected" : "💰 loot"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LocationDetailPanel({
  location,
  npcs,
  onUpdateNPC,
  onUpdateTreasure,
}: {
  location: POI;
  npcs: NPC[];
  onUpdateNPC?: (npc: NPC) => void;
  onUpdateTreasure?: (
    location: POI,
    treasure: TreasureItem[],
  ) => void | Promise<void>;
}) {
  const LocIcon = POI_TYPE_ICONS[location.type];
  return (
    <div className="space-y-3 rounded-md border bg-card p-3">
      <div className="flex items-center gap-2">
        <LocIcon className="size-4 shrink-0 text-muted-foreground" />
        <Link
          to="/realms/pois/$poiId"
          params={{ poiId: location.id }}
          className="truncate font-semibold hover:underline"
        >
          {location.name}
        </Link>
        {location.subtypeLabel && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {location.subtypeLabel}
          </Badge>
        )}
      </div>
      <LocationDetailContent
        location={location}
        npcs={npcs}
        onUpdateNPC={onUpdateNPC}
        onUpdateTreasure={onUpdateTreasure}
      />
    </div>
  );
}

interface SettlementTemplateProps {
  poi: POI;
  /** Region terrain — present for prop parity; settlement POIs surface town-street encounters. */
  terrain?: string | null;
  children: POI[];
  npcs: NPC[];
  childNPCs: NPC[];
  selectedChildId: string | null;
  onSelectChild: (id: string | null) => void;
  paths: ResolvedPath[];
  rumors: Rumor[];
  notices: Notice[];
  encounterTable: EncounterTable | null | undefined;
  poiEvents: POIEvent[];
  poiMaps: GameMap[];
  factions: Faction[];
  factionPresences: FactionPresence[];
  onToggleRumorUsed: (rumor: Rumor) => void;
  onCreateRumor: (input: {
    text: string;
    source: string;
    isQuestHook: boolean;
    links: EntityLink[];
  }) => void;
  onDeleteRumor: (id: string) => void;
  onUpdateRumor: (rumor: Rumor) => void;
  onToggleNoticeUsed: (notice: Notice) => void;
  onCreateNotice: (input: {
    title: string;
    description: string;
    type: NoticeType;
    reward: string;
    links: EntityLink[];
  }) => void;
  onDeleteNotice: (id: string) => void;
  onRollEncounter: () => Promise<RollEncounterResult>;
  onRollCascade: (action: CascadeAction) => Promise<EncounterRollResult>;
  onSaveEncounterNpc?: () => Promise<void>;
  onSaveEncounterTable?: (
    entries: Pick<
      EncounterTable,
      | "creature"
      | "signOmen"
      | "loss"
      | "npc"
      | "discovery"
      | "treasure"
      | "customSections"
      | "disabledCategories"
    >,
  ) => void;
  onCreateChild: () => void;
  onCreateNPC: () => void;
  onCreateEvent: () => void;
  onDeleteEvent: (id: string) => void;
  onUpdateNPC?: (npc: NPC) => void;
  onUpdateTreasure?: (
    location: POI,
    treasure: TreasureItem[],
  ) => void | Promise<void>;
  onRerollProblem?: () => void | Promise<void>;
  isRerollingProblem?: boolean;
  activeTab?: string | null;
  onTabChange?: (tab: SettlementTab) => void;
  mapSection: React.ReactNode;
  mapError?: string | null;
  notesSection?: React.ReactNode;
  actionBar?: React.ReactNode;
  worldId?: string | null;
}

interface TreasureManifestEntry {
  item: TreasureItem;
  location: POI;
}

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function cleanText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function settlementTypeDetail(poi: POI, displaySize: string): string {
  return poi.subtypeLabel
    ? `${displaySize} ${poi.subtypeLabel.toLowerCase()}`
    : `${displaySize} settlement`;
}

function magicItemCountFor(poi: POI): number {
  const ids = new Set((poi.magicItemRefs ?? []).map((ref) => ref.id));
  for (const item of poi.treasure ?? []) {
    if (item.isMagic) ids.add(item.compendiumId ?? item.id);
  }
  return ids.size;
}

function monsterCountFor(poi: POI): number {
  return (poi.monsterRefs ?? []).reduce(
    (sum, ref) => sum + (ref.quantity ?? 1),
    0,
  );
}

function OverviewFact({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Sparkles;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-md bg-muted/30 px-3 py-2">
      <div className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground ">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="truncate text-base font-medium">{value}</div>
      {detail && (
        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {detail}
        </div>
      )}
    </div>
  );
}

function formatPathTravel(path: ResolvedPath): string {
  const watches = `${path.baseTravelWatches}w`;
  return path.hexes != null
    ? `${formatDistance(path.hexes)} - ${watches}`
    : watches;
}

function OverviewRoutes({
  paths,
  currentPoiId,
  treasureManifest,
  uncollectedTreasure,
  onToggleTreasure,
  gmNotes,
}: {
  paths: ResolvedPath[];
  currentPoiId: string;
  treasureManifest: TreasureManifestEntry[];
  uncollectedTreasure: number;
  onToggleTreasure?: (location: POI, itemId: string) => void;
  gmNotes?: string | null;
}) {
  return (
    <div className="flex min-h-full min-w-0 flex-col gap-2 border-t border-border/60 pt-3 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <MapPin className="size-3.5" />
          Routes
        </p>
        {paths.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {pluralize(paths.length, "route")}
          </Badge>
        )}
      </div>
      {paths.length > 0 ? (
        <Table className="table-fixed text-xs">
          <colgroup>
            <col className="w-[64%]" />
            <col className="w-[36%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-7 px-0 pr-2">Destination</TableHead>
              <TableHead className="h-7 px-0 text-right">Travel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paths.map((path) => {
              const isFrom = path.fromPoiId === currentPoiId;
              const destId = isFrom ? path.toPoiId : path.fromPoiId;
              const dest = isFrom ? path.toName : path.fromName;
              const displayDir: Direction | null = path.direction
                ? isFrom
                  ? path.direction
                  : OPPOSITE_DIRECTION[path.direction]
                : null;
              const description = cleanText(path.description);
              return (
                <TableRow key={path.id}>
                  <TableCell className="min-w-0 whitespace-normal py-1.5 pl-0 pr-2 align-top">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {displayDir ? (
                        <Badge
                          variant="secondary"
                          className="w-8 shrink-0 justify-center px-0 text-[10px] font-mono"
                        >
                          {displayDir.toUpperCase()}
                        </Badge>
                      ) : (
                        <span className="w-8 shrink-0 text-center text-xs text-muted-foreground">
                          →
                        </span>
                      )}
                      <Link
                        to="/realms/pois/$poiId"
                        params={{ poiId: destId }}
                        className="min-w-0 truncate text-base font-medium hover:underline"
                      >
                        {dest}
                      </Link>
                      {path.type !== "road" && (
                        <Badge variant="outline" className="text-[10px]">
                          {path.type}
                        </Badge>
                      )}
                    </div>
                    {description && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="truncate whitespace-nowrap py-1.5 pl-2 pr-0 text-right align-top text-xs text-muted-foreground">
                    {formatPathTravel(path)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="text-base text-muted-foreground">No routes recorded.</p>
      )}
      {treasureManifest.length > 0 && (
        <div className="mt-auto space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Gem className="size-3.5" />
              Treasure Manifest
            </p>
            <Badge variant="outline" className="text-xs">
              {uncollectedTreasure}/{treasureManifest.length} open
            </Badge>
          </div>
          <Table className="table-fixed text-xs">
            <colgroup>
              <col className="w-[46%]" />
              <col className="w-[28%]" />
              <col className="w-[26%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-7 px-0 pr-2">Item</TableHead>
                <TableHead className="h-7 px-0 pr-2">Location</TableHead>
                <TableHead className="h-7 px-0 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {treasureManifest.map(({ item, location }) => {
                const itemLabel = (
                  <>
                    {item.isMagic && (
                      <Sparkles className="size-3.5 shrink-0 text-violet-500" />
                    )}
                    {!item.isMagic && (
                      <Gem className="size-3.5 shrink-0 text-emerald-500" />
                    )}
                    <span
                      className={`min-w-0 truncate ${item.collected ? "line-through text-muted-foreground" : ""}`}
                    >
                      {item.name}
                      {item.quantity > 1 && ` (×${item.quantity})`}
                    </span>
                  </>
                );

                return (
                  <TableRow key={`${location.id}:${item.id}`}>
                    <TableCell className="min-w-0 py-1.5 pl-0 pr-2 align-middle">
                      {item.isMagic && item.compendiumId ? (
                        <Link
                          to="/realms/compendium/magic-items/$itemId"
                          params={{ itemId: item.compendiumId }}
                          className="flex min-w-0 items-center gap-1.5 font-medium hover:underline"
                        >
                          {itemLabel}
                        </Link>
                      ) : (
                        <span className="flex min-w-0 items-center gap-1.5 font-medium">
                          {itemLabel}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-0 py-1.5 pl-0 pr-2 align-middle">
                      <Link
                        to="/realms/pois/$poiId"
                        params={{ poiId: location.id }}
                        className="block truncate text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {location.name}
                      </Link>
                    </TableCell>
                    <TableCell className="py-1.5 pl-0 pr-0 text-right align-middle">
                      {onToggleTreasure ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={item.collected ? "secondary" : "outline"}
                          className="h-7 px-2 text-xs"
                          onClick={() => onToggleTreasure(location, item.id)}
                        >
                          {item.collected ? "Collected" : "Collect"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {item.collected ? "Collected" : "Open"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {gmNotes && (
        <div className="mt-2 space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <ShieldAlert className="size-3.5" />
            GM Notes
          </p>
          <p className="whitespace-pre-line text-base leading-relaxed">
            {gmNotes}
          </p>
        </div>
      )}
    </div>
  );
}

export function SettlementTemplate({
  poi,
  terrain,
  children: childPois,
  npcs,
  childNPCs,
  selectedChildId,
  onSelectChild,
  paths,
  rumors,
  notices,
  encounterTable,
  poiEvents,
  factions,
  factionPresences,
  onToggleRumorUsed,
  onCreateRumor,
  onDeleteRumor,
  onUpdateRumor,
  onToggleNoticeUsed,
  onCreateNotice,
  onDeleteNotice,
  onRollEncounter,
  onRollCascade,
  onSaveEncounterNpc,
  onSaveEncounterTable,
  onCreateChild,
  onCreateNPC,
  onCreateEvent,
  onDeleteEvent,
  onUpdateNPC,
  onUpdateTreasure,
  onRerollProblem,
  isRerollingProblem = false,
  activeTab,
  onTabChange,
  mapSection,
  mapError,
  notesSection,
  actionBar,
  worldId,
}: SettlementTemplateProps) {
  const resolveTarget = useHookResolver(worldId ?? null);
  const linkOptions = useLinkableEntities(worldId ?? null);

  // Group child NPCs by their poiId
  const npcsByPoiId = useMemo(() => {
    const map: Record<string, NPC[]> = {};
    for (const npc of childNPCs) {
      if (!npc.poiId) continue;
      (map[npc.poiId] ??= []).push(npc);
    }
    return map;
  }, [childNPCs]);

  // Build a poiId → name lookup for child locations
  const childPoiNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of childPois) map[c.id] = c.name;
    return map;
  }, [childPois]);

  // All NPCs: settlement-level first, then child-location NPCs
  const allNPCs = useMemo(
    () => [
      ...npcs.map((n) => ({
        npc: n,
        poiName: undefined as string | undefined,
      })),
      ...childNPCs.map((n) => ({
        npc: n,
        poiName: n.poiId ? childPoiNames[n.poiId] : undefined,
      })),
    ],
    [npcs, childNPCs, childPoiNames],
  );

  // Factions tied to this settlement: those headquartered here, plus any with a
  // presence. HQ factions are excluded from the presence list to avoid double-
  // listing (an HQ already seeds a 'controls' presence at generation).
  const hqFactions = useMemo(
    () => factions.filter((f) => f.headquartersPoiId === poi.id),
    [factions, poi.id],
  );
  const presenceRows = useMemo(() => {
    const hqIds = new Set(hqFactions.map((f) => f.id));
    return factionPresences
      .filter((fp) => !hqIds.has(fp.factionId))
      .map((fp) => ({
        presence: fp,
        faction: factions.find((f) => f.id === fp.factionId),
      }))
      .filter(
        (r): r is { presence: FactionPresence; faction: Faction } =>
          !!r.faction,
      );
  }, [factionPresences, factions, hqFactions]);
  const npcById = useMemo(
    () => new Map([...npcs, ...childNPCs].map((n) => [n.id, n])),
    [npcs, childNPCs],
  );

  const selectedLocation = selectedChildId
    ? (childPois.find((c) => c.id === selectedChildId) ?? null)
    : null;

  const detailPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedChildId && detailPanelRef.current) {
      detailPanelRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedChildId]);

  const [overviewOpen, setOverviewOpen] = useState(true);
  const [localTab, setLocalTab] = useState<SettlementTab>("locations");
  const selectedTab = isSettlementTab(activeTab) ? activeTab : localTab;

  const handleTabChange = (tab: string) => {
    const nextTab = isSettlementTab(tab) ? tab : "locations";
    setLocalTab(nextTab);
    onTabChange?.(nextTab);
  };

  useEffect(() => {
    setOverviewOpen(true);
  }, [poi.id]);

  const [layout, setLayout] = useState<"columns" | "stacked">(() => {
    try {
      const saved = localStorage.getItem("settlement-layout");
      if (saved === "stacked" || saved === "columns") return saved;
    } catch {}
    return "columns";
  });

  const updateLayout = (next: "columns" | "stacked") => {
    setLayout(next);
    try {
      localStorage.setItem("settlement-layout", next);
    } catch {}
  };

  // Aggregate services from child POIs + this POI
  const allServices = [
    ...poi.services,
    ...childPois.flatMap((c) => c.services),
  ];
  const treasureManifest = useMemo(
    () => [
      ...(poi.treasure ?? []).map((item) => ({ item, location: poi })),
      ...childPois.flatMap((location) =>
        (location.treasure ?? []).map((item) => ({ item, location })),
      ),
    ],
    [poi, childPois],
  );
  const uncollectedTreasure = treasureManifest.filter(
    ({ item }) => !item.collected,
  ).length;
  const magicItemCount =
    magicItemCountFor(poi) +
    childPois.reduce((sum, child) => sum + magicItemCountFor(child), 0);
  const monsterCount =
    monsterCountFor(poi) +
    childPois.reduce((sum, child) => sum + monsterCountFor(child), 0);

  const detailLine = cleanText(poi.description);
  const flavor = poi.settlementFlavor;
  const flavorRows = [
    { label: "Known for", value: flavor?.knownFor ?? null, cap: false },
    { label: "Character", value: flavor?.character ?? null, cap: false },
    { label: "Notable", value: flavor?.notable ?? null, cap: false },
    { label: "Tradition", value: flavor?.tradition ?? null, cap: false },
    { label: "Produces", value: poi.trade?.produces ?? null, cap: true },
    {
      label: "Needs",
      value:
        poi.trade?.needs && poi.trade.needs.length > 0
          ? poi.trade.needs.join(", ")
          : null,
      cap: true,
    },
  ].filter(
    (row): row is { label: string; value: string; cap: boolean } =>
      Boolean(row.value),
  );
  const gmNotes = cleanText(poi.gmNotes);
  const localProblem = cleanText(poi.trouble);
  const sizeLabel = settlementSize(poi.subtypeLabel);
  const displaySize = sizeLabel.charAt(0).toUpperCase() + sizeLabel.slice(1);
  const npcWants = allNPCs.filter(({ npc }) => cleanText(npc.want)).slice(0, 3);

  const handleToggleManifestTreasure = (location: POI, itemId: string) => {
    if (!onUpdateTreasure) return;
    void onUpdateTreasure(
      location,
      location.treasure.map((item) =>
        item.id === itemId ? { ...item, collected: !item.collected } : item,
      ),
    );
  };

  const overviewSection = (
    <Collapsible open={overviewOpen} onOpenChange={setOverviewOpen}>
      <div className="rounded-lg border bg-card text-card-foreground shadow-card">
        <CollapsibleTrigger asChild>
          <button className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-base font-medium transition-colors hover:bg-muted/50">
            <span className="flex shrink-0 items-center gap-2">
              <ChevronRight
                className={`size-4 text-muted-foreground transition-transform ${overviewOpen ? "rotate-90" : ""}`}
              />
              <Eye className="size-4 text-muted-foreground" />
              Overview
            </span>
            <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
              <Badge variant="outline" className="text-xs capitalize">
                {poi.type}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {displaySize}
              </Badge>
              {poi.subtypeLabel && (
                <Badge variant="outline" className="text-xs">
                  {poi.subtypeLabel}
                </Badge>
              )}
              {poi.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-1 px-3 pb-3 xl:grid-cols-[minmax(0,2fr)_minmax(260px,0.85fr)]">
            <div className="min-w-0 space-y-2">
              {detailLine ? (
                <p className="text-base leading-relaxed text-muted-foreground">
                  {detailLine}
                </p>
              ) : (
                <p className="text-base text-muted-foreground">
                  No detail line recorded.
                </p>
              )}

              {flavorRows.length > 0 && (
                <dl className="divide-y divide-border/60">
                  {flavorRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-4"
                    >
                      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-28 sm:shrink-0">
                        {row.label}
                      </dt>
                      <dd
                        className={`text-base text-foreground${row.cap ? " capitalize" : ""}`}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      <ShieldAlert className="size-3.5" />
                      Looming Problem
                    </p>
                    <p className="text-base leading-relaxed">
                      {localProblem ?? "No problem recorded."}
                    </p>
                  </div>
                  {onRerollProblem && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void onRerollProblem()}
                      disabled={isRerollingProblem}
                      title="Reroll settlement problem"
                    >
                      <RefreshCw
                        className={`size-4 ${isRerollingProblem ? "animate-spin" : ""}`}
                      />
                      Reroll
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="min-w-0 rounded-md bg-muted/30 px-3 py-2">
                  <div className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                    <Landmark className="size-3.5" />
                    Location
                  </div>
                  <div className="truncate text-base font-medium">
                    <Link
                      to="/realms/pois/$poiId"
                      params={{ poiId: poi.id }}
                      className="hover:underline"
                    >
                      {poi.name}
                    </Link>
                  </div>
                  <dl className="mt-1.5 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <dt className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                        Prosperity
                      </dt>
                      <dd>
                        {poi.wealthBand ? (
                          <WealthBadge band={poi.wealthBand} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <dt className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                        Size
                      </dt>
                      <dd className="text-base">
                        {[
                          settlementTypeDetail(poi, displaySize),
                          childPois.length > 0
                            ? pluralize(childPois.length, "key location")
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </dd>
                    </div>
                  </dl>
                </div>
                <OverviewFact
                  icon={Sparkles}
                  label="Atmosphere"
                  value={cleanText(poi.mood) ?? "No mood recorded"}
                  detail={cleanText(poi.sensory)}
                />
              </div>
              {npcWants.length > 0 && (
                <div className="space-y-2 rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground ">
                    Local Wants
                  </p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {npcWants.map(({ npc, poiName }) => (
                      <div
                        key={npc.id}
                        className="min-w-0 border-t pt-2 first:border-t-0 first:pt-0 md:border-t-0 md:pt-0 md:border-l md:pl-3 md:first:border-l-0 md:first:pl-0"
                      >
                        <p className="truncate text-base font-medium">
                          <Link
                            to="/realms/npcs/$npcId"
                            params={{ npcId: npc.id }}
                            className="hover:underline"
                          >
                            {npc.name}
                          </Link>
                        </p>
                        <p className="line-clamp-2 text-muted-foreground">
                          {npc.want}
                        </p>
                        {npc.poiId && (
                          <p className="mt-1 text-muted-foreground">
                            <Link
                              to="/realms/pois/$poiId"
                              params={{ poiId: npc.poiId }}
                              className="hover:underline"
                            >
                              {poiName ?? poi.name}
                            </Link>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(hqFactions.length > 0 || presenceRows.length > 0) && (
                <div className="space-y-2 rounded-md bg-muted/20 px-3 py-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                    Factions
                  </p>
                  <div className="space-y-2">
                    {hqFactions.map((fac) => {
                      const leader = fac.leaderNpcId
                        ? npcById.get(fac.leaderNpcId)
                        : undefined;
                      const goal = fac.agendaGoals.find(
                        (g) => g.timeframe === "immediate",
                      );
                      return (
                        <div key={fac.id} className="text-base">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="shrink-0">🏛</span>
                            <Link
                              to="/realms/factions/$factionId"
                              params={{ factionId: fac.id }}
                              className="font-medium hover:underline"
                            >
                              {fac.name}
                            </Link>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/60 text-amber-400"
                            >
                              HQ
                            </Badge>
                            {fac.type && (
                              <span className="text-xs text-muted-foreground">
                                {fac.type}
                              </span>
                            )}
                            {leader && (
                              <span className="text-xs text-muted-foreground">
                                · led by{" "}
                                <Link
                                  to="/realms/npcs/$npcId"
                                  params={{ npcId: leader.id }}
                                  className="hover:underline"
                                >
                                  {leader.name}
                                </Link>
                              </span>
                            )}
                          </div>
                          {goal && (
                            <p className="pl-5 text-xs text-muted-foreground">
                              Now: {goal.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    {presenceRows.map(({ presence, faction }) => (
                      <div
                        key={presence.id}
                        className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-base"
                      >
                        <Link
                          to="/realms/factions/$factionId"
                          params={{ factionId: faction.id }}
                          className="font-medium hover:underline"
                        >
                          {faction.name}
                        </Link>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${PRESENCE_TYPE_COLORS[presence.type] ?? ""}`}
                        >
                          {presence.type}
                        </Badge>
                        {presence.notes && (
                          <span className="text-xs text-muted-foreground">
                            {presence.notes}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <OverviewRoutes
              paths={paths}
              currentPoiId={poi.id}
              treasureManifest={treasureManifest}
              uncollectedTreasure={uncollectedTreasure}
              onToggleTreasure={
                onUpdateTreasure ? handleToggleManifestTreasure : undefined
              }
              gmNotes={gmNotes}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={handleTabChange}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <TabsList
            variant="line"
            className="min-w-0 flex-1 justify-start overflow-x-auto"
          >
            <TabsTrigger value="locations">
              <MapPin className="size-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="denizens">
              <Users className="size-4" />
              Denizens{allNPCs.length > 0 ? ` (${allNPCs.length})` : ""}
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
          {actionBar && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {actionBar}
            </div>
          )}
        </div>

        {/* Locations & NPCs tab */}
        <TabsContent value="locations" className="space-y-4 pt-3">
          {overviewSection}
          {/* Map spans full width above master-detail, only when one exists */}
          {mapError && <p className="text-destructive">{mapError}</p>}
          {mapSection && <div>{mapSection}</div>}

          <div
            className={`grid gap-4 ${layout === "columns" ? "md:grid-cols-2" : ""}`}
          >
            {/* LEFT: location list (master) */}
            <div className="space-y-3">
              {/* Location list header */}
              <div className="flex justify-between">
                <h4 className="font-semibold">Key Locations</h4>
                <div className="flex justify-end space-x-2">
                  <div className="hidden md:flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateLayout(
                          layout === "columns" ? "stacked" : "columns",
                        )
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
                  <Button size="sm" variant="outline" onClick={onCreateChild}>
                    <Plus className="mr-1.5 size-3.5" />
                    Add Location
                  </Button>
                </div>
              </div>

              {/* Compact location cards */}
              {childPois.length > 0 ? (
                <div className="space-y-1.5">
                  {childPois.map((child) => {
                    const ChildIcon = POI_TYPE_ICONS[child.type];
                    const childNpcList = npcsByPoiId[child.id] ?? [];
                    const isSelected = selectedChildId === child.id;
                    const childTreasureCount = child.treasure?.length ?? 0;
                    const childMagicCount = magicItemCountFor(child);
                    const childMonsterCount = monsterCountFor(child);
                    return (
                      <div
                        key={child.id}
                        ref={
                          layout === "stacked" && isSelected
                            ? detailPanelRef
                            : undefined
                        }
                        className={`rounded-md border p-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary ring-1 ring-primary bg-card"
                            : "bg-card hover:bg-accent"
                        }`}
                        onClick={() =>
                          onSelectChild(isSelected ? null : child.id)
                        }
                      >
                        <div className="flex items-center gap-2">
                          <ChildIcon className="size-4 shrink-0 text-muted-foreground" />
                          <ChevronRight
                            className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`}
                          />
                          <span className="font-medium truncate">
                            {child.name}
                          </span>
                          {/* Compact indicators */}
                          <span className="flex items-center gap-1 shrink-0">
                            {childNpcList.length > 0 && (
                              <span
                                title={`${childNpcList.length} NPC${childNpcList.length > 1 ? "s" : ""}`}
                              >
                                <Users className="size-3.5 text-blue-400" />
                              </span>
                            )}
                            {child.services.length > 0 && (
                              <span
                                title={`${child.services.length} service${child.services.length > 1 ? "s" : ""}`}
                              >
                                <ShoppingBag className="size-3.5 text-muted-foreground" />
                              </span>
                            )}
                            {childTreasureCount > 0 && (
                              <span
                                title={`${childTreasureCount} treasure item${childTreasureCount > 1 ? "s" : ""}`}
                              >
                                <Gem className="size-3.5 text-emerald-500" />
                              </span>
                            )}
                            {childMagicCount > 0 && (
                              <span
                                title={`${childMagicCount} magic item${childMagicCount > 1 ? "s" : ""}`}
                              >
                                <Sparkles className="size-3.5 text-violet-500" />
                              </span>
                            )}
                            {childMonsterCount > 0 && (
                              <span
                                title={`${childMonsterCount} monster${childMonsterCount > 1 ? "s" : ""}`}
                              >
                                <Skull className="size-3.5 text-orange-500" />
                              </span>
                            )}
                          </span>
                          <span className="ml-auto flex items-center gap-1.5 shrink-0">
                            {child.subtypeLabel && (
                              <Badge
                                variant="secondary"
                                className="text-xs shrink-0"
                              >
                                {child.subtypeLabel}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0"
                            >
                              {child.type}
                            </Badge>
                            {child.floor != null && (
                              <Badge
                                variant="secondary"
                                className="text-xs shrink-0"
                              >
                                F{child.floor}
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
                        {layout === "stacked" && isSelected && (
                          <div
                            className="mt-3 cursor-default border-t pt-3"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <LocationDetailContent
                              location={child}
                              npcs={childNpcList}
                              onUpdateNPC={onUpdateNPC}
                              onUpdateTreasure={onUpdateTreasure}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No locations yet.</p>
              )}
            </div>

            {/* RIGHT: selected location detail */}
            {layout === "columns" && (
              <div className="space-y-3">
                <div ref={detailPanelRef} />
                {selectedLocation ? (
                  <LocationDetailPanel
                    location={selectedLocation}
                    npcs={npcsByPoiId[selectedLocation.id] ?? []}
                    onUpdateNPC={onUpdateNPC}
                    onUpdateTreasure={onUpdateTreasure}
                  />
                ) : childPois.length > 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
                    Select a location to see details
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Aggregate Services */}
          {allServices.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Available Services</h4>
              <ServicesList services={allServices} />
            </div>
          )}
        </TabsContent>

        {/* Denizens tab */}
        <TabsContent value="denizens" className="space-y-4 pt-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="size-4" />
                NPCs ({allNPCs.length})
              </h4>
              <Button size="sm" variant="outline" onClick={onCreateNPC}>
                <Plus className="mr-1.5 size-3.5" />
                Add NPC
              </Button>
            </div>
            {allNPCs.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {allNPCs.map(({ npc, poiName }) => {
                  const isHighlighted =
                    selectedChildId != null && npc.poiId === selectedChildId;
                  return (
                    <div
                      key={npc.id}
                      className={`rounded-lg transition-all ${isHighlighted ? "ring-2 ring-primary" : ""}`}
                    >
                      <NPCMiniCard
                        npc={npc}
                        poiName={poiName}
                        onUpdateNPC={onUpdateNPC}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No NPCs present.</p>
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
            onUpdate={onUpdateRumor}
            resolveTarget={resolveTarget}
            linkOptions={linkOptions}
          />
          <NoticeBoard
            notices={notices}
            onToggleUsed={onToggleNoticeUsed}
            onCreate={onCreateNotice}
            onDelete={onDeleteNotice}
            resolveTarget={resolveTarget}
            linkOptions={linkOptions}
          />
        </TabsContent>

        {/* Encounters tab */}
        <TabsContent value="encounters" className="pt-3">
          <EncounterCascade
            table={encounterTable}
            onRollCascade={onRollCascade}
            onSaveNpc={onSaveEncounterNpc}
            onSaveTable={onSaveEncounterTable}
            onRoll={onRollEncounter}
            poiType={poi.type}
            terrain={terrain}
          />
        </TabsContent>

        {/* Events tab */}
        <TabsContent value="events" className="pt-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Events</h4>
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
                      <span className="font-medium">{event.name}</span>
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
                      {" · "}
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
            <p className="text-muted-foreground">No events scheduled.</p>
          )}
        </TabsContent>

        {/* Notes tab */}
        <TabsContent value="notes" className="pt-3">
          {notesSection}
        </TabsContent>
      </Tabs>
    </div>
  );
}
