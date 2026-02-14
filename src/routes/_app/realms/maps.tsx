import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useContainer } from '~/ui/hooks/useContainer'
import { useRealmMaps, useAllRealmMaps } from '~/ui/hooks/useGameMaps'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { executeCreateGameMap } from '@application/use-cases/CreateGameMap'
import { executeDeleteGameMap } from '@application/use-cases/DeleteGameMap'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { MapUploadDialog } from '~/components/map/MapUploadDialog'
import { InteractiveMap } from '~/components/map/InteractiveMap'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { MapPinned, Plus, Trash2, Upload } from 'lucide-react'
import type { GameMap } from '@domain/entities/GameMap'

type MapsSearch = { tab?: 'realm-map' | 'all-maps' }

export const Route = createFileRoute('/_app/realms/maps')({
  component: MapsPage,
  validateSearch: (search: Record<string, unknown>): MapsSearch => ({
    tab: search.tab === 'all-maps' ? 'all-maps' : 'realm-map',
  }),
})

function MapThumbnail({ map }: { map: GameMap }) {
  const [url, setUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const blobUrl = URL.createObjectURL(map.imageBlob)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        setUrl(blobUrl)
        return
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setUrl(blobUrl)
        return
      }
      const maxW = 400
      const maxH = 200
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
      canvas.width = img.naturalWidth * scale
      canvas.height = img.naturalHeight * scale
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      setUrl(canvas.toDataURL('image/jpeg', 0.7))
      URL.revokeObjectURL(blobUrl)
    }
    img.src = blobUrl
    return () => {
      if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.id, map.imageBlob])

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      {url ? (
        <img src={url} alt={map.name} className="w-full h-40 object-cover rounded-t-lg bg-muted" />
      ) : (
        <div className="w-full h-40 bg-muted rounded-t-lg flex items-center justify-center">
          <MapPinned className="size-8 text-muted-foreground/50" />
        </div>
      )}
    </>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────

function MapsPage() {
  const { tab } = useSearch({ from: '/_app/realms/maps' })
  const navigate = useNavigate()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realmMaps = useRealmMaps(activeRealmId)
  const allMaps = useAllRealmMaps(activeRealmId)
  const allPois = useRealmPOIs(activeRealmId)
  const container = useContainer()

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deletingMap, setDeletingMap] = useState<GameMap | null>(null)

  const realmMap = realmMaps[0] ?? null // first realm map = default "Realm Map"

  const handleUpload = async (data: { name: string; imageBlob: Blob; width: number; height: number }) => {
    if (!activeRealmId) return
    await executeCreateGameMap(
      { ...data, ownerRealmId: activeRealmId },
      { gameMapRepo: container.gameMapRepo }
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
      <Tabs value={tab} onValueChange={(v) => navigate({ to: '/realms/maps', search: { tab: v as MapsSearch['tab'] }, replace: true })}>
        <TabsList>
          <TabsTrigger value="realm-map">Realm Map</TabsTrigger>
          <TabsTrigger value="all-maps">All Maps ({allMaps.length})</TabsTrigger>
        </TabsList>

        {/* ── Realm Map tab ── */}
        <TabsContent value="realm-map">
          {realmMap ? (
            <InteractiveMap gameMap={realmMap} className="h-[calc(100vh-10rem)]" />
          ) : (
            <EmptyState
              icon={MapPinned}
              title="No realm map"
              description="Upload a map image to get started"
              action={
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="mr-2 size-4" />
                  Upload Realm Map
                </Button>
              }
            />
          )}
        </TabsContent>

        {/* ── All Maps tab ── */}
        <TabsContent value="all-maps">
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
                      <Card className="overflow-hidden hover:ring-1 hover:ring-primary transition-all cursor-pointer group">
                        <MapThumbnail map={map} />
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{map.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {map.ownerPoiId && poisById.get(map.ownerPoiId) && (
                                  <span className="text-primary">{poisById.get(map.ownerPoiId)!.name} · </span>
                                )}
                                {map.width} × {map.height}px
                                {poisByMap.has(map.id) && (
                                  <> · {poisByMap.get(map.id)} POI{poisByMap.get(map.id)! > 1 ? 's' : ''}</>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 shrink-0"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setDeletingMap(map)
                              }}
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
          </div>
        </TabsContent>
      </Tabs>

      <MapUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUpload}
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
