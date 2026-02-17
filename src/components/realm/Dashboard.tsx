import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useTimeline } from '~/ui/hooks/useTimeline'
import { useRecentWeather } from '~/ui/hooks/useWeather'
import { useContainer } from '~/ui/hooks/useContainer'
import { useGlobalSearch } from '~/ui/hooks/useGlobalSearch'
import type { SearchableItem } from '~/ui/hooks/useGlobalSearch'
import { executeGetDashboardData, type DashboardData } from '@application/use-cases/GetDashboardData'
import { formatWorldDateTime } from '@domain/value-objects/WorldDate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Skeleton } from '~/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { FilterBar } from '~/components/shared/FilterBar'
import { EmptyState } from '~/components/shared/EmptyState'
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
  Dices,
  Search as SearchIcon,
  Settings,
  Save,
} from 'lucide-react'
import type { Season } from '@shared/constants'

interface DashboardProps {
  worldId: string
  tab?: string
  onTabChange?: (tab: string) => void
}

const SEASON_COLORS: Record<Season, string> = {
  spring: 'bg-green-500/10 text-green-700 border-green-500/20',
  summer: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  fall: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  winter: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  faction: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  npc: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  weather: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
  calendar: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  other: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
}

const WEATHER_SEVERITY_COLORS: Record<string, string> = {
  clear: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
  light: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  moderate: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  heavy: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  extreme: 'bg-red-500/10 text-red-700 border-red-500/20',
}

const typeBadgeColors: Record<SearchableItem['type'], string> = {
  npc: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  faction: 'bg-red-500/15 text-red-700 dark:text-red-400',
  region: 'bg-green-500/15 text-green-700 dark:text-green-400',
  poi: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  note: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  monster: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  spell: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  magicItem: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  equipment: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
}

const typeLabels: Record<SearchableItem['type'], string> = {
  npc: 'NPC',
  faction: 'Faction',
  region: 'Region',
  poi: 'POI',
  note: 'Note',
  monster: 'Monster',
  spell: 'Spell',
  magicItem: 'Magic Item',
  equipment: 'Equipment',
}

