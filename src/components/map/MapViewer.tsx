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

export interface MapViewerHandle {
  zoomToFit: () => void
}

interface MapViewerProps {
  map: GameMap
  pois: POI[]
  paths: Path[]
  mode: MapMode
  selectedPoiId?: string | null
  showLabels?: boolean
  initialViewState?: { zoom: number; center: [number, number] }
  onViewStateChange?: (zoom: number, center: [number, number]) => void
  onReady?: (handle: MapViewerHandle) => void
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

function MarkerIcon({ type, name, color, hasOwnMaps, showLabel }: { type: PoiType; name: string; color?: string | null; hasOwnMaps?: boolean; showLabel?: boolean }) {
  const Icon = POI_TYPE_ICONS[type] || MapPin
  return (
    <div className="group relative flex flex-col items-center cursor-pointer">
      <div
        className={`relative flex items-center justify-center size-9 rounded-full shadow-md border-2 border-background hover:scale-110 transition-transform ${color ? '' : 'bg-primary text-primary-foreground'}`}
        style={color ? { backgroundColor: color, color: '#fff' } : undefined}
      >
        <Icon className="size-4" />
        {hasOwnMaps && (
          <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-blue-500 border border-background flex items-center justify-center">
            <MapIcon className="size-2 text-white" />
          </div>
        )}
      </div>
      <div className={`map-marker-label absolute top-full mt-1 px-1.5 py-0.5 bg-popover text-popover-foreground text-xs rounded shadow-sm border whitespace-nowrap ${showLabel ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity pointer-events-none z-10`}>
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
  initialViewState,
  onViewStateChange,
  onReady,
  onPoiClick,
  onMapClick,
  onPoiDrag,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const markerRootsRef = useRef<Map<string, ReturnType<typeof createRoot>>>(new Map())
  const markerDataRef = useRef<Map<string, { type: string; name: string; color: string | null; showLabel: boolean }>>(new Map())
  const imageUrlRef = useRef<string | null>(null)
  const onPoiClickRef = useRef(onPoiClick)
  onPoiClickRef.current = onPoiClick
  const onPoiDragRef = useRef(onPoiDrag)
  onPoiDragRef.current = onPoiDrag
  const [mapReady, setMapReady] = useState(false)

  // Convert pixel coords to lng/lat near the equator where Mercator distortion is negligible.
  // Using a tiny range (1°) keeps the image undistorted regardless of aspect ratio.
  const scale = useMemo(() => {
    const maxDeg = 1
    return maxDeg / Math.max(map.width, map.height)
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
      center: initialViewState?.center ?? [0, 0],
      zoom: initialViewState?.zoom ?? 1,
      maxBounds: [
        [swLng - 0.5, swLat - 0.5],
        [neLng + 0.5, neLat + 0.5],
      ],
      attributionControl: false,
    })

    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    mapInstance.on('load', () => {
      setMapReady(true)
      const fitToImage = (duration = 300) => {
        mapInstance.fitBounds(
          [[swLng, swLat], [neLng, neLat]],
          { padding: 20, duration }
        )
      }
      onReady?.({ zoomToFit: () => fitToImage(300) })
      // Auto-fit on first load when no saved view state
      if (!initialViewState) {
        fitToImage(0)
      }
    })

    mapInstance.on('moveend', () => {
      const c = mapInstance.getCenter()
      onViewStateChange?.(mapInstance.getZoom(), [c.lng, c.lat])
    })

    mapRef.current = mapInstance

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
      markerRootsRef.current.clear()
      markerDataRef.current.clear()
      mapInstance.remove()
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current)
        imageUrlRef.current = null
      }
      setMapReady(false)
    }
  }, [map.id, map.imageBlob, map.width, map.height, pxToLngLat])

  // Keep pois in a ref so map click handler always has latest data
  const poisRef = useRef(pois)
  poisRef.current = pois

  // Handle map clicks (place-poi and draw-path modes)
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return

    const handler = (e: maplibregl.MapMouseEvent) => {
      const pos = lngLatToPx(e.lngLat.lng, e.lngLat.lat)
      const inBounds = pos.x >= 0 && pos.x <= map.width && pos.y >= 0 && pos.y <= map.height

      if (mode === 'place-poi' && inBounds) {
        onMapClick?.(pos)
        return
      }

      if (mode === 'draw-path') {
        // Find nearest POI within 30 screen-pixels
        const clickPx = 30
        const clickPoint = e.point // screen coords
        let nearest: POI | null = null
        let nearestDist = Infinity
        for (const poi of poisRef.current) {
          if (!poi.position) continue
          const [lng, lat] = pxToLngLat(poi.position.x, poi.position.y)
          const projected = instance.project([lng, lat])
          const dx = clickPoint.x - projected.x
          const dy = clickPoint.y - projected.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < nearestDist && dist < clickPx) {
            nearest = poi
            nearestDist = dist
          }
        }
        if (nearest) {
          onPoiClickRef.current?.(nearest)
        }
        return
      }
    }
    instance.on('click', handler)
    return () => {
      instance.off('click', handler)
    }
  }, [mapReady, mode, onMapClick, lngLatToPx, pxToLngLat, map.width, map.height])

  // Update cursor and drag behavior based on mode
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return
    const interactive = mode === 'place-poi' || mode === 'draw-path'
    const canvas = instance.getCanvas()
    canvas.style.cursor = interactive ? 'crosshair' : ''
    if (interactive) {
      instance.dragPan.disable()
    } else {
      instance.dragPan.enable()
    }
    return () => {
      canvas.style.cursor = ''
      instance.dragPan.enable()
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
        markerRootsRef.current.delete(id)
        markerDataRef.current.delete(id)
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
        // Re-render if type, name, or color changed
        const prev = markerDataRef.current.get(poi.id)
        if (prev && (prev.type !== poi.type || prev.name !== poi.name || prev.color !== (poi.markerColor ?? null) || prev.showLabel !== !!showLabels)) {
          const root = markerRootsRef.current.get(poi.id)
          root?.render(<MarkerIcon type={poi.type} name={poi.name} color={poi.markerColor} showLabel={showLabels} />)
          markerDataRef.current.set(poi.id, { type: poi.type, name: poi.name, color: poi.markerColor ?? null, showLabel: !!showLabels })
        }
        return
      }

      // Create marker DOM
      const el = document.createElement('div')
      el.className = 'map-marker-container'
      const root = createRoot(el)
      root.render(<MarkerIcon type={poi.type} name={poi.name} color={poi.markerColor} showLabel={showLabels} />)
      markerRootsRef.current.set(poi.id, root)
      markerDataRef.current.set(poi.id, { type: poi.type, name: poi.name, color: poi.markerColor ?? null, showLabel: !!showLabels })

      const marker = new maplibregl.Marker({
        element: el,
        draggable: mode === 'place-poi',
        anchor: 'bottom',
      })
        .setLngLat([lng, lat])
        .addTo(instance)

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onPoiClickRef.current?.(poi)
      })

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        const pos = lngLatToPx(lngLat.lng, lngLat.lat)
        onPoiDragRef.current?.(poi.id, pos)
      })

      markersRef.current.set(poi.id, marker)
    })
  }, [pois, mapReady, mode, showLabels, pxToLngLat, lngLatToPx])

  // Render path lines + watch labels
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return

    const lineSourceId = 'paths-source'
    const lineLayerId = 'paths-layer'
    const labelSourceId = 'path-labels-source'
    const labelLayerId = 'path-labels-layer'

    // Build GeoJSON for path lines
    const poiMap = new Map(pois.map((p) => [p.id, p]))
    const lineFeatures = paths
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

    const lineGeojson = { type: 'FeatureCollection' as const, features: lineFeatures }

    // Build GeoJSON for midpoint labels
    const labelFeatures = paths
      .map((path) => {
        const from = poiMap.get(path.fromPoiId)
        const to = poiMap.get(path.toPoiId)
        if (!from?.position || !to?.position) return null
        const midX = (from.position.x + to.position.x) / 2
        const midY = (from.position.y + to.position.y) / 2
        const midCoord = pxToLngLat(midX, midY)
        return {
          type: 'Feature' as const,
          properties: { label: `${path.baseTravelWatches}w` },
          geometry: { type: 'Point' as const, coordinates: midCoord },
        }
      })
      .filter(Boolean)

    const labelGeojson = { type: 'FeatureCollection' as const, features: labelFeatures }

    // Lines
    if (instance.getSource(lineSourceId)) {
      ;(instance.getSource(lineSourceId) as maplibregl.GeoJSONSource).setData(lineGeojson as GeoJSON.FeatureCollection)
    } else {
      instance.addSource(lineSourceId, { type: 'geojson', data: lineGeojson as GeoJSON.FeatureCollection })
      instance.addLayer({
        id: lineLayerId,
        type: 'line',
        source: lineSourceId,
        paint: {
          'line-color': '#1e293b',
          'line-width': 6,
          'line-dasharray': [2, 1],
          'line-opacity': 0.9,
        },
      })
    }

    // Labels
    if (instance.getSource(labelSourceId)) {
      ;(instance.getSource(labelSourceId) as maplibregl.GeoJSONSource).setData(labelGeojson as GeoJSON.FeatureCollection)
    } else {
      instance.addSource(labelSourceId, { type: 'geojson', data: labelGeojson as GeoJSON.FeatureCollection })
      instance.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: labelSourceId,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 13,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
          'text-offset': [0, -1],
        },
        paint: {
          'text-color': '#1e293b',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      })
    }

    // Toggle label visibility based on showLabels
    if (instance.getLayer(labelLayerId)) {
      instance.setLayoutProperty(labelLayerId, 'visibility', showLabels ? 'visible' : 'none')
    }
  }, [paths, pois, mapReady, showLabels, pxToLngLat])

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
    <div ref={containerRef} className="w-full h-full min-h-[200px]" />
  )
}
