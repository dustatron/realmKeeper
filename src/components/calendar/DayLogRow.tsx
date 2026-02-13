import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { DayLogEntry } from "~/ui/hooks/useDayLog";
import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  ChevronRight,
  Swords,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Wind,
  Snowflake,
  Thermometer,
  Droplets,
  Flame,
  AlertTriangle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useFaction } from "~/ui/hooks/useFactions";
import { ProgressClock } from "~/components/shared/ProgressClock";
import { InlineGMNote } from "./InlineGMNote";

const SEASON_COLORS: Record<string, string> = {
  spring: "text-green-600",
  summer: "text-amber-600",
  fall: "text-orange-600",
  winter: "text-blue-600",
};

interface DayLogRowProps {
  entry: DayLogEntry;
  realmId: string;
  showSeasonDivider: boolean;
  onMarkComplete: (dayKey: number) => void;
}

// Map weather condition text → icon + color
function getWeatherIcon(condition: string, severity: string) {
  const lower = condition.toLowerCase();

  // Catastrophic
  if (lower.includes("tornado"))
    return { icon: AlertTriangle, color: "text-red-500" };
  if (lower.includes("wildfire") || lower.includes("fire"))
    return { icon: Flame, color: "text-red-500" };
  if (lower.includes("hurricane"))
    return { icon: AlertTriangle, color: "text-red-500" };
  if (lower.includes("ice storm"))
    return { icon: AlertTriangle, color: "text-red-500" };

  // Winter
  if (lower.includes("blizzard"))
    return { icon: CloudSnow, color: "text-blue-400" };
  if (lower.includes("heavy snow"))
    return { icon: CloudSnow, color: "text-blue-400" };
  if (lower.includes("snow"))
    return { icon: Snowflake, color: "text-blue-300" };
  if (lower.includes("freezing"))
    return { icon: Droplets, color: "text-cyan-400" };
  if (lower.includes("frigid") || lower.includes("bitter cold"))
    return { icon: Thermometer, color: "text-blue-400" };

  // Rain/storms
  if (lower.includes("thunderstorm") || lower.includes("lightning"))
    return { icon: CloudLightning, color: "text-yellow-500" };
  if (lower.includes("storm"))
    return { icon: CloudLightning, color: "text-yellow-500" };
  if (lower.includes("rain"))
    return { icon: CloudRain, color: "text-blue-400" };

  // Fog/mist
  if (lower.includes("fog") || lower.includes("mist"))
    return { icon: CloudFog, color: "text-gray-400" };

  // Wind
  if (lower.includes("wind") || lower.includes("breez"))
    return { icon: Wind, color: "text-teal-400" };

  // Frost
  if (lower.includes("frost"))
    return { icon: Snowflake, color: "text-cyan-300" };

  // Hot/drought
  if (lower.includes("drought"))
    return { icon: Flame, color: "text-orange-500" };
  if (lower.includes("scorching") || lower.includes("hot"))
    return { icon: Thermometer, color: "text-orange-500" };

  // Overcast/humid
  if (
    lower.includes("overcast") ||
    lower.includes("humid") ||
    lower.includes("cloud")
  )
    return { icon: Cloud, color: "text-gray-400" };

  // Clear/sunny/mild/warm/crisp
  if (
    lower.includes("clear") ||
    lower.includes("sunny") ||
    lower.includes("mild") ||
    lower.includes("warm") ||
    lower.includes("crisp")
  )
    return { icon: Sun, color: "text-yellow-400" };

  // Fallback
  return { icon: Cloud, color: "text-muted-foreground" };
}

