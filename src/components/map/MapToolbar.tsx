import { Button } from '~/components/ui/button'
import {
  MousePointer,
  MapPin,
  Route,
  Upload,
  Maximize,
  Tag,
} from 'lucide-react'
import type { MapMode } from './MapViewer'

interface MapToolbarProps {
  mapName: string
  mode: MapMode
  showLabels: boolean
  onModeChange: (mode: MapMode) => void
  onToggleLabels: () => void
  onUpload: () => void
  onZoomToFit: () => void
}

export function MapToolbar({
  mapName,
  mode,
  showLabels,
  onModeChange,
  onToggleLabels,
  onUpload,
  onZoomToFit,
}: MapToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background/95 backdrop-blur border-b">
      <span className="text-sm font-medium truncate mr-auto">{mapName}</span>

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
          className="rounded-l-none"
          onClick={() => onModeChange('draw-path')}
          title="Draw path mode"
        >
          <Route className="size-4" />
        </Button>
      </div>

      <Button
        variant={showLabels ? 'secondary' : 'outline'}
        size="sm"
        onClick={onToggleLabels}
        title={showLabels ? 'Hide labels' : 'Show labels'}
      >
        <Tag className="size-4" />
      </Button>

      <Button variant="outline" size="sm" onClick={onZoomToFit} title="Zoom to fit">
        <Maximize className="size-4" />
      </Button>

      <Button variant="outline" size="sm" onClick={onUpload} title="Replace image">
        <Upload className="size-4" />
      </Button>
    </div>
  )
}
