import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { MapPin, Skull, Heart, Minus, Plus, Shield, Tag, Target, Star } from "lucide-react";
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
  /** Link the name/portrait to the NPC detail page. Off for not-yet-saved NPCs. */
  linkToDetail?: boolean;
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

export function NPCMiniCard({ npc, poiName, onUpdateNPC, linkToDetail = true }: NPCMiniCardProps) {
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

  const toggleStar = () => {
    if (!onUpdateNPC) return;
    onUpdateNPC({ ...npc, starred: !npc.starred });
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

  // "inhabitant" is on virtually every denizen — it carries no signal, so hide it.
  const visibleTags = npc.tags?.filter((t) => t.toLowerCase() !== "inhabitant") ?? [];

  const isAlive = npc.lifeStatus === "alive";
  const lifeIcon = isAlive ? (
    <Heart className="size-4 fill-green-500 text-green-500" />
  ) : (
    <Skull className="size-4 text-destructive" />
  );

  const hasRoleplay =
    !!npc.description ||
    !!npc.appearance ||
    !!npc.notable ||
    !!npc.voice ||
    !!npc.motivation ||
    npc.traits.length > 0 ||
    (hasStats && sb.attacks.length > 0);

  return (
    <div
      className="rounded-lg border bg-card hover:bg-accent/40 transition-colors flex overflow-hidden"
      style={raceColor ? { borderLeftColor: raceColor, borderLeftWidth: "3px" } : undefined}
    >
      {npc.imageUrl && (
        linkToDetail ? (
          <Link to="/realms/npcs/$npcId" params={{ npcId: npc.id }} className="shrink-0">
            <CloudinaryImage
              src={npc.imageUrl}
              alt={npc.name}
              width={150}
              className="w-28 h-full object-cover"
            />
          </Link>
        ) : (
          <div className="shrink-0">
            <CloudinaryImage
              src={npc.imageUrl}
              alt={npc.name}
              width={150}
              className="w-28 h-full object-cover"
            />
          </div>
        )
      )}

      <div className="flex flex-col min-w-0 flex-1">
        {/* Header zone — identity, scannable */}
        <div className="p-3 pb-2 space-y-2">
          {/* Name + life status toggle */}
          <div className="flex items-start justify-between gap-2">
            <Link
              to="/realms/npcs/$npcId"
              params={{ npcId: npc.id }}
              className="text-base font-semibold leading-tight hover:underline truncate"
            >
              {npc.name}
            </Link>
            <div className="flex items-center gap-0.5 shrink-0">
              {onUpdateNPC && (
                <button
                  onClick={toggleStar}
                  title={npc.starred ? "Unstar" : "Star"}
                  className="flex items-center justify-center rounded-md p-1.5 hover:bg-muted transition-colors"
                >
                  <Star
                    className={`size-4 ${npc.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                </button>
              )}
              {onUpdateNPC ? (
                <button
                  onClick={cycleLifeStatus}
                  title={`Status: ${npc.lifeStatus} (tap to cycle)`}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted transition-colors ${
                    isAlive ? "" : "text-destructive"
                  }`}
                >
                  {lifeIcon}
                  {!isAlive && <span className="text-xs font-medium capitalize">{npc.lifeStatus}</span>}
                </button>
              ) : (
                <>
                  {npc.starred && <Star className="size-4 fill-yellow-400 text-yellow-400" />}
                  {!isAlive && (
                    <Badge variant="destructive" className="text-xs capitalize">
                      {npc.lifeStatus}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Meta row — race, disposition, location */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
            <DispositionBadge npc={npc} onUpdateNPC={onUpdateNPC} />
            {npc.movementStatus !== "present" && (
              <Badge variant="outline" className="text-[10px]">
                {npc.movementStatus}
              </Badge>
            )}
            {poiName && (
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                <MapPin className="size-3" />
                {poiName}
              </span>
            )}
          </div>

          {/* Factions + tags */}
          {(npc.factionIds.length > 0 || visibleTags.length > 0) && (
            <div className="flex items-center gap-1 flex-wrap">
              {npc.factionIds.map((fid) => (
                <FactionBadge key={fid} factionId={fid} />
              ))}
              {visibleTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                  <Tag className="size-2.5" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Want — the scene driver, promoted */}
          {npc.want && (
            <div className="flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-sm">
              <Target className="size-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span className="leading-snug">
                <span className="font-semibold text-amber-600 dark:text-amber-400">Wants </span>
                <span className="text-foreground/90">{npc.want}</span>
              </span>
            </div>
          )}

          {/* Faction action — what they're doing for their faction */}
          {npc.factionAction && (
            <div className="flex items-start gap-1.5 rounded-md bg-sky-500/10 px-2 py-1.5 text-sm">
              <Shield className="size-3.5 mt-0.5 shrink-0 text-sky-500" />
              <span className="leading-snug">
                <span className="font-semibold text-sky-600 dark:text-sky-400">Faction </span>
                <span className="text-foreground/90">{npc.factionAction}</span>
              </span>
            </div>
          )}
        </div>

        {/* Roleplay zone — secondary, dimmed */}
        {hasRoleplay && (
          <div className="px-3 pb-2 pt-2 space-y-1 border-t border-border/40 text-xs text-muted-foreground">
            {npc.description && (
              <p className="leading-snug">{npc.description}</p>
            )}
            {npc.appearance && (
              <p>
                <span className="font-medium text-foreground/70">Appearance</span> {npc.appearance}
              </p>
            )}
            {npc.notable && (
              <div>
                <span className="font-medium text-foreground/70">Notable</span>
                <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                  {npc.notable.split("\n").filter(Boolean).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            {npc.voice && (
              <p>
                <span className="font-medium text-foreground/70">Voice</span> {npc.voice}
              </p>
            )}
            {npc.motivation && (
              <p>
                <span className="font-medium text-foreground/70">Motivation</span> {npc.motivation}
              </p>
            )}
            {npc.traits.length > 0 && (
              <p>
                <span className="font-medium text-foreground/70">Traits</span> {npc.traits.join(", ")}
              </p>
            )}
            {hasStats && sb.attacks.length > 0 && (
              <p>
                <span className="font-medium text-foreground/70">Attacks</span>{" "}
                {sb.attacks.map((a) => `${a.name} (${a.damage})`).join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Stat zone — combat, large touch targets */}
        {hasStats && (
          <div className="mt-auto flex items-center gap-2 flex-wrap px-3 py-2 border-t border-border/50 bg-muted/30">
            {sb.maxHp > 0 && (
              <div className="flex items-center gap-1">
                {onUpdateNPC && (
                  <button
                    onClick={() => updateHp(sb.hp - 1)}
                    className="size-8 rounded-md flex items-center justify-center bg-background border hover:bg-destructive/15 hover:text-destructive hover:border-destructive/40 transition-colors"
                    title="Decrease HP"
                  >
                    <Minus className="size-4" />
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
                    className="w-14 h-8 text-sm font-mono text-center px-1"
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
                    className={`text-sm font-mono px-2 py-1 min-w-14 justify-center ${onUpdateNPC ? "cursor-pointer" : ""}`}
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
                {onUpdateNPC && (
                  <button
                    onClick={() => updateHp(sb.hp + 1)}
                    className="size-8 rounded-md flex items-center justify-center bg-background border hover:bg-green-500/15 hover:text-green-600 hover:border-green-500/40 transition-colors"
                    title="Increase HP"
                  >
                    <Plus className="size-4" />
                  </button>
                )}
              </div>
            )}
            {sb.armor > 0 && (
              <Badge variant="outline" className="text-sm font-mono px-2 py-1">
                AC {sb.armor}
              </Badge>
            )}
            {sb.stats.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                {sb.stats.map((s) => (
                  <span key={s.key} className="text-[11px] font-mono text-muted-foreground">
                    {s.key.toUpperCase()} {s.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
