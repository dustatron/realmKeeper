import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dices, Save, Shield, Heart } from "lucide-react";
import type { Disposition } from "@shared/constants";
import type { EncounterRollResult } from "@domain/value-objects/EncounterRollResult";
import { MonsterStatBlock } from "~/components/shared/MonsterSearchTab";
import { getMonsterStats } from "~/components/shared/wanderingMonsterUtils";

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

interface EncounterResultCardsProps {
  result: EncounterRollResult;
  onSaveNpc?: () => Promise<void>;
  onRerollNpc: () => void;
  pending?: boolean;
}

export function EncounterResultCards({
  result,
  onSaveNpc,
  onRerollNpc,
  pending = false,
}: EncounterResultCardsProps) {
  // --- NPC result ---
  if (result.npc) {
    return (
      <NpcResultCard
        result={result}
        onSaveNpc={onSaveNpc}
        onRerollNpc={onRerollNpc}
        pending={pending}
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
        {monster && <MonsterStatBlock monster={monster} />}
      </div>
    );
  }

  // --- Other (flavor text) ---
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
    </div>
  );
}

function NpcResultCard({
  result,
  onSaveNpc,
  onRerollNpc,
  pending,
}: {
  result: EncounterRollResult;
  onSaveNpc?: () => Promise<void>;
  onRerollNpc: () => void;
  pending: boolean;
}) {
  const npc = result.npc!;
  const sb = npc.systemBlock;
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

  const classLine = [npc.race, sb?.className, sb?.level != null ? `Level ${sb.level}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-md border bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-amber-500 text-sm">{npc.name}</span>
        <Badge variant="outline" className="text-xs">
          NPC
        </Badge>
        {result.reaction && <ReactionTag disposition={result.reaction} />}
        {/* Stats */}
        {sb && (
          <span className="ml-auto flex items-center gap-1.5 shrink-0">
            {sb.maxHp > 0 && (
              <Badge variant="outline" className="text-xs font-mono px-2 py-0.5 gap-1">
                <Heart className="size-3" />
                {sb.hp}/{sb.maxHp}
              </Badge>
            )}
            {sb.armor > 0 && (
              <Badge variant="outline" className="text-xs font-mono px-2 py-0.5 gap-1">
                <Shield className="size-3" />
                {sb.armor}
              </Badge>
            )}
          </span>
        )}
      </div>

      {classLine && (
        <p className="text-xs text-muted-foreground capitalize">{classLine}</p>
      )}

      {sb && sb.stats.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-mono text-muted-foreground">
          {sb.stats.map((s) => (
            <span key={s.key} className="uppercase">
              {s.key} {s.value}
              {s.modifier != null
                ? ` (${s.modifier >= 0 ? "+" : ""}${s.modifier})`
                : ""}
            </span>
          ))}
        </div>
      )}

      {npc.appearance && (
        <p className="text-xs italic text-muted-foreground">{npc.appearance}</p>
      )}

      {npc.description && (
        <p className="text-xs text-muted-foreground">{npc.description}</p>
      )}

      {npc.notable && (
        <p className="text-xs">
          <span className="font-medium">Notable:</span>{" "}
          <span className="text-muted-foreground">{npc.notable}</span>
        </p>
      )}

      {npc.want && (
        <p className="text-xs">
          <span className="font-medium">Wants:</span>{" "}
          <span className="text-muted-foreground">{npc.want}</span>
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
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
    </div>
  );
}
