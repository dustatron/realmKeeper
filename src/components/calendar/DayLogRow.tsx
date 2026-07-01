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
  CalendarClock,
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
  BookOpen,
  Pencil,
  Check,
  X,
  Skull,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useFaction } from "~/ui/hooks/useFactions";
import { ProgressClock } from "~/components/shared/ProgressClock";
import { InlineGMNote } from "./InlineGMNote";
import { MoonGlyph } from "./MoonGlyph";
import { db } from "@infrastructure/dexie/db";
import type { WeatherHistory } from "@domain/entities/WeatherHistory";

const SEASON_COLORS: Record<string, string> = {
  spring: "text-green-600",
  summer: "text-amber-600",
  fall: "text-orange-600",
  winter: "text-blue-600",
};

interface DayLogRowProps {
  entry: DayLogEntry;
  worldId: string;
  showSeasonDivider: boolean;
  onMarkComplete: (dayKey: number) => void;
}

// Map weather condition text → icon + color
function getWeatherIcon(condition: string, severity: string) {
  const lower = condition.toLowerCase();

  if (lower.includes("tornado"))
    return { icon: AlertTriangle, color: "text-red-500" };
  if (lower.includes("wildfire") || lower.includes("fire"))
    return { icon: Flame, color: "text-red-500" };
  if (lower.includes("hurricane"))
    return { icon: AlertTriangle, color: "text-red-500" };
  if (lower.includes("ice storm"))
    return { icon: AlertTriangle, color: "text-red-500" };
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
  if (lower.includes("thunderstorm") || lower.includes("lightning"))
    return { icon: CloudLightning, color: "text-yellow-500" };
  if (lower.includes("storm"))
    return { icon: CloudLightning, color: "text-yellow-500" };
  if (lower.includes("rain"))
    return { icon: CloudRain, color: "text-blue-400" };
  if (lower.includes("fog") || lower.includes("mist"))
    return { icon: CloudFog, color: "text-gray-400" };
  if (lower.includes("wind") || lower.includes("breez"))
    return { icon: Wind, color: "text-teal-400" };
  if (lower.includes("frost"))
    return { icon: Snowflake, color: "text-cyan-300" };
  if (lower.includes("drought"))
    return { icon: Flame, color: "text-orange-500" };
  if (lower.includes("scorching") || lower.includes("hot"))
    return { icon: Thermometer, color: "text-orange-500" };
  if (
    lower.includes("overcast") ||
    lower.includes("humid") ||
    lower.includes("cloud")
  )
    return { icon: Cloud, color: "text-gray-400" };
  if (
    lower.includes("clear") ||
    lower.includes("sunny") ||
    lower.includes("mild") ||
    lower.includes("warm") ||
    lower.includes("crisp")
  )
    return { icon: Sun, color: "text-yellow-400" };

  return { icon: Cloud, color: "text-muted-foreground" };
}

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

