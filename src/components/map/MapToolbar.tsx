import { Button } from '~/components/ui/button'
import {
  MousePointer,
  MapPin,
  Route,
  Upload,
  Maximize,
  Expand,
  Shrink,
  Tag,
  Gem,
  Hexagon,
  Layers,
  MousePointerClick,
} from 'lucide-react'
import type { MapMode } from './MapViewer'
import type { ReactNode } from 'react'

interface MapToolbarProps {
  mode: MapMode
  showLabels: boolean
  showRegions: boolean
  showResources?: boolean
  hideRegionControls?: boolean
  onModeChange: (mode: MapMode) => void
  onToggleLabels: () => void
  onToggleResources?: () => void
  onToggleRegions: () => void
  onUpload: () => void
  onZoomToFit: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  /** When true, clicking markers selects rooms instead of opening popup */
  poiSelectMode?: boolean
  onTogglePoiSelectMode?: () => void
  /** Optional controls rendered left-aligned on the same toolbar row (e.g. town generation). */
  leftSlot?: ReactNode
}

export function MapToolbar({
  mode,
  showLabels,
  showRegions,
  showResources,
  hideRegionControls,
  onModeChange,
  onToggleLabels,
  onToggleResources,
  onToggleRegions,
  onUpload,
  onZoomToFit,
  isFullscreen,
  onToggleFullscreen,
  poiSelectMode,
  onTogglePoiSelectMode,
  leftSlot,
}: MapToolbarProps) {
  return (
    <div className="flex items-center gap-2 overflow-hidden border-b bg-background/95 p-2 backdrop-blur">
      <div className="mr-auto flex min-w-0 flex-1 items-center gap-2 overflow-hidden">{leftSlot}</div>

      <div className="flex shrink-0 items-center rounded-md border">
        <Button
          variant={mode === 'view' ? 'secondary' : 'ghost'}
          size="sm"
          className="rounded-r-none"
          onClick={() => onModeChange('view')}
          title="View mode"
        >
          <MousePointer className="size-4" />
        </Button>
        <Button
          variant={mode === 'place-poi' ? 'secondary' : 'ghost'}
          size="sm"
          className="rounded-none border-x"
          onClick={() => onModeChange('place-poi')}
          title="Place POI mode"
        >
          <MapPin className="size-4" />
        </Button>
        <Button
          variant={mode === 'draw-path' ? 'secondary' : 'ghost'}
          size="sm"
          className={hideRegionControls ? 'rounded-l-none' : 'rounded-none border-r'}
          onClick={() => onModeChange('draw-path')}
          title="Draw path mode"
        >
          <Route className="size-4" />
        </Button>
        {!hideRegionControls && (
          <Button
            variant={mode === 'draw-region' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-l-none"
            onClick={() => onModeChange('draw-region')}
            title="Draw region boundary"
          >
            <Hexagon className="size-4" />
          </Button>
        )}
      </div>

      <Button
        variant={showLabels ? 'secondary' : 'outline'}
        size="sm"
        className="shrink-0"
        onClick={onToggleLabels}
        title={showLabels ? 'Hide labels' : 'Show labels'}
      >
        <Tag className="size-4" />
      </Button>

      {onToggleResources && (
        <Button
          variant={showResources ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={onToggleResources}
          title={showResources ? 'Hide resources' : 'Show resources'}
        >
          <Gem className="size-4" />
        </Button>
      )}

      {!hideRegionControls && (
        <Button
          variant={showRegions ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={onToggleRegions}
          title={showRegions ? 'Hide regions' : 'Show regions'}
        >
          <Layers className="size-4" />
        </Button>
      )}

      {onTogglePoiSelectMode != null && (
        <Button
          variant={poiSelectMode ? 'secondary' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={onTogglePoiSelectMode}
          title={poiSelectMode ? 'Click markers to select rooms' : 'Click markers to inspect/edit'}
        >
          <MousePointerClick className="size-4" />
        </Button>
      )}

      <Button variant="outline" size="sm" className="shrink-0" onClick={onZoomToFit} title="Zoom to fit">
        <Maximize className="size-4" />
      </Button>

      {onToggleFullscreen && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Shrink className="size-4" /> : <Expand className="size-4" />}
        </Button>
      )}

      <Button variant="outline" size="sm" className="shrink-0" onClick={onUpload} title="Replace image">
        <Upload className="size-4" />
      </Button>
    </div>
  )
}
