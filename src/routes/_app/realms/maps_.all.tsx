import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useContainer } from '~/ui/hooks/useContainer'
import { useAllRealmMaps } from '~/ui/hooks/useGameMaps'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { executeCreateGameMap } from '@application/use-cases/CreateGameMap'
import { executeDeleteGameMap } from '@application/use-cases/DeleteGameMap'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { MapUploadDialog } from '~/components/map/MapUploadDialog'
import { IMAGE_MAP_GENERATORS } from '~/lib/watabou/generators'
import { BIOME_COLORS } from '~/lib/hexmap/hexLayout'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { MapPinned, Plus, Trash2 } from 'lucide-react'
import type { GameMap } from '@domain/entities/GameMap'

export const Route = createFileRoute('/_app/realms/maps_/all')({
  component: AllMapsPage,
})

function EmptyMapThumbnail() {
  return (
    <div className="flex h-40 w-full items-center justify-center rounded-t-lg bg-muted">
      <MapPinned className="size-8 text-muted-foreground/50" />
    </div>
  )
}

function HexMapThumbnail({ map }: { map: GameMap }) {
  const cells = map.hexCells ?? []
  if (cells.length === 0) return <EmptyMapThumbnail />

  const width = Math.max(map.width, 1)
  const height = Math.max(map.height, 1)

  return (
    <div className="h-40 w-full overflow-hidden rounded-t-lg bg-slate-950">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${map.name} terrain preview`}
        className="h-full w-full"
      >
        <rect width={width} height={height} fill="#0f172a" />
        {cells.map((cell) => (
          <polygon
            key={`${cell.q},${cell.r}`}
            points={cell.corners.map((corner) => `${corner.x},${corner.y}`).join(' ')}
            fill={BIOME_COLORS[cell.biome]}
            stroke="rgba(15, 23, 42, 0.5)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  )
}

function MapThumbnail({ map }: { map: GameMap }) {
  if (map.imageUrl) {
    return <img src={map.imageUrl} alt={map.name} className="h-40 w-full rounded-t-lg bg-muted object-cover" />
  }

  if (map.kind === 'hex') {
    return <HexMapThumbnail map={map} />
  }

  return <EmptyMapThumbnail />
}

function AllMapsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const allMaps = useAllRealmMaps(activeRealmId)
  const allPois = useRealmPOIs(activeRealmId)
  const container = useContainer()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deletingMap, setDeletingMap] = useState<GameMap | null>(null)

  const handleUpload = async (data: { name: string; imageUrl: string; width: number; height: number }) => {
    if (!activeRealmId) return
    await executeCreateGameMap(
      { ...data, ownerRealmId: activeRealmId },
      { gameMapRepo: container.gameMapRepo },
    )
  }

  const handleDelete = async () => {
    if (!deletingMap) return
    await executeDeleteGameMap(deletingMap.id, {
      gameMapRepo: container.gameMapRepo,
      poiRepo: container.poiRepo,
    })
    setDeletingMap(null)
  }

  const poisByMap = new Map<string, number>()
  const poisById = new Map(allPois.map((p) => [p.id, p]))
  for (const poi of allPois) {
    if (poi.mapRef) {
      poisByMap.set(poi.mapRef, (poisByMap.get(poi.mapRef) ?? 0) + 1)
    }
  }

  if (!activeRealmId) {
    return (
      <EmptyState
        icon={MapPinned}
        title="No realm selected"
        description="Select a realm to manage maps"
      />
    )
  }

  return (
    <div className="space-y-4">
      {allMaps.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No maps yet"
          description="Upload a map image to start placing POIs"
          action={
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Upload Map
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allMaps.map((map) => (
              <Link
                key={map.id}
                to={map.ownerPoiId ? '/realms/pois/$poiId' : '/realms/maps/$mapId'}
                params={map.ownerPoiId ? { poiId: map.ownerPoiId } : { mapId: map.id }}
              >
                <Card className="group cursor-pointer overflow-hidden transition-all hover:ring-1 hover:ring-primary">
                  <MapThumbnail map={map} />
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {map.ownerPoiId && poisById.get(map.ownerPoiId)
                            ? poisById.get(map.ownerPoiId)!.name
                            : 'Realm Map'}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {map.width} x {map.height}px
                          {poisByMap.has(map.id) && (
                            <> - {poisByMap.get(map.id)} POI{poisByMap.get(map.id)! > 1 ? 's' : ''}</>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 shrink-0 p-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setDeletingMap(map)
                        }}
                        title={`Delete ${map.name}`}
                        aria-label={`Delete ${map.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <Button variant="outline" className="w-full" onClick={() => setUploadDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Upload Map
          </Button>
        </>
      )}

      <MapUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUpload}
        imageGenerators={IMAGE_MAP_GENERATORS}
      />

      <ConfirmDialog
        open={deletingMap !== null}
        onOpenChange={(open) => !open && setDeletingMap(null)}
        title="Delete Map"
        description={`Are you sure you want to delete "${deletingMap?.name}"? POIs placed on this map will be unlinked.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
