import { useState } from 'react'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeDeleteGameMap } from '@application/use-cases/DeleteGameMap'
import { InteractiveMap } from '~/components/map/InteractiveMap'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { EmptyState } from '~/components/shared/EmptyState'
import { MapUploadDialog } from '~/components/map/MapUploadDialog'
import { Button } from '~/components/ui/button'
import { MapPinned, Plus, Upload, X } from 'lucide-react'
import type { GameMap } from '@domain/entities/GameMap'

interface MultiMapViewerProps {
  maps: GameMap[]
  onUpload?: (data: { name: string; imageUrl: string; width: number; height: number }) => void
  onRequestUpload?: () => void
  /** CSS class for the InteractiveMap height */
  className?: string
  parentPoiId?: string | null
  highlightPoiId?: string | null
  /** Called when a POI marker is clicked (for room selection) */
  onPoiSelect?: (poiId: string) => void
  /** Show a reset view button inside the rendered map. */
  showResetControl?: boolean
  /** Render without the default border frame. Useful for full-page map workspaces. */
  framed?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export function MultiMapViewer({
  maps,
  onUpload,
  onRequestUpload,
  className = 'h-[300px] md:h-[500px]',
  parentPoiId,
  highlightPoiId,
  onPoiSelect,
  showResetControl = true,
  framed = true,
  emptyTitle = 'No maps yet',
  emptyDescription = 'Upload a map image to get started',
}: MultiMapViewerProps) {
  const container = useContainer()
  const [activeMapIndex, setActiveMapIndex] = useState(0)
  const [deletingMapId, setDeletingMapId] = useState<string | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  const clampedIndex = Math.min(activeMapIndex, Math.max(maps.length - 1, 0))
  const activeMap = maps[clampedIndex] ?? null
  const openUploadDialog = onRequestUpload ?? (() => setUploadDialogOpen(true))

  const handleDeleteMap = async () => {
    if (!deletingMapId) return
    await executeDeleteGameMap(deletingMapId, {
      gameMapRepo: container.gameMapRepo,
      poiRepo: container.poiRepo,
    })
    if (maps[clampedIndex]?.id === deletingMapId) {
      setActiveMapIndex(0)
    }
    setDeletingMapId(null)
  }

  if (!activeMap) {
    return (
      <>
        <EmptyState
          icon={MapPinned}
          title={emptyTitle}
          description={emptyDescription}
          action={onUpload ? (
            <Button onClick={openUploadDialog}>
              <Upload className="mr-2 size-4" />
              Upload Map
            </Button>
          ) : undefined}
        />
        {onUpload && !onRequestUpload && (
          <MapUploadDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            onUpload={onUpload}
          />
        )}
      </>
    )
  }

  const mapSwitcher = (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {maps.map((m, i) => (
        <span key={m.id} className="flex shrink-0 items-center">
          <Button
            variant={i === clampedIndex ? 'secondary' : 'ghost'}
            size="sm"
            className={`h-7 max-w-48 text-xs ${onUpload ? 'pr-1' : ''}`}
            onClick={() => setActiveMapIndex(i)}
            title={m.name}
          >
            <span className="truncate">{m.name}</span>
          </Button>
          {onUpload && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-xs text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); setDeletingMapId(m.id) }}
              title={`Remove ${m.name}`}
              aria-label={`Remove ${m.name}`}
            >
              <X className="size-3" />
            </Button>
          )}
        </span>
      ))}
      {onUpload && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 text-xs text-muted-foreground"
          onClick={openUploadDialog}
        >
          <Plus className="mr-1 size-3" />
          Add
        </Button>
      )}
    </div>
  )

  return (
    <div className={framed ? 'overflow-hidden rounded-lg border' : 'h-full min-h-0 overflow-hidden'}>
      <InteractiveMap
        key={activeMap.id}
        gameMap={activeMap}
        className={className}
        parentPoiId={parentPoiId ?? undefined}
        highlightPoiId={highlightPoiId}
        onPoiSelect={onPoiSelect}
        showResetControl={showResetControl}
        toolbarLeftSlot={mapSwitcher}
      />

      <ConfirmDialog
        open={deletingMapId !== null}
        onOpenChange={(open) => !open && setDeletingMapId(null)}
        title="Remove Map"
        description="Remove this map? POIs placed on it will be unlinked."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDeleteMap}
      />

      {onUpload && !onRequestUpload && (
        <MapUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onUpload={onUpload}
        />
      )}
    </div>
  )
}
