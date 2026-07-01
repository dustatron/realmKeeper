import { createFileRoute, Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDoom } from '~/ui/hooks/useDooms'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ArrowLeft, CheckCircle2, Circle, Skull, Zap } from 'lucide-react'
import { ProgressClock } from '~/components/shared/ProgressClock'
import { db } from '@infrastructure/dexie/db'

export const Route = createFileRoute('/_app/realms/dooms_/$doomId')({
  component: DoomDetailPage,
})

const STATUS_COLORS: Record<string, string> = {
  looming: 'bg-red-700',
  averted: 'bg-emerald-600',
  reckoned: 'bg-gray-600',
}

function DoomDetailPage() {
  const { doomId } = Route.useParams()
  const doom = useDoom(doomId)

  const doomEvents = useLiveQuery(
    async () => {
      if (!doomId) return []
      const all = await db.worldEvents
        .where('worldId')
        .equals(doom?.worldId ?? '')
        .filter((e) => e.type === 'doom_stage' && e.relatedEntityIds.includes(doomId))
        .toArray()
      return all.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        const seasonOrder = { spring: 0, summer: 1, fall: 2, winter: 3 }
        const sa = seasonOrder[a.season] ?? 0
        const sb = seasonOrder[b.season] ?? 0
        if (sa !== sb) return sa - sb
        return a.day - b.day
      })
    },
    [doomId, doom?.worldId],
  ) ?? []

  if (doom === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (doom === null) {
    return <div className="py-8 text-center text-muted-foreground">Doom not found.</div>
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const reckoningLabel = `${cap(doom.reckoningDate.season)} ${doom.reckoningDate.day}, Year ${doom.reckoningDate.year}`

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex flex-col">
            <span className="flex items-center gap-2">
              <Skull className="size-5 text-red-500" />
              {doom.name}
            </span>
            {doom.description && (
              <span className="text-sm font-normal text-muted-foreground line-clamp-2">
                {doom.description}
              </span>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/realms/factions">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status + progress clock */}
            <div className="flex items-center gap-4">
              <Badge className={`${STATUS_COLORS[doom.status] ?? 'bg-gray-600'} text-white`}>
                {cap(doom.status)}
              </Badge>
              <div className="flex items-center gap-2">
                <ProgressClock segments={doom.segments} progress={doom.progress} size={36} />
                <span className="text-sm text-muted-foreground">
                  {doom.progress}/{doom.segments} ticks
                </span>
              </div>
            </div>

            {/* Data list */}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {doom.vector && (
                <>
                  <dt className="text-muted-foreground">Vector</dt>
                  <dd className="capitalize">{doom.vector}</dd>
                </>
              )}
              {doom.keyedResource && (
                <>
                  <dt className="text-muted-foreground">Resource</dt>
                  <dd>{doom.keyedResource}</dd>
                </>
              )}
              {doom.keyedBiome && (
                <>
                  <dt className="text-muted-foreground">Biome</dt>
                  <dd className="capitalize">{doom.keyedBiome}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Reckoning</dt>
              <dd>{reckoningLabel}</dd>
            </dl>

            {/* Links */}
            <div className="flex flex-wrap gap-2 text-xs">
              {doom.doomFactionId && (
                <Link
                  to="/realms/factions/$factionId"
                  params={{ factionId: doom.doomFactionId }}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 hover:bg-accent transition-colors"
                >
                  <span className="text-muted-foreground">Faction</span>
                  <span className="font-medium text-foreground">{doom.doomFactionId}</span>
                </Link>
              )}
              {doom.hookId && (
                <Link
                  to="/realms/factions"
                  className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 hover:bg-accent transition-colors"
                >
                  <Zap className="size-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Avert Hook</span>
                  <span className="font-medium text-foreground">{doom.hookId}</span>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Grim Portents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {doom.stages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No portents.</p>
            ) : (
              doom.stages.map((stage, idx) => (
                <div key={idx} className="flex items-start gap-2 py-1">
                  {stage.fired ? (
                    <CheckCircle2 className="size-4 text-red-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className={`text-sm ${stage.fired ? 'line-through text-muted-foreground' : ''}`}>
                      {stage.portent}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">(tick {stage.threshold})</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Effects log */}
        {doomEvents.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-500">Doom Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {doomEvents.map((evt) => (
                <div key={evt.id} className="flex items-start gap-2 py-1 border-b last:border-0">
                  <Skull className="size-3.5 mt-0.5 shrink-0 text-red-400" />
                  <div>
                    <div className="text-sm font-medium">{evt.title}</div>
                    {evt.description && (
                      <p className="text-xs text-muted-foreground">{evt.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground/60">
                      {cap(evt.season)} {evt.day}, Y{evt.year}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
