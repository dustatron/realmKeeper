import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { MapPin, Eye, Skull, Heart, ChevronUp, ChevronDown, Shield, Tag } from "lucide-react";
import { CloudinaryImage } from "~/components/shared/CloudinaryImage";
import { DispositionBadge } from "~/components/shared/DispositionBadge";
import { useFaction } from "~/ui/hooks/useFactions";
import { useRaceColor } from "~/ui/hooks/useRaceColor";
import type { NPC } from "@domain/entities/NPC";
import type { LifeStatus } from "@shared/constants";

interface NPCMiniCardProps {
  npc: NPC;
  poiName?: string;
  onUpdateNPC?: (npc: NPC) => void;
}

const LIFE_CYCLE: LifeStatus[] = ["alive", "dead", "undead", "ghost"];

function FactionBadge({ factionId }: { factionId: string }) {
  const faction = useFaction(factionId);
  if (!faction) return null;
  return (
    <Link to="/realms/factions/$factionId" params={{ factionId }}>
      <Badge variant="secondary" className="text-[10px] cursor-pointer hover:bg-accent gap-1">
        <Shield className="size-2.5" />
        {faction.name}
      </Badge>
    </Link>
  );
}

export function NPCMiniCard({ npc, poiName, onUpdateNPC }: NPCMiniCardProps) {
  const raceColor = useRaceColor(npc.race);
  const sb = npc.systemBlock;
  const hasStats =
    sb && (sb.maxHp > 0 || sb.armor > 0 || sb.stats.length > 0);
  const [editingHp, setEditingHp] = useState(false);
  const [hpInput, setHpInput] = useState("");

  const updateHp = (newHp: number) => {
    if (!onUpdateNPC || !sb) return;
    const clamped = Math.max(0, Math.min(newHp, sb.maxHp));
    onUpdateNPC({
      ...npc,
      systemBlock: { ...sb, hp: clamped },
    });
  };

  const cycleLifeStatus = () => {
    if (!onUpdateNPC) return;
    const idx = LIFE_CYCLE.indexOf(npc.lifeStatus);
    const next = LIFE_CYCLE[(idx + 1) % LIFE_CYCLE.length];
    onUpdateNPC({ ...npc, lifeStatus: next });
  };

  const commitHpEdit = () => {
    if (!sb) return;
    const val = parseInt(hpInput);
    if (!isNaN(val)) updateHp(val);
    setEditingHp(false);
  };

  const lifeIcon =
    npc.lifeStatus === "alive" ? (
      <Heart className="size-3 fill-green-500 text-green-500" />
    ) : (
      <Skull className="size-3" />
    );

  const lifeBadgeVariant =
    npc.lifeStatus === "alive" ? ("outline" as const) : ("destructive" as const);

  return (
    <div
      className="rounded-md border hover:bg-accent/50 transition-colors flex overflow-hidden"
      style={raceColor ? { borderLeftColor: raceColor, borderLeftWidth: '3px' } : undefined}
    >
      {npc.imageUrl && (
        <Link to="/realms/npcs/$npcId" params={{ npcId: npc.id }} className="shrink-0">
          <CloudinaryImage
            src={npc.imageUrl}
            alt={npc.name}
            width={150}
            className="w-30 h-auto object-cover"
          />
        </Link>
      )}
      <div className="p-3 space-y-1.5 min-w-0 flex-1">
        {/* Name */}
        <Link to="/realms/npcs/$npcId" params={{ npcId: npc.id }} className="text-sm font-semibold hover:underline block truncate">
          {npc.name}
        </Link>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {npc.race && (
            <Badge
              variant="outline"
              className="text-[10px] shrink-0"
              style={
                raceColor
                  ? { backgroundColor: raceColor + "20", borderColor: raceColor }
                  : undefined
              }
            >
              {npc.race}
            </Badge>
          )}

          {onUpdateNPC ? (
            <button onClick={cycleLifeStatus} title={`Status: ${npc.lifeStatus} (click to cycle)`}>
              <Badge variant={lifeBadgeVariant} className="text-xs gap-1 cursor-pointer">
                {lifeIcon}
                {npc.lifeStatus}
              </Badge>
            </button>
          ) : (
            npc.lifeStatus !== "alive" && (
              <Badge variant="destructive" className="text-xs">
                {npc.lifeStatus}
              </Badge>
            )
          )}

          <DispositionBadge npc={npc} onUpdateNPC={onUpdateNPC} />

          {npc.movementStatus !== "present" && (
            <Badge variant="outline" className="text-xs">
              {npc.movementStatus}
            </Badge>
          )}
        </div>

        {/* Faction badges */}
        {npc.factionIds.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {npc.factionIds.map((fid) => (
              <FactionBadge key={fid} factionId={fid} />
            ))}
          </div>
        )}

        {/* Tags */}
        {npc.tags?.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {npc.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                <Tag className="size-2.5" />
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Description details */}
        {npc.appearance && (
          <p className="text-xs text-muted-foreground italic">
            &ldquo;{npc.appearance}&rdquo;
          </p>
        )}
        {npc.voice && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Voice:</span> {npc.voice}
          </p>
        )}
        {npc.motivation && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Motivation:</span> {npc.motivation}
          </p>
        )}
        {npc.want && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Want:</span> {npc.want}
          </p>
        )}
        {npc.traits.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Traits:</span>{" "}
            {npc.traits.join(", ")}
          </p>
        )}
        {hasStats && sb.attacks.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Attacks:</span>{" "}
            {sb.attacks.map((a) => `${a.name} (${a.damage})`).join(", ")}
          </p>
        )}
        {poiName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3" />
            {poiName}
          </p>
        )}

        {/* Stats row — at the bottom */}
        {hasStats && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50">
            {sb.maxHp > 0 && (
              <div className="flex items-center gap-0.5">
                {onUpdateNPC && (
                  <div className="flex flex-col">
                    <button
                      onClick={() => updateHp(sb.hp + 1)}
                      className="size-4 rounded flex items-center justify-center hover:bg-green-500/20 text-muted-foreground hover:text-green-600 transition-colors"
                      title="Increase HP"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      onClick={() => updateHp(sb.hp - 1)}
                      className="size-4 rounded flex items-center justify-center hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Decrease HP"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
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
                    className="w-12 h-5 text-xs font-mono text-center px-1"
                    autoFocus
                  />
                ) : (
                  <Badge
                    variant={
                      sb.hp <= sb.maxHp * 0.25
                        ? "destructive"
                        : sb.hp <= sb.maxHp * 0.5
                          ? "secondary"
                          : "outline"
                    }
                    className={`text-xs font-mono px-1.5 py-0 ${onUpdateNPC ? "cursor-pointer" : ""}`}
                    onClick={
                      onUpdateNPC
                        ? () => {
                            setHpInput(String(sb.hp));
                            setEditingHp(true);
                          }
                        : undefined
                    }
                  >
                    HP {sb.hp}/{sb.maxHp}
                  </Badge>
                )}
              </div>
            )}
            {sb.armor > 0 && (
              <Badge
                variant="outline"
                className="text-xs font-mono px-1.5 py-0"
              >
                AC {sb.armor}
              </Badge>
            )}
            {sb.stats.map((s) => (
              <span
                key={s.key}
                className="text-[10px] font-mono text-muted-foreground"
              >
                {s.key.toUpperCase()} {s.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
