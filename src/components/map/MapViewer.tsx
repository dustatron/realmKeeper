import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GameMap } from '@domain/entities/GameMap'
import type { POI } from '@domain/entities/POI'
import type { Path } from '@domain/entities/Path'
import type { PoiType } from '@shared/constants'
import {
  Building2,
  Home,
  DoorOpen,
  Castle,
  Skull,
  TreePine,
  Flag,
  LayoutGrid,
  Map as MapIcon,
  Landmark,
  Tent,
  Sparkles,
  MapPin,
} from 'lucide-react'
import { createRoot } from 'react-dom/client'

export type MapMode = 'view' | 'place-poi' | 'draw-path'

interface MapViewerProps {
  map: GameMap
  pois: POI[]
  paths: Path[]
  mode: MapMode
  selectedPoiId?: string | null
  showLabels?: boolean
  onPoiClick?: (poi: POI) => void
  onMapClick?: (position: { x: number; y: number }) => void
  onPoiDrag?: (poiId: string, position: { x: number; y: number }) => void
}

const POI_TYPE_ICONS: Record<PoiType, React.ComponentType<{ className?: string }>> = {
  settlement: Building2,
  building: Home,
  interior: DoorOpen,
  fortification: Castle,
  dungeon: Skull,
  natural: TreePine,
  landmark: Flag,
  district: LayoutGrid,
  zone: MapIcon,
  ruin: Landmark,
  camp: Tent,
  shrine: Sparkles,
  other: MapPin,
}

function MarkerIcon({ type, name, hasOwnMaps }: { type: PoiType; name: string; hasOwnMaps?: boolean }) {
  const Icon = POI_TYPE_ICONS[type] || MapPin
  return (
    <div className="group relative flex flex-col items-center cursor-pointer">
      <div className="relative flex items-center justify-center size-9 rounded-full bg-primary text-primary-foreground shadow-md border-2 border-background hover:scale-110 transition-transform">
        <Icon className="size-4" />
        {hasOwnMaps && (
          <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-blue-500 border border-background flex items-center justify-center">
            <MapIcon className="size-2 text-white" />
          </div>
        )}
      </div>
      <div className="map-marker-label absolute top-full mt-1 px-1.5 py-0.5 bg-popover text-popover-foreground text-xs rounded shadow-sm border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {name}
      </div>
    </div>
  )
}

