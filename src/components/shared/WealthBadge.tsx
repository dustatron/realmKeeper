import { Coins } from "lucide-react";
import { Badge } from "~/components/ui/badge";

/** NPC personal wealth tier (mirrors NPC.wealthTier). */
export type NpcWealthTier = "destitute" | "poor" | "middling" | "wealthy";
/** Settlement wealth band (mirrors POI.wealthBand). */
export type WealthBand = "destitute" | "poor" | "modest" | "prosperous" | "rich";

// Subtle tint per level: lean/grey at the bottom, neutral in the middle,
// amber/gold at the top. Shared across NPC tiers and settlement bands.
const WEALTH_COLORS: Record<NpcWealthTier | WealthBand, string> = {
  destitute: "border-zinc-500/50 text-zinc-400",
  poor: "border-zinc-500/50 text-zinc-400",
  middling: "border-border text-muted-foreground",
  modest: "border-border text-muted-foreground",
  wealthy: "border-amber-500/60 text-amber-500",
  prosperous: "border-amber-500/60 text-amber-500",
  rich: "border-amber-500/60 text-amber-500",
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface WealthBadgeProps {
  /** NPC personal wealth tier. */
  tier?: NpcWealthTier | null;
  /** Settlement wealth band. */
  band?: WealthBand | null;
  className?: string;
}

/**
 * Renders a small wealth label tinted by level. Pass `tier` for an NPC or
 * `band` for a settlement. Null/absent value renders nothing (older entities
 * predate wealth generation — no "Unknown" noise).
 */
export function WealthBadge({ tier, band, className }: WealthBadgeProps) {
  const value = tier ?? band ?? null;
  if (!value) return null;

  return (
    <Badge
      variant="outline"
      className={`text-xs ${WEALTH_COLORS[value]} ${className ?? ""}`}
    >
      <Coins className="size-3" />
      {capitalize(value)}
    </Badge>
  );
}