function WeatherCell({ weather }: { weather: WeatherHistory | undefined }) {
  const [editing, setEditing] = useState(false);
  const [condition, setCondition] = useState(weather?.condition ?? "");
  const [severity, setSeverity] = useState<WeatherHistory["severity"]>(
    weather?.severity ?? "normal",
  );

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!weather) return;
    setCondition(weather.condition);
    setSeverity(weather.severity);
    setEditing(true);
  };

  const save = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!weather || !condition.trim()) { setEditing(false); return; }
    await db.weatherHistory.put({
      ...weather,
      condition: condition.trim(),
      severity,
    });
    setEditing(false);
  };

  const cancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(false);
  };

  if (!weather) {
    return <span className="text-xs text-muted-foreground/40">--</span>;
  }

  if (editing) {
    return (
      <div
        className="flex flex-col gap-1 min-w-[10rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
          className="h-6 w-full rounded border bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Weather condition"
        />
        <div className="flex items-center gap-1">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as WeatherHistory["severity"])}
            className="h-6 flex-1 rounded border bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="normal">Normal</option>
            <option value="extreme">Extreme</option>
            <option value="catastrophic">Catastrophic</option>
          </select>
          <button onClick={save} className="p-0.5 rounded hover:bg-green-500/10 text-green-600">
            <Check className="size-3.5" />
          </button>
          <button onClick={cancel} className="p-0.5 rounded hover:bg-destructive/10 text-destructive">
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const { icon: Icon, color } = getWeatherIcon(weather.condition, weather.severity);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipContent side="top">
          <div className="text-center">
            <div className="font-medium">{weather.condition}</div>
            {weather.severity !== "normal" && (
              <div
                className={cn(
                  "text-[10px] uppercase tracking-wide",
                  weather.severity === "catastrophic"
                    ? "text-red-400"
                    : "text-orange-400",
                )}
              >
                {weather.severity}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground mt-0.5">Click to edit</div>
          </div>
        </TooltipContent>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "inline-flex p-1 group hover:bg-muted/60 rounded transition-colors",
              SEVERITY_COLORS[weather.severity],
            )}
            onClick={startEdit}
          >
            <Icon className={cn("size-4", color)} />
            <Pencil className="size-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 self-end" />
          </button>
        </TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DayLogRow({
  entry,
  worldId,
  showSeasonDivider,
  onMarkComplete,
}: DayLogRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const primaryWeather = entry.weather[0];
  const hasFactionTurns = entry.factionTurns.length > 0;
  const hasDoomEvents = (entry.doomEvents?.length ?? 0) > 0;
  const hasWorldEvents = entry.events.length > 0;
  const hasActivity = hasFactionTurns || hasDoomEvents || hasWorldEvents;

  return (
    <>
      {showSeasonDivider && (
        <tr>
          <td
            colSpan={8}
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
        onClick={hasActivity ? () => setIsOpen((o) => !o) : undefined}
        className={cn(
          "border-b transition-colors",
          hasActivity && "cursor-pointer hover:bg-muted/50",
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
          <WeatherCell weather={primaryWeather} />
        </td>

        {/* Moon phase */}
        <td className="px-2 py-2 align-middle">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <MoonGlyph fraction={entry.moonPhase.fraction} size={15} />
                </span>
              </TooltipTrigger>
              <TooltipContent>{entry.moonPhase.name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>

        {/* Activity (faction turns + world events) */}
        <td className="px-2 py-2 align-middle">
          {hasActivity ? (
            <div className="flex items-center gap-1 flex-wrap">
              <ChevronRight
                className={cn(
                  "size-3 text-muted-foreground transition-transform",
                  isOpen && "rotate-90",
                )}
              />
              {hasFactionTurns && (
                <Badge variant="secondary" className="text-xs">
                  <Swords className="size-3 mr-1" />
                  {entry.factionTurns.length}
                </Badge>
              )}
              {hasDoomEvents && (
                <Badge variant="destructive" className="text-xs">
                  <Skull className="size-3 mr-1" />
                  {entry.doomEvents.length}
                </Badge>
              )}
              {hasWorldEvents && (
                <Badge variant="outline" className="text-xs">
                  <BookOpen className="size-3 mr-1" />
                  {entry.events.length}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/40">--</span>
          )}
        </td>

        {/* Scheduled Events */}
        <td className="px-2 py-2 align-middle">
          {entry.scheduledEvents.length > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/realms/events/$eventId"
                    params={{ eventId: entry.scheduledEvents[0].id }}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex"
                  >
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs cursor-pointer hover:bg-secondary/80",
                        entry.scheduledEvents.some((e) => e.isActive) &&
                          "bg-green-600 text-white hover:bg-green-700"
                      )}
                    >
                      <CalendarClock className="size-3 mr-1" />
                      {entry.scheduledEvents.length}
                    </Badge>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="space-y-1 max-w-[14rem]">
                    {entry.scheduledEvents.map((se) => (
                      <div key={se.id} className="text-xs">
                        <span className="font-medium">{se.name}</span>
                        {se.isActive && (
                          <span className="ml-1 text-green-400">(active)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            worldId={worldId}
            year={entry.year}
            season={entry.season}
            day={entry.day}
          />
        </td>

        {/* Season */}
        <td
          className={cn(
            "px-2 py-2 align-middle text-sm",
            SEASON_COLORS[entry.season],
          )}
        >
          {cap(entry.season)}
        </td>
      </tr>

      {/* Expanded activity panel */}
      {isOpen && hasActivity && (
        <tr className="border-b bg-muted/20">
          <td colSpan={7} className="px-4 py-2 space-y-2">
            {hasFactionTurns && (
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
            )}
            {hasDoomEvents && (
              <ul className="space-y-1">
                {entry.doomEvents.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-2 text-sm">
                    <Skull className="size-3.5 mt-0.5 shrink-0 text-red-400" />
                    <div>
                      <span className="font-medium text-red-400">{ev.title}</span>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground">{ev.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {hasWorldEvents && (
              <ul className="space-y-1">
                {entry.events.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-2 text-sm">
                    <BookOpen className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{ev.title}</span>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground">{ev.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
