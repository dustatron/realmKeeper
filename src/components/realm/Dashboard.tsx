import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useTimeline } from '~/ui/hooks/useTimeline'
import { useRecentWeather } from '~/ui/hooks/useWeather'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeGetDashboardData, type DashboardData } from '@application/use-cases/GetDashboardData'
import { formatWorldDateTime } from '@domain/value-objects/WorldDate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Skeleton } from '~/components/ui/skeleton'
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
  Dices
} from 'lucide-react'
import type { Season } from '@shared/constants'

interface DashboardProps {
  worldId: string
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

export function Dashboard({ worldId }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const container = useContainer()
  const realm = useActiveRealm()

  // Live updates
  const recentEvents = useTimeline(worldId, 5)
  const recentWeather = useRecentWeather(worldId, 3)

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

  return (
    <div className="space-y-6 p-6">
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
  )
}
