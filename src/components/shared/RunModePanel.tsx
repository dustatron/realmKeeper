import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dices, ChevronDown, ChevronRight } from "lucide-react";
import { ReadAloudBlock } from "~/components/shared/ReadAloudBlock";
import { NPCMiniCard } from "~/components/shared/NPCMiniCard";
import { OPPOSITE_DIRECTION } from "@shared/constants";
import type { Direction } from "@shared/constants";
import type { POI } from "@domain/entities/POI";
import type { NPC } from "@domain/entities/NPC";
import type { ResolvedPath } from "~/ui/hooks/useResolvedPaths";
import type { TreasureItem } from "@domain/value-objects/TreasureItem";
import type { RollEncounterResult } from "@application/use-cases/RollEncounter";

interface RunModePanelProps {
  poi: POI;
  npcs: NPC[];
  paths: ResolvedPath[];
  onRollEncounter: () => Promise<RollEncounterResult>;
  onUpdateNPC?: (npc: NPC) => void;
  onToggleTrapDisarmed?: (trapId: string) => void;
  onUpdateTreasure: (treasure: TreasureItem[]) => void;
}

const LIGHT_ICONS: Record<string, string> = {
  bright: "☀️",
  dim: "🌓",
  dark: "🌑",
};

export function RunModePanel({
  poi,
  npcs,
  paths,
  onRollEncounter,
  onUpdateNPC,
  onToggleTrapDisarmed,
  onUpdateTreasure,
}: RunModePanelProps) {
  const [encounterResult, setEncounterResult] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  const traps = poi.traps ?? [];
  const treasure = poi.treasure ?? [];
  const armedTraps = traps.filter((t) => !t.disarmed);
  const uncollectedTreasure = treasure.filter((t) => !t.collected);
  const hasDimensions = poi.roomWidth != null && poi.roomLength != null;

  const handleRoll = async () => {
    setRolling(true);
    try {
      const result = await onRollEncounter();
      setEncounterResult(`${result.categoryLabel}: ${result.result}`);
      setTimeout(() => setEncounterResult(null), 10000);
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {hasDimensions && (
          <Badge variant="outline" className="text-xs font-mono">
            📐 {poi.roomWidth}×{poi.roomLength} ft
          </Badge>
        )}
        {poi.lightLevel && (
          <Badge variant="secondary" className="text-xs">
            {LIGHT_ICONS[poi.lightLevel]}{" "}
            {poi.lightLevel.charAt(0).toUpperCase() + poi.lightLevel.slice(1)}
          </Badge>
        )}
        {poi.mood && (
          <Badge variant="secondary" className="text-xs">
            {poi.mood}
          </Badge>
        )}
        {poi.trouble && (
          <Badge variant="destructive" className="text-xs">
            ⚠️ {poi.trouble}
          </Badge>
        )}
      </div>

      {/* Read Aloud */}
      <ReadAloudBlock text={poi.readAloud} />

      {/* Exits */}
      {paths.length > 0 && (
        <RunSection title="Exits" count={paths.length} defaultOpen>
          <div className="space-y-0.5">
            {paths.map((path) => {
              const isFrom = path.fromPoiId === poi.id;
              const destId = isFrom ? path.toPoiId : path.fromPoiId;
              const dest = isFrom ? path.toName : path.fromName;
              const displayDir: Direction | null = path.direction
                ? isFrom
                  ? path.direction
                  : OPPOSITE_DIRECTION[path.direction]
                : null;
              return (
                <Link
                  key={path.id}
                  to="/realms/pois/$poiId"
                  params={{ poiId: destId }}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent text-sm"
                >
                  {displayDir ? (
                    <Badge
                      variant="secondary"
                      className="text-xs font-mono w-8 justify-center shrink-0"
                    >
                      {displayDir.toUpperCase()}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground w-8 text-center shrink-0">
                      →
                    </span>
                  )}
                  <span className="font-medium truncate">{dest}</span>
                  {path.hasDoor && (
                    <span
                      className="shrink-0"
                      title={
                        path.doorDescription ||
                        (path.isLocked ? "Locked" : "Door")
                      }
                    >
                      {path.isLocked ? "🔒" : "🚪"}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </RunSection>
      )}

      {/* Traps */}
      {traps.length > 0 && (
        <RunSection
          title="Traps"
          count={armedTraps.length}
          suffix="armed"
          defaultOpen
        >
          <div className="space-y-1">
            {traps.map((trap) => (
              <div key={trap.id} className="flex items-center gap-2 text-sm">
                {onToggleTrapDisarmed && (
                  <button
                    onClick={() => onToggleTrapDisarmed(trap.id)}
                    className="shrink-0 hover:scale-110 transition-transform"
                  >
                    {trap.disarmed ? "✅" : "💣"}
                  </button>
                )}
                <span
                  className={
                    trap.disarmed
                      ? "line-through text-muted-foreground"
                      : "font-medium"
                  }
                >
                  {trap.name}
                </span>
                {trap.dc != null && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    DC {trap.dc}
                  </Badge>
                )}
                {trap.damage && (
                  <span className="text-xs text-muted-foreground">
                    {trap.damage}
                  </span>
                )}
              </div>
            ))}
          </div>
        </RunSection>
      )}

      {/* Denizens */}
      {npcs.length > 0 && (
        <RunSection title="Denizens" count={npcs.length} defaultOpen>
          <div className="space-y-2">
            {npcs.map((npc) => (
              <NPCMiniCard key={npc.id} npc={npc} onUpdateNPC={onUpdateNPC} />
            ))}
          </div>
        </RunSection>
      )}

      {/* Treasure */}
      {treasure.length > 0 && (
        <RunSection
          title="Treasure"
          count={uncollectedTreasure.length}
          suffix="uncollected"
          defaultOpen
        >
          <div className="space-y-0.5">
            {treasure.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 text-sm px-1 ${item.collected ? "opacity-50" : ""}`}
              >
                <button
                  onClick={() => {
                    const updated = treasure.map((t) =>
                      t.id === item.id ? { ...t, collected: !t.collected } : t,
                    );
                    onUpdateTreasure(updated);
                  }}
                  className="shrink-0 hover:scale-110 transition-transform"
                >
                  {item.collected ? "✅" : "💰"}
                </button>
                <span
                  className={
                    item.collected
                      ? "line-through text-muted-foreground"
                      : "font-medium"
                  }
                >
                  {item.quantity > 1 && `${item.quantity}x `}
                  {item.name}
                </span>
                {item.value && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {item.value}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </RunSection>
      )}

      {/* Quick Roll */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRoll}
          disabled={rolling}
        >
          <Dices className="mr-1.5 size-4" />
          {rolling ? "Rolling..." : "Roll Encounter"}
        </Button>
        {encounterResult && (
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400 animate-in fade-in">
            {encounterResult}
          </span>
        )}
      </div>
    </div>
  );
}

/** Collapsible section wrapper used in run mode */
function RunSection({
  title,
  count,
  suffix,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  suffix?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-semibold hover:bg-muted/50"
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        {title}
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {count}
          {suffix ? ` ${suffix}` : ""}
        </Badge>
      </button>
      {open && <div className="px-3 pb-2">{children}</div>}
    </div>
  );
}
