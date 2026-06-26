import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useUIStore } from "~/ui/stores/uiStore";
import { useActiveRealm } from "~/ui/hooks/useActiveRealm";
import { useTimeline } from "~/ui/hooks/useTimeline";
import { useRecentWeather } from "~/ui/hooks/useWeather";
import { useRecentVisitedPOIs, useStarredPOIs, useRealmPOIs } from "~/ui/hooks/usePOIs";
import { useStarredNPCs } from "~/ui/hooks/useNPCs";
import { useRegions } from "~/ui/hooks/useRegions";
import { useContainer } from "~/ui/hooks/useContainer";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@infrastructure/dexie/db";
import { executeAdvanceDay, type AdvanceDayDeps } from "@application/use-cases/AdvanceClock";
import { rollDice } from "@shared/dice";
import {
  getMonstersBySystemId,
  getSpellsBySystemId,
  getMagicItemsBySystemId,
} from "@domain/data/compendium";
import {
  executeGetDashboardData,
  type DashboardData,
} from "@application/use-cases/GetDashboardData";
import { formatWorldDateTime } from "@domain/value-objects/WorldDate";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Swords,
  Users,
  Scroll,
  CloudRain,
  Map,
  Crown,
  Compass,
  ChevronRight,
  Calendar,
  MapPin,
  Settings,
  Save,
  Star,
  Search,
  Skull,
  FastForward,
} from "lucide-react";
import type { Season } from "@shared/constants";
import { QuickLinksBar } from "./QuickLinksBar";

interface DashboardProps {
  worldId: string;
  tab?: string;
  onTabChange?: (tab: string) => void;
}

const SEASON_COLORS: Record<Season, string> = {
  spring: "bg-green-500/10 text-green-700 border-green-500/20",
  summer: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  fall: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  winter: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  faction: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  npc: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  weather: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  calendar: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  other: "bg-slate-500/10 text-slate-700 border-slate-500/20",
};

const WEATHER_SEVERITY_COLORS: Record<string, string> = {
  clear: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  light: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  moderate: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  heavy: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  extreme: "bg-red-500/10 text-red-700 border-red-500/20",
};