/** Sub-component so we can call useFaction per faction turn */
function FactionTurnDetail({
  factionId,
  title,
  description,
}: {
  factionId: string | undefined;
  title: string;
  description?: string;
}) {
  const faction = useFaction(factionId ?? null);
  const longTermGoals = faction?.agendaGoals.filter(
    (g) => g.timeframe === "long-term",
  );

  return (
    <li className="flex items-start gap-2 text-sm">
      <Swords className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {factionId ? (
            <Link
              to="/realms/factions/$factionId"
              params={{ factionId }}
              className="font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {title}
            </Link>
          ) : (
            <span className="font-medium">{title}</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {longTermGoals && longTermGoals.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            {longTermGoals.map((g) => (
              <TooltipProvider key={g.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1">
                      <ProgressClock
                        segments={g.segments ?? 4}
                        progress={g.progress ?? 0}
                        size={20}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="text-center max-w-[12rem]">
                      <div className="font-medium">{g.description}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {g.progress ?? 0}/{g.segments ?? 4}
                        {g.completed ? " — Complete" : ""}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  normal: "",
  extreme: "ring-2 ring-orange-400/60 rounded-full",
  catastrophic: "ring-2 ring-red-500 rounded-full animate-pulse",
};

export function DayLogRow({
  entry,
  realmId,
  showSeasonDivider,
  onMarkComplete,
}: DayLogRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const primaryWeather = entry.weather[0];
  const hasFactionTurns = entry.factionTurns.length > 0;

  return (
    <>
      {/* Season divider row */}
      {showSeasonDivider && (
        <tr>
          <td
            colSpan={6}
            className={cn(
              "px-3 py-1 text-xs font-semibold tracking-wide",
              SEASON_COLORS[entry.season],
              "bg-muted/40",
            )}
          >
            {cap(entry.season)} &mdash; Year {entry.year}
          </td>
        </tr>
      )}

      <tr
        onClick={hasFactionTurns ? () => setIsOpen((o) => !o) : undefined}
        className={cn(
          "border-b transition-colors",
          hasFactionTurns && "cursor-pointer hover:bg-muted/50",
          entry.isCompleted && "opacity-40",
          entry.isCurrentDay && "border-l-4 border-l-primary bg-primary/5",
          entry.isFuture && !entry.isCurrentDay && "text-muted-foreground",
        )}
      >
        {/* Completed checkbox */}
        <td className="w-8 px-2 py-2 align-middle">
          {!entry.isFuture && (
            <input
              type="checkbox"
              checked={entry.isCompleted}
              onChange={(e) => {
                e.stopPropagation();
                onMarkComplete(entry.dayKey);
              }}
              onClick={(e) => e.stopPropagation()}
              className="size-3.5 rounded cursor-pointer"
            />
          )}
        </td>

        {/* Campaign Day */}
        <td className="px-2 py-2 align-middle whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{entry.campaignDay}</span>
            {entry.isCurrentDay && (
              <Badge variant="default" className="text-[10px] h-4 px-1">
                Now
              </Badge>
            )}
          </div>
        </td>

        {/* Weather */}
        <td className="px-2 py-2 align-middle">
          {primaryWeather ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipContent side="top">
                  <div className="text-center">
                    <div className="font-medium">
                      {primaryWeather.condition}
                    </div>
                    {primaryWeather.severity !== "normal" && (
                      <div
                        className={cn(
                          "text-[10px] uppercase tracking-wide",
                          primaryWeather.severity === "catastrophic"
                            ? "text-red-400"
                            : "text-orange-400",
                        )}
                      >
                        {primaryWeather.severity}
                      </div>
                    )}
                  </div>
                </TooltipContent>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex p-1",
                      SEVERITY_COLORS[primaryWeather.severity],
                    )}
                  >
                    {(() => {
                      const { icon: Icon, color } = getWeatherIcon(
                        primaryWeather.condition,
                        primaryWeather.severity,
                      );
                      return <Icon className={cn("size-4", color)} />;
                    })()}
                  </span>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-xs text-muted-foreground/40">--</span>
          )}
        </td>

        {/* Faction Turns */}
        <td className="px-2 py-2 align-middle">
          {hasFactionTurns ? (
            <div className="flex items-center gap-1">
              <ChevronRight
                className={cn(
                  "size-3 text-muted-foreground transition-transform",
                  isOpen && "rotate-90",
                )}
              />
              <Badge variant="secondary" className="text-xs">
                <Swords className="size-3 mr-1" />
                {entry.factionTurns.length}
              </Badge>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">--</span>
          )}
        </td>

        {/* Notes */}
        <td
          className="px-2 py-2 align-middle max-w-[12rem]"
          onClick={(e) => e.stopPropagation()}
        >
          <InlineGMNote
            existingNote={entry.gmNotes[0]}
            realmId={realmId}
            year={entry.year}
            season={entry.season}
            day={entry.day}
          />
        </td>
        {/* Season + Day within season */}
        <td
          className={cn(
            "px-2 py-2 align-middle text-sm",
            SEASON_COLORS[entry.season],
          )}
        >
          {cap(entry.season)}
        </td>
      </tr>

      {/* Expanded faction turn details */}
      {isOpen && hasFactionTurns && (
        <tr className="border-b bg-muted/20">
          <td colSpan={6} className="px-4 py-2">
            <ul className="space-y-2">
              {entry.factionTurns.map((ft) => (
                <FactionTurnDetail
                  key={ft.id}
                  factionId={ft.relatedEntityIds[0]}
                  title={ft.title}
                  description={ft.description}
                />
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
