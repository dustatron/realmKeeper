import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dices, Pencil, RotateCcw } from "lucide-react";
import type { EncounterTable } from "@domain/entities/EncounterTable";
import type { EncounterRollResult } from "@domain/value-objects/EncounterRollResult";
import type { RollEncounterResult } from "@application/use-cases/RollEncounter";
import { getActiveSections } from "@application/use-cases/RollEncounter";
import type { CascadeAction } from "@application/use-cases/RollEncounterCascade";
import { REACTION_RANGES } from "@shared/dice";
import { EncounterTableUI } from "~/components/shared/EncounterTableUI";
import { EncounterResultCards } from "~/components/shared/EncounterResultCards";

type SavePayload = Pick<
  EncounterTable,
  | "creature"
  | "signOmen"
  | "loss"
  | "npc"
  | "discovery"
  | "treasure"
  | "customSections"
  | "disabledCategories"
>;

interface EncounterCascadeProps {
  table: EncounterTable | null | undefined;
  onRollCascade: (action: CascadeAction) => Promise<EncounterRollResult>;
  onSaveNpc?: () => Promise<void>;
  onSaveTable?: (entries: SavePayload) => void;
  onRoll: () => Promise<RollEncounterResult>;
  onRegenerateFromRegion?: () => Promise<void>;
  /** Region terrain — adds a matching biome section to the master roll. */
  terrain?: string | null;
  /** POI type — 'settlement' adds the town-street section. */
  poiType?: string | null;
}

/** Build a one-line summary of the persisted result for the banner. */
export function summarizeResult(result: EncounterRollResult): string {
  if (result.npc) {
    return result.npc.disposition
      ? `${result.npc.name} — ${result.npc.disposition}`
      : result.npc.name;
  }
  const base = result.entryText || result.categoryLabel;
  return result.reaction ? `${base} — ${result.reaction}` : base;
}