export function Dashboard({ worldId, tab, onTabChange }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const container = useContainer();
  const realm = useActiveRealm();
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);

  // Settings state
  const [settingsDaysPerSeason, setSettingsDaysPerSeason] = useState(30);
  const [settingsDaysPerWeek, setSettingsDaysPerWeek] = useState(7);
  const [settingsWatchesPerDay, setSettingsWatchesPerDay] = useState(3);
  const [settingsFactionTurnTrigger, setSettingsFactionTurnTrigger] = useState<
    "day" | "week" | "manual"
  >("day");
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Live updates
  const recentEvents = useTimeline(worldId, 5);
  const recentWeather = useRecentWeather(worldId, 3);
  const recentPOIs = useRecentVisitedPOIs(worldId, 5);
  const regions = useRegions(worldId);
  const allPois = useRealmPOIs(worldId);
  // "Sites" = top-level overworld locations (settlements, dungeons, ruins, …).
  const siteCount = allPois.filter((p) => p.parentPoiId == null && p.mapRef).length;
  const doom = useLiveQuery(
    async () => {
      const events = await db.worldEvents.toArray();
      return events.find((e) => e.worldId === worldId && e.type === "doom") ?? null;
    },
    [worldId],
  );
  const [advancing, setAdvancing] = useState(false);
  const handleAdvanceDay = async () => {
    setAdvancing(true);
    try {
      const advanceDeps: AdvanceDayDeps = {
        realmRepo: container.realmRepo,
        weatherRepo: container.weatherRepo,
        factionRepo: container.factionRepo,
        relationshipRepo: container.factionRelationshipRepo,
        npcRepo: container.npcRepo,
        worldEventRepo: container.worldEventRepo,
        eventBus: container.eventBus,
        rollDice,
      };
      await executeAdvanceDay(worldId, advanceDeps);
    } finally {
      setAdvancing(false);
    }
  };
  const starredPOIs = useStarredPOIs(worldId);
  const starredNPCs = useStarredNPCs(worldId);
  const starredMonsterIds = realm?.starredMonsterIds ?? [];
  const starredSpellIds = realm?.starredSpellIds ?? [];
  const starredMagicItemIds = realm?.starredMagicItemIds ?? [];
  const starredMonsters = realm
    ? getMonstersBySystemId(realm.systemId).filter((m) =>
        starredMonsterIds.includes(m.id),
      )
    : [];
  const starredSpells = realm
    ? getSpellsBySystemId(realm.systemId).filter((s) =>
        starredSpellIds.includes(s.id),
      )
    : [];
  const starredMagicItems = realm
    ? getMagicItemsBySystemId(realm.systemId).filter((i) =>
        starredMagicItemIds.includes(i.id),
      )
    : [];

  // Sync settings state from realm
  useEffect(() => {
    if (realm) {
      setSettingsDaysPerSeason(realm.daysPerSeason);
      setSettingsDaysPerWeek(realm.daysPerWeek);
      setSettingsWatchesPerDay(realm.watchesPerDay);
      setSettingsFactionTurnTrigger(realm.factionTurnTrigger);
    }
  }, [realm?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    executeGetDashboardData(worldId, {
      realmRepo: container.realmRepo,
      factionRepo: container.factionRepo,
      npcRepo: container.npcRepo,
      worldEventRepo: container.worldEventRepo,
      weatherRepo: container.weatherRepo,
    }).then((result) => {
      if (mounted) {
        setData(result);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [worldId, container]);

  if (loading || !data || !realm) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const latestWeather = recentWeather[0] || data.latestWeather;

  const handleSaveSettings = async () => {
    await container.realmRepo.update({
      ...realm,
      daysPerSeason: clamp(settingsDaysPerSeason, 10, 90),
      daysPerWeek: clamp(settingsDaysPerWeek, 5, 10),
      watchesPerDay: clamp(settingsWatchesPerDay, 2, 6),
      factionTurnTrigger: settingsFactionTurnTrigger,
      updatedAt: Date.now(),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  // World Stats is merged into Overview; old links fall through to overview.
  const activeTab =
    tab === "settings" || tab === "favorites" ? tab : "overview";

  return (
    <div className="space-y-4 p-6">
      {/* Header with Realm Name */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="size-8 text-amber-600" />
            {realm.name}
          </h1>
          {realm.description && (
            <p className="text-muted-foreground mt-1">{realm.description}</p>
          )}
        </div>
        <Button onClick={handleAdvanceDay} disabled={advancing} className="shrink-0">
          <FastForward className="mr-2 size-4" />
          {advancing ? "Advancing…" : "Advance Day"}
        </Button>
      </div>

      <button
        onClick={() => setSearchOpen(true)}
        className="w-full flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 transition-colors text-left"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1">Search NPCs, locations, monsters…</span>
        <kbd className="text-xs bg-background border px-1.5 py-0.5 rounded leading-none hidden sm:inline">⌘K</kbd>
      </button>

      <QuickLinksBar />

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="overview">
            <Crown className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="size-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab (world stats + doom merged in) */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* Looming Doom */}
            {doom && (
              <Card className="border-warning/40 bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <Skull className="size-5" />
                    {doom.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Foretold for{" "}
                    {formatWorldDateTime({
                      year: doom.year,
                      season: doom.season,
                      day: doom.day,
                      watch: doom.watch,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{doom.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="size-4" />
                    Current Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={SEASON_COLORS[realm.currentSeason]}>
                    {realm.currentSeason.charAt(0).toUpperCase() + realm.currentSeason.slice(1)}
                  </Badge>
                  <div className="text-2xl font-bold mt-2">Year {realm.currentYear}</div>
                  <div className="text-sm text-muted-foreground">
                    Day {realm.currentDay} • Watch {realm.currentWatch}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="size-4" />
                    Sites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{siteCount}</div>
                  <div className="text-sm text-muted-foreground">Locations on the map</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Compass className="size-4" />
                    Regions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{regions.length}</div>
                  <div className="text-sm text-muted-foreground">Mapped regions</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Swords className="size-4" />
                    Factions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.factionCount}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.activeFactions.length} active
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Users className="size-4" />
                    NPCs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.npcCount}</div>
                  <div className="text-sm text-muted-foreground">Total characters</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <CloudRain className="size-4" />
                    Weather
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {latestWeather ? (
                    <>
                      <div className="text-2xl font-bold capitalize">{latestWeather.condition}</div>
                      <Badge
                        className={
                          WEATHER_SEVERITY_COLORS[latestWeather.severity] ||
                          WEATHER_SEVERITY_COLORS.clear
                        }
                      >
                        {latestWeather.severity}
                      </Badge>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No weather data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scroll className="size-5" />
                  Recent Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    No events yet. Your realm's story begins now.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentEvents.map((event) => (
                      <div key={event.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                        <Badge className={EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.other}>
                          {event.type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{event.title}</div>
                          {event.description && (
                            <div className="text-sm text-muted-foreground mt-1">{event.description}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {formatWorldDateTime({
                              year: event.year,
                              season: event.season,
                              day: event.day,
                              watch: event.watch,
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recently Visited POIs */}
            {recentPOIs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="size-5" />
                    Recently Visited
                  </CardTitle>
                  <CardDescription>
                    POIs you've recently marked as visited
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentPOIs.map((poi) => (
                      <Link
                        key={poi.id}
                        to="/realms/pois/$poiId"
                        params={{ poiId: poi.id }}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <MapPin className="size-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{poi.name}</div>
                          {poi.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {poi.description}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0 capitalize"
                        >
                          {poi.type}
                        </Badge>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="size-5 text-amber-500" />
                Favorites
              </CardTitle>
              <CardDescription>Starred NPCs, locations, and compendium entries.</CardDescription>
            </CardHeader>
            <CardContent>
              {starredNPCs.length === 0 &&
              starredPOIs.length === 0 &&
              starredMonsters.length === 0 &&
              starredSpells.length === 0 &&
              starredMagicItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No favorites yet. Star an NPC, location, or compendium entry to see it here.
                </p>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-36">Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {starredNPCs.map((npc) => (
                        <TableRow key={`npc:${npc.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">NPC</Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              to="/realms/npcs/$npcId"
                              params={{ npcId: npc.id }}
                              className="font-medium hover:underline"
                            >
                              {npc.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {npc.want || npc.motivation || npc.description || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {starredPOIs.map((poi) => (
                        <TableRow key={`poi:${poi.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{poi.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              to="/realms/pois/$poiId"
                              params={{ poiId: poi.id }}
                              className="font-medium hover:underline"
                            >
                              {poi.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {poi.subtypeLabel || poi.description || "Location"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {starredMonsters.map((monster) => (
                        <TableRow key={`monster:${monster.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">Monster</Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              to="/realms/compendium/monsters/$monsterId"
                              params={{ monsterId: monster.id }}
                              className="font-medium hover:underline"
                            >
                              {monster.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {monster.description || "Compendium"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {starredSpells.map((spell) => (
                        <TableRow key={`spell:${spell.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">Spell</Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              to="/realms/compendium/spells/$spellId"
                              params={{ spellId: spell.id }}
                              className="font-medium hover:underline"
                            >
                              {spell.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {spell.description || "Compendium"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {starredMagicItems.map((item) => (
                        <TableRow key={`magic:${item.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">Magic Item</Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              to="/realms/compendium/magic-items/$itemId"
                              params={{ itemId: item.id }}
                              className="font-medium hover:underline"
                            >
                              {item.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.description || "Compendium"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>How time flows in your world.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="settingsDaysPerSeason">
                      Days per season (month)
                    </Label>
                    <Input
                      id="settingsDaysPerSeason"
                      type="number"
                      min={10}
                      max={90}
                      value={settingsDaysPerSeason}
                      onChange={(e) =>
                        setSettingsDaysPerSeason(Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      10 &ndash; 90
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settingsDaysPerWeek">Days per week</Label>
                    <Input
                      id="settingsDaysPerWeek"
                      type="number"
                      min={5}
                      max={10}
                      value={settingsDaysPerWeek}
                      onChange={(e) =>
                        setSettingsDaysPerWeek(Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      5 &ndash; 10
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settingsWatchesPerDay">
                      Watches per day
                    </Label>
                    <Input
                      id="settingsWatchesPerDay"
                      type="number"
                      min={2}
                      max={6}
                      value={settingsWatchesPerDay}
                      onChange={(e) =>
                        setSettingsWatchesPerDay(Number(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground">2 &ndash; 6</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Faction Turns</CardTitle>
                <CardDescription>
                  When faction turns auto-trigger on clock advance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-xs">
                  <Label>Trigger frequency</Label>
                  <Select
                    value={settingsFactionTurnTrigger}
                    onValueChange={(v) =>
                      setSettingsFactionTurnTrigger(
                        v as "day" | "week" | "manual",
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Every day</SelectItem>
                      <SelectItem value="week">Every week</SelectItem>
                      <SelectItem value="manual">Manual only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveSettings}>
                <Save className="size-4 mr-2" />
                Save Settings
              </Button>
              {settingsSaved && (
                <span className="text-sm text-green-600">Saved!</span>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