export function MapViewer({
  map,
  pois,
  paths,
  mode,
  selectedPoiId,
  showLabels,
  onPoiClick,
  onMapClick,
  onPoiDrag,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const imageUrlRef = useRef<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // Convert pixel coords to lng/lat using a safe coordinate range.
  // We scale the image so the larger dimension fits within 160° (staying well within ±85°).
  const scale = useMemo(() => {
    const maxDeg = 160
    return Math.min(maxDeg / map.width, maxDeg / map.height)
  }, [map.width, map.height])

  const pxToLngLat = useCallback(
    (x: number, y: number): [number, number] => {
      const lng = (x - map.width / 2) * scale
      const lat = (map.height / 2 - y) * scale
      return [lng, lat]
    },
    [map.width, map.height, scale]
  )

  const lngLatToPx = useCallback(
    (lng: number, lat: number): { x: number; y: number } => {
      const x = lng / scale + map.width / 2
      const y = map.height / 2 - lat / scale
      return { x, y }
    },
    [map.width, map.height, scale]
  )

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return

    const blobUrl = URL.createObjectURL(map.imageBlob)
    imageUrlRef.current = blobUrl

    const [swLng, swLat] = pxToLngLat(0, map.height)
    const [neLng, neLat] = pxToLngLat(map.width, 0)

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'map-image': {
            type: 'image',
            url: blobUrl,
            coordinates: [
              [swLng, neLat], // top-left
              [neLng, neLat], // top-right
              [neLng, swLat], // bottom-right
              [swLng, swLat], // bottom-left
            ],
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#1a1a2e' },
          },
          {
            id: 'map-image-layer',
            type: 'raster',
            source: 'map-image',
            paint: { 'raster-opacity': 1 },
          },
        ],
      },
      center: [0, 0],
      zoom: 1,
      maxBounds: [
        [Math.max(swLng - 20, -180), Math.max(swLat - 20, -85)],
        [Math.min(neLng + 20, 180), Math.min(neLat + 20, 85)],
      ],
      attributionControl: false,
    })

    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    mapInstance.on('load', () => {
      setMapReady(true)
    })

    mapRef.current = mapInstance

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
      mapInstance.remove()
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current)
        imageUrlRef.current = null
      }
      setMapReady(false)
    }
  }, [map.id, map.imageBlob, map.width, map.height, pxToLngLat])

  // Handle map click (for placing POIs)
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return

    const handler = (e: maplibregl.MapMouseEvent) => {
      if (mode !== 'place-poi' || !onMapClick) return
      const pos = lngLatToPx(e.lngLat.lng, e.lngLat.lat)
      // Only fire if within image bounds
      if (pos.x >= 0 && pos.x <= map.width && pos.y >= 0 && pos.y <= map.height) {
        onMapClick(pos)
      }
    }
    instance.on('click', handler)
    return () => {
      instance.off('click', handler)
    }
  }, [mapReady, mode, onMapClick, lngLatToPx, map.width, map.height])

  // Update cursor based on mode
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return
    const canvas = instance.getCanvas()
    canvas.style.cursor = mode === 'place-poi' ? 'crosshair' : ''
    return () => {
      canvas.style.cursor = ''
    }
  }, [mode, mapReady])

  // Render POI markers
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return

    const currentIds = new Set(pois.map((p) => p.id))
    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    })

    // Add or update markers
    pois.forEach((poi) => {
      if (!poi.position) return
      const [lng, lat] = pxToLngLat(poi.position.x, poi.position.y)
      const existing = markersRef.current.get(poi.id)

      if (existing) {
        existing.setLngLat([lng, lat])
        existing.setDraggable(mode === 'place-poi')
        return
      }

      // Create marker DOM
      const el = document.createElement('div')
      el.className = 'map-marker-container'
      const root = createRoot(el)
      root.render(<MarkerIcon type={poi.type} name={poi.name} />)

      const marker = new maplibregl.Marker({
        element: el,
        draggable: mode === 'place-poi',
        anchor: 'bottom',
      })
        .setLngLat([lng, lat])
        .addTo(instance)

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onPoiClick?.(poi)
      })

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        const pos = lngLatToPx(lngLat.lng, lngLat.lat)
        onPoiDrag?.(poi.id, pos)
      })

      markersRef.current.set(poi.id, marker)
    })
  }, [pois, mapReady, mode, pxToLngLat, lngLatToPx, onPoiClick, onPoiDrag])

  // Render path lines
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return

    const sourceId = 'paths-source'
    const layerId = 'paths-layer'

    // Build GeoJSON for paths
    const poiMap = new Map(pois.map((p) => [p.id, p]))
    const features = paths
      .map((path) => {
        const from = poiMap.get(path.fromPoiId)
        const to = poiMap.get(path.toPoiId)
        if (!from?.position || !to?.position) return null
        const fromCoord = pxToLngLat(from.position.x, from.position.y)
        const toCoord = pxToLngLat(to.position.x, to.position.y)
        return {
          type: 'Feature' as const,
          properties: { id: path.id, type: path.type },
          geometry: {
            type: 'LineString' as const,
            coordinates: [fromCoord, toCoord],
          },
        }
      })
      .filter(Boolean)

    const geojson = {
      type: 'FeatureCollection' as const,
      features,
    }

    if (instance.getSource(sourceId)) {
      ;(instance.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson as GeoJSON.FeatureCollection)
    } else {
      instance.addSource(sourceId, { type: 'geojson', data: geojson as GeoJSON.FeatureCollection })
      instance.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.8,
        },
      })
    }
  }, [paths, pois, mapReady, pxToLngLat])

  // Highlight selected POI
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement()
      if (id === selectedPoiId) {
        el.classList.add('ring-2', 'ring-primary', 'rounded-full')
      } else {
        el.classList.remove('ring-2', 'ring-primary', 'rounded-full')
      }
    })
  }, [selectedPoiId])

  return (
    <div className={`w-full h-full min-h-[200px] relative ${showLabels ? 'map-show-labels' : ''}`}>
      <style>{`.map-show-labels .map-marker-label { opacity: 1 !important; }`}</style>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