export function Dashboard({ worldId, tab, onTabChange }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const container = useContainer()
  const realm = useActiveRealm()
  const searchResults = useGlobalSearch(worldId, searchQuery)

  // Settings state
  const [settingsDaysPerSeason, setSettingsDaysPerSeason] = useState(30)
  const [settingsDaysPerWeek, setSettingsDaysPerWeek] = useState(7)
  const [settingsWatchesPerDay, setSettingsWatchesPerDay] = useState(3)
  const [settingsFactionTurnTrigger, setSettingsFactionTurnTrigger] = useState<'day' | 'week' | 'manual'>('day')
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Live updates
  const recentEvents = useTimeline(worldId, 5)
  const recentWeather = useRecentWeather(worldId, 3)

  // Sync settings state from realm
  useEffect(() => {
    if (realm) {
      setSettingsDaysPerSeason(realm.daysPerSeason)
      setSettingsDaysPerWeek(realm.daysPerWeek)
      setSettingsWatchesPerDay(realm.watchesPerDay)
      setSettingsFactionTurnTrigger(realm.factionTurnTrigger)
    }
  }, [realm?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true
    setLoading(true)

    executeGetDashboardData(worldId, {
      realmRepo: container.realmRepo,
      factionRepo: container.factionRepo,
      npcRepo: container.npcRepo,
      worldEventRepo: container.worldEventRepo,
      weatherRepo: container.weatherRepo,
    }).then((result) => {
      if (mounted) {
        setData(result)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [worldId, container])

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
    )
  }

  const latestWeather = recentWeather[0] || data.latestWeather

  const handleSaveSettings = async () => {
    await container.realmRepo.update({
      ...realm,
      daysPerSeason: clamp(settingsDaysPerSeason, 10, 90),
      daysPerWeek: clamp(settingsDaysPerWeek, 5, 10),
      watchesPerDay: clamp(settingsWatchesPerDay, 2, 6),
      factionTurnTrigger: settingsFactionTurnTrigger,
      updatedAt: Date.now(),
    })
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  const activeTab = tab === 'search' || tab === 'settings' ? tab : 'world-details'

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
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="search">
            <SearchIcon className="size-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="world-details">
            <Crown className="size-4" />
            World Details
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search">
          <div className="flex flex-col gap-4">
            <FilterBar search={searchQuery} onSearchChange={setSearchQuery} />

            {!searchQuery.trim() ? (
              <EmptyState
                icon={SearchIcon}
                title="Type to search"
                description="Search NPCs, factions, regions, POIs, and notes."
              />
            ) : searchResults.length === 0 ? (
              <EmptyState
                icon={SearchIcon}
                title="No results"
                description={`No matches for "${searchQuery}".`}
              />
            ) : (
              <div className="space-y-2">
                {searchResults.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.url}
                    params={item.params}
                    className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={typeBadgeColors[item.type]}>
                        {typeLabels[item.type]}
                      </Badge>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description.slice(0, 200)}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* World Details Tab */}
        <TabsContent value="world-details">
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Current Date Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="size-4" />
                    Current Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge className={SEASON_COLORS[realm.currentSeason]}>
                      {realm.currentSeason.charAt(0).toUpperCase() + realm.currentSeason.slice(1)}
                    </Badge>
                    <div className="text-2xl font-bold">
                      Year {realm.currentYear}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Day {realm.currentDay} • Watch {realm.currentWatch}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Factions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Swords className="size-4" />
                    Factions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{data.factionCount}</div>
                    <div className="text-sm text-muted-foreground">
                      {data.activeFactions.length} active
                    </div>
                    {data.activeFactions.length > 0 && (
                      <ScrollArea className="h-16">
                        <div className="flex flex-wrap gap-1">
                          {data.activeFactions.slice(0, 5).map((faction) => (
                            <Badge key={faction.id} variant="outline" className="text-xs">
                              {faction.name}
                            </Badge>
                          ))}
                          {data.activeFactions.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{data.activeFactions.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* NPCs Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Users className="size-4" />
                    NPCs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{data.npcCount}</div>
                    <div className="text-sm text-muted-foreground">
                      Total characters
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weather Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <CloudRain className="size-4" />
                    Weather
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {latestWeather ? (
                      <>
                        <div className="text-2xl font-bold capitalize">
                          {latestWeather.condition}
                        </div>
                        <Badge className={WEATHER_SEVERITY_COLORS[latestWeather.severity] || WEATHER_SEVERITY_COLORS.clear}>
                          {latestWeather.severity}
                        </Badge>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No weather data
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                <Link to="/realms/calendar">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <Calendar className="size-5" />
                    <div className="text-left">
                      <div className="font-medium">Calendar</div>
                      <div className="text-xs text-muted-foreground">Manage time & weather</div>
                    </div>
                    <ChevronRight className="size-4 ml-auto" />
                  </Button>
                </Link>

                <Link to="/realms/factions">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <Swords className="size-5" />
                    <div className="text-left">
                      <div className="font-medium">Factions</div>
                      <div className="text-xs text-muted-foreground">View all factions</div>
                    </div>
                    <ChevronRight className="size-4 ml-auto" />
                  </Button>
                </Link>

                <Link to="/realms/npcs">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <Users className="size-5" />
                    <div className="text-left">
                      <div className="font-medium">NPCs</div>
                      <div className="text-xs text-muted-foreground">Manage characters</div>
                    </div>
                    <ChevronRight className="size-4 ml-auto" />
                  </Button>
                </Link>

                <Link to="/realms/locations/regions">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <Map className="size-5" />
                    <div className="text-left">
                      <div className="font-medium">Regions</div>
                      <div className="text-xs text-muted-foreground">Explore locations</div>
                    </div>
                    <ChevronRight className="size-4 ml-auto" />
                  </Button>
                </Link>

                <Link to="/realms/locations/pois">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <MapPin className="size-5" />
                    <div className="text-left">
                      <div className="font-medium">Points of Interest</div>
                      <div className="text-xs text-muted-foreground">View POIs & paths</div>
                    </div>
                    <ChevronRight className="size-4 ml-auto" />
                  </Button>
                </Link>

                <Link to="/realms/tables">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <Dices className="size-5" />
                    <div className="text-left">
                      <div className="font-medium">Random Tables</div>
                      <div className="text-xs text-muted-foreground">Roll on tables</div>
                    </div>
                    <ChevronRight className="size-4 ml-auto" />
                  </Button>
                </Link>

                <Link to="/realms/notes">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <Scroll className="size-5" />
                    <div className="text-left">
                      <div className="font-medium">Notes</div>
                      <div className="text-xs text-muted-foreground">Campaign notes</div>
                    </div>
                    <ChevronRight className="size-4 ml-auto" />
                  </Button>
                </Link>

                <Link to="/realms">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                    <Compass className="size-5" />
                    <div className="text-left">
                      <div className="font-medium">All Realms</div>
                      <div className="text-xs text-muted-foreground">Switch realm</div>
                    </div>
                    <ChevronRight className="size-4 ml-auto" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recent Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scroll className="size-5" />
                  Recent Events
                </CardTitle>
                <CardDescription>
                  Latest happenings in your realm
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No events yet. Your realm's story begins now.
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {recentEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex gap-3 pb-4 border-b last:border-0 last:pb-0"
                        >
                          <div className="flex-shrink-0">
                            <Badge className={EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.other}>
                              {event.type}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{event.title}</div>
                            {event.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {event.description}
                              </div>
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
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
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
                    <Label htmlFor="settingsDaysPerSeason">Days per season (month)</Label>
                    <Input
                      id="settingsDaysPerSeason"
                      type="number"
                      min={10}
                      max={90}
                      value={settingsDaysPerSeason}
                      onChange={(e) => setSettingsDaysPerSeason(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">10 &ndash; 90</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settingsDaysPerWeek">Days per week</Label>
                    <Input
                      id="settingsDaysPerWeek"
                      type="number"
                      min={5}
                      max={10}
                      value={settingsDaysPerWeek}
                      onChange={(e) => setSettingsDaysPerWeek(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">5 &ndash; 10</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settingsWatchesPerDay">Watches per day</Label>
                    <Input
                      id="settingsWatchesPerDay"
                      type="number"
                      min={2}
                      max={6}
                      value={settingsWatchesPerDay}
                      onChange={(e) => setSettingsWatchesPerDay(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">2 &ndash; 6</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Faction Turns</CardTitle>
                <CardDescription>When faction turns auto-trigger on clock advance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-xs">
                  <Label>Trigger frequency</Label>
                  <Select value={settingsFactionTurnTrigger} onValueChange={(v) => setSettingsFactionTurnTrigger(v as 'day' | 'week' | 'manual')}>
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
              {settingsSaved && <span className="text-sm text-green-600">Saved!</span>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
