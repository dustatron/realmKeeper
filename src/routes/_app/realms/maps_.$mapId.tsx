import { createFileRoute, Link } from '@tanstack/react-router'
import { useGameMap } from '~/ui/hooks/useGameMaps'
import { Button } from '~/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { InteractiveMap } from '~/components/map/InteractiveMap'

export const Route = createFileRoute('/_app/realms/maps_/$mapId')({
  component: MapViewerPage,
})

function MapViewerPage() {
  const { mapId } = Route.useParams()
  const gameMap = useGameMap(mapId)

  if (gameMap === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (!gameMap) {
    return <div className="py-8 text-center text-muted-foreground">Map not found.</div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
        <Link to="/realms/maps/all">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 size-4" />
            All Maps
          </Button>
        </Link>
      </div>
      <InteractiveMap gameMap={gameMap} className="flex-1 min-h-0" />
    </div>
  )
}