export function EncounterCascade({
  table,
  onRollCascade,
  onSaveNpc,
  onSaveTable,
  onRoll,
  onRegenerateFromRegion,
  terrain,
  poiType,
}: EncounterCascadeProps) {
  const [mode, setMode] = useState<"roll" | "edit">("roll");
  const [pending, setPending] = useState(false);

  const sections = getActiveSections(table ?? null, { terrain, poiType });
  const lastResult = table?.lastResult;

  const runAction = async (action: CascadeAction) => {
    if (pending) return;
    setPending(true);
    try {
      await onRollCascade(action);
    } finally {
      setPending(false);
    }
  };

  // Resolve hit section by category identity so it stays correct if the GM
  // edits tables (disables/reorders sections) after rolling.
  const hitSection = lastResult
    ? sections.find(s => s.category === lastResult.category)
    : undefined;

  return (
    <div className="space-y-3">
      {/* 1. Mode toggle + optional regenerate */}
      <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex rounded-md border p-0.5 bg-muted/30">
        <button
          onClick={() => setMode("roll")}
          className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
            mode === "roll"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Dices className="size-3.5" />
          Roll
        </button>
        <button
          onClick={() => setMode("edit")}
          className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
            mode === "edit"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="size-3.5" />
          Edit tables
        </button>
      </div>
      {onRegenerateFromRegion && (
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            if (pending) return;
            setPending(true);
            try {
              await onRegenerateFromRegion();
            } finally {
              setPending(false);
            }
          }}
          disabled={pending}
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          Regenerate from region
        </Button>
      )}
      </div>

      {mode === "edit" ? (
        <EncounterTableUI table={table} onRoll={onRoll} onSave={onSaveTable} />
      ) : sections.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No active encounter sections. Switch to{" "}
          <button
            className="underline font-medium"
            onClick={() => setMode("edit")}
          >
            Edit tables
          </button>{" "}
          to add some.
        </div>
      ) : (
        <>
          {/* 2. Result banner */}
          {lastResult ? (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Badge className="bg-amber-600 hover:bg-amber-600 text-white shrink-0">
                  {lastResult.categoryLabel}
                </Badge>
                <p className="text-sm font-medium flex-1">
                  {summarizeResult(lastResult)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runAction({ kind: "rerollAll" })}
                  disabled={pending}
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  Re-roll All
                </Button>
                <span className="text-xs text-muted-foreground">
                  {new Date(lastResult.rolledAt).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                No encounter rolled yet.
              </p>
              <Button
                size="sm"
                onClick={() => runAction({ kind: "roll" })}
                disabled={pending}
              >
                <Dices className="mr-1.5 size-4" />
                Roll an encounter
              </Button>
            </div>
          )}

          {/* 3. Result cards — show the rolled NPC/creature/flavor up top. */}
          {lastResult && (
            <EncounterResultCards
              result={lastResult}
              onSaveNpc={onSaveNpc}
              onRerollNpc={() => runAction({ kind: "rerollNpc" })}
              pending={pending}
            />
          )}

          {/* 4. Master Table card */}
          <div className="rounded-md border overflow-hidden">
            <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
              <span className="text-xs font-semibold">
                Master Table (d{sections.length})
              </span>
              {lastResult && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => runAction({ kind: "rerollMaster" })}
                  disabled={pending}
                >
                  <Dices className="mr-1 size-3" />
                  Re-roll
                </Button>
              )}
            </div>
            <table className="w-full text-sm">
              <tbody>
                {sections.map((section, i) => {
                  const isHit = lastResult
                    ? section.category === lastResult.category
                    : false;
                  return (
                    <tr
                      key={section.category}
                      onClick={() => runAction({ kind: "pickMaster", category: section.category })}
                      className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 ${isHit ? "bg-amber-500/10" : ""}`}
                    >
                      <td className="p-2 font-mono text-muted-foreground w-10">
                        {i + 1}
                      </td>
                      <td className="p-2 font-medium">{section.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4. Category entries sub-table (hidden for NPCs — the card is the result) */}
          {lastResult && hitSection && lastResult.category !== "npc" && (
            <div className="rounded-md border overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                <span className="text-xs font-semibold">
                  {hitSection.label} (d{hitSection.entries.length})
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => runAction({ kind: "rerollEntry" })}
                  disabled={pending}
                >
                  <Dices className="mr-1 size-3" />
                  Re-roll
                </Button>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {hitSection.entries.map((entry, i) => {
                    const isHit = i === lastResult.entryIndex;
                    return (
                      <tr
                        key={i}
                        onClick={() => runAction({ kind: "pickEntry", entryIndex: i })}
                        className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 ${isHit ? "bg-amber-500/10" : ""}`}
                      >
                        <td className="p-2 font-mono text-muted-foreground w-10">
                          {i + 1}
                        </td>
                        <td className="p-2">{entry}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Reaction sub-table */}
          {lastResult?.reaction && (
            <div className="rounded-md border overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1.5 border-b bg-muted/50">
                <span className="text-xs font-semibold">
                  Reaction (2d6
                  {lastResult.reactionRoll != null
                    ? `: ${lastResult.reactionRoll}`
                    : ""}
                  )
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={() => runAction({ kind: "rerollReaction" })}
                  disabled={pending}
                >
                  <Dices className="mr-1 size-3" />
                  Re-roll
                </Button>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {REACTION_RANGES.map((range) => {
                    const isHit =
                      lastResult.reactionRoll != null &&
                      lastResult.reactionRoll >= range.min &&
                      lastResult.reactionRoll <= range.max;
                    const label =
                      range.min === range.max
                        ? String(range.min)
                        : `${range.min}–${range.max}`;
                    return (
                      <tr
                        key={range.disposition}
                        onClick={() => runAction({ kind: "pickReaction", disposition: range.disposition, roll: range.min })}
                        className={`border-b last:border-0 cursor-pointer hover:bg-muted/50 ${isHit ? "bg-amber-500/10" : ""}`}
                      >
                        <td className="p-2 font-mono text-muted-foreground w-12">
                          {label}
                        </td>
                        <td className="p-2 capitalize">{range.disposition}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </>
      )}
    </div>
  );
}
