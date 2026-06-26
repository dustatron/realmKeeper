import { Button } from '~/components/ui/button'
import {
  MousePointer,
  MapPin,
  Route,
  Upload,
  Maximize,
  Tag,
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
  hideRegionControls?: boolean
  onModeChange: (mode: MapMode) => void
  onToggleLabels: () => void
  onToggleRegions: () => void
  onUpload: () => void
  onZoomToFit: () => void
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
  hideRegionControls,
  onModeChange,
  onToggleLabels,
  onToggleRegions,
  onUpload,
  onZoomToFit,
  poiSelectMode,
  onTogglePoiSelectMode,
  leftSlot,
}: MapToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-background/95 backdrop-blur border-b">
      <div className="mr-auto flex items-center gap-2">{leftSlot}</div>

      <div className="flex items-center border rounded-md">
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
        onClick={onToggleLabels}
        title={showLabels ? 'Hide labels' : 'Show labels'}
      >
        <Tag className="size-4" />
      </Button>

      {!hideRegionControls && (
        <Button
          variant={showRegions ? 'secondary' : 'outline'}
          size="sm"
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
          onClick={onTogglePoiSelectMode}
          title={poiSelectMode ? 'Click markers to select rooms' : 'Click markers to inspect/edit'}
        >
          <MousePointerClick className="size-4" />
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={onZoomToFit} title="Zoom to fit">
        <Maximize className="size-4" />
      </Button>

      <Button variant="outline" size="sm" onClick={onUpload} title="Replace image">
        <Upload className="size-4" />
      </Button>
    </div>
  )
}
