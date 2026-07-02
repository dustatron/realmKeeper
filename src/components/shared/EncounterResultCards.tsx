import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dices, Save } from "lucide-react";
import type { Disposition } from "@shared/constants";
import type { EncounterRollResult } from "@domain/value-objects/EncounterRollResult";
import { MonsterStatBlock } from "~/components/shared/MonsterSearchTab";
import { getMonsterStats } from "~/components/shared/wanderingMonsterUtils";
import { NPCMiniCard } from "~/components/shared/NPCMiniCard";

const DISPOSITION_COLORS: Record<Disposition, string> = {
  hostile: "bg-red-500/15 text-red-500 border-red-500/30",
  wary: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  curious: "bg-gray-400/15 text-gray-400 border-gray-400/30",
  kind: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  helpful: "bg-green-500/15 text-green-500 border-green-500/30",
};

/** Standalone reaction/disposition tag (DispositionBadge needs a full NPC). */
function ReactionTag({ disposition }: { disposition: Disposition }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs px-1.5 py-0 capitalize ${DISPOSITION_COLORS[disposition]}`}
    >
      {disposition}
    </Badge>
  );
}

/** "What they're doing right now" line with its own re-roll (creature/npc). */
function ActivityLine({
  activity,
  onRerollActivity,
  pending,
}: {
  activity: string;
  onRerollActivity?: () => void;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="italic">{activity}</span>
      {onRerollActivity && (
        <Button
          size="sm"
          variant="ghost"
          className="h-5 px-1 text-xs"
          onClick={onRerollActivity}
          disabled={pending}
          title="Re-roll activity"
        >
          <Dices className="size-3" />
        </Button>
      )}
    </div>
  );
}

interface EncounterResultCardsProps {
  result: EncounterRollResult;
  onSaveNpc?: () => Promise<void>;
  onRerollNpc: () => void;
  onRerollActivity?: () => void;
  pending?: boolean;
  /** Rendered as the follow-up flushed out by an area effect — no save/reroll. */
  isChained?: boolean;
}

export function EncounterResultCards({
  result,
  onSaveNpc,
  onRerollNpc,
  onRerollActivity,
  pending = false,
  isChained = false,
}: EncounterResultCardsProps) {
  // --- NPC result ---
  if (result.npc) {
    return (
      <NpcResultCard
        result={result}
        onSaveNpc={isChained ? undefined : onSaveNpc}
        onRerollNpc={onRerollNpc}
        onRerollActivity={isChained ? undefined : onRerollActivity}
        pending={pending}
        hideActions={isChained}
      />
    );
  }

  // --- Creature result ---
  if (result.category === "creature") {
    const monster = result.monsterMatch
      ? getMonsterStats(result.monsterMatch.compendiumId)
      : null;
    return (
      <div className="rounded-md border bg-card/50 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            Creature
          </Badge>
          {result.reaction && <ReactionTag disposition={result.reaction} />}
        </div>
        <p className="text-sm font-medium">{result.entryText}</p>
        {result.activity && (
          <ActivityLine
            activity={result.activity}
            onRerollActivity={isChained ? undefined : onRerollActivity}
            pending={pending}
          />
        )}
        {monster && <MonsterStatBlock monster={monster} />}
      </div>
    );
  }

  // --- Other (flavor text: signOmen, areaEffect, loss, treasure, custom) ---
  return (
    <div className="rounded-md border bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          {result.categoryLabel}
        </Badge>
        {result.reaction && <ReactionTag disposition={result.reaction} />}
      </div>
      <p className="text-sm font-medium">{result.entryText}</p>
      {result.locationMatch && (
        <Link
          to="/realms/pois/$poiId"
          params={{ poiId: result.locationMatch.poiId }}
          className="text-xs text-primary underline"
        >
          🔎 {result.locationMatch.name}
        </Link>
      )}
      {result.chained && (
        <div className="mt-2 border-l-2 border-amber-500/40 pl-3">
          <p className="text-xs text-muted-foreground mb-1">…and it flushes out:</p>
          <EncounterResultCards
            result={result.chained}
            onRerollNpc={() => {}}
            pending={pending}
            isChained
          />
        </div>
      )}
    </div>
  );
}

function NpcResultCard({
  result,
  onSaveNpc,
  onRerollNpc,
  onRerollActivity,
  pending,
  hideActions,
}: {
  result: EncounterRollResult;
  onSaveNpc?: () => Promise<void>;
  onRerollNpc: () => void;
  onRerollActivity?: () => void;
  pending: boolean;
  hideActions?: boolean;
}) {
  const npc = result.npc!;
  const [saving, setSaving] = useState(false);
  const saved = !!result.npcSavedId;

  const handleSave = async () => {
    if (!onSaveNpc || saved || saving) return;
    setSaving(true);
    try {
      await onSaveNpc();
    } finally {
      setSaving(false);
    }
  };

  // One shared NPC card (NPCMiniCard); it isn't saved yet, so don't link it.
  return (
    <div className="space-y-2">
      <NPCMiniCard npc={npc} linkToDetail={false} />
      {result.activity && (
        <ActivityLine
          activity={result.activity}
          onRerollActivity={onRerollActivity}
          pending={pending}
        />
      )}
      {!hideActions && (
        <div className="flex items-center gap-2">
          {onSaveNpc && (
            <Button
              size="sm"
              variant={saved ? "outline" : "default"}
              onClick={handleSave}
              disabled={saved || saving || pending}
            >
              {saved ? (
                "Saved ✓"
              ) : (
                <>
                  <Save className="mr-1.5 size-3.5" />
                  {saving ? "Saving…" : "Save as NPC"}
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onRerollNpc}
            disabled={pending}
          >
            <Dices className="mr-1.5 size-3.5" />
            Re-roll NPC
          </Button>
        </div>
      )}
    </div>
  );
}
