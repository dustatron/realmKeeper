import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { GameMap } from '@domain/entities/GameMap'
import { BIOME_COLORS } from '~/lib/hexmap/hexLayout'
import { terrainTileForBiome } from '~/lib/hexmap/tileMapping'
import { TERRAIN_TILE_URLS } from '~/lib/hexmap/tileAssets'
import { colorForTerrain } from './terrainColors'
import type { POI } from '@domain/entities/POI'
import type { Path } from '@domain/entities/Path'
import type { Region } from '@domain/entities/Region'
import type { Connection } from '@domain/entities/Connection'
import type { PoiType, PoiStatus } from '@shared/constants'
import {
  buildRiverGeoJSON,
  buildChokepointGeoJSON,
  buildTradeRouteGeoJSON,
  buildTreasureGeoJSON,
  buildResourceIconGeoJSON,
  wealthBandColor,
} from '~/lib/map/mapLayers'
import { Button } from '~/components/ui/button'
import {
  Building2,
  Home,
  DoorOpen,
  Castle,
  Skull,
  Trees,
  Flag,
  LayoutGrid,
  Map as MapIcon,
  Landmark,
  Tent,
  Sparkles,
  Aperture,
  MapPin,
  RotateCcw,
  Check,
  CheckCheck,
} from 'lucide-react'
import { createRoot } from 'react-dom/client'

export type MapMode = 'view' | 'place-poi' | 'draw-path' | 'draw-region'

/** The toggleable Phase-4 overlay layers (terrain/regions/roads/markers are always on). */
export type MapLayerId = 'rivers' | 'trade' | 'wealth' | 'resources' | 'treasure'

const ALL_LAYERS_ON: Record<MapLayerId, boolean> = {
  rivers: true,
  trade: true,
  wealth: true,
  resources: true,
  treasure: true,
}


export interface MapViewerHandle {
  zoomToFit: () => void
}

interface MapViewerProps {
  map: GameMap
  pois: POI[]
  paths: Path[]
  regions?: Region[]
  /** Trade-graph connections (used for the trade-route layer). */
  connections?: Connection[]
  /** Visibility of the Phase-4 overlay layers. Omitted layers default to ON. */
  layers?: Partial<Record<MapLayerId, boolean>>
  mode: MapMode
  selectedPoiId?: string | null
  /** External highlight from sidebar card selection */
  highlightPoiId?: string | null
  showLabels?: boolean
  showRegions?: boolean
  initialViewState?: { zoom: number; center: [number, number] }
  onViewStateChange?: (zoom: number, center: [number, number]) => void
  onReady?: (handle: MapViewerHandle) => void
  onPoiClick?: (poi: POI) => void
  onMapClick?: (position: { x: number; y: number }) => void
  onPoiDrag?: (poiId: string, position: { x: number; y: number }) => void
  onRegionBoundaryDrawn?: (vertices: { x: number; y: number }[]) => void
  onRegionClick?: (region: Region) => void
  showResetControl?: boolean
}

const POI_TYPE_ICONS: Record<PoiType, React.ComponentType<{ className?: string }>> = {
  settlement: Building2,
  building: Home,
  interior: DoorOpen,
  fortification: Castle,
  dungeon: Skull,
  // Natural sites get a distinct grove icon to read apart from a single pine.
  natural: Trees,
  landmark: Flag,
  district: LayoutGrid,
  zone: MapIcon,
  ruin: Landmark,
  camp: Tent,
  shrine: Sparkles,
  portal: Aperture,
  other: MapPin,
}

function MarkerIcon({
  type,
  name,
  color,
  hasOwnMaps,
  showLabel,
  isHighlighted,
  status,
  dangerLevel,
  wealthColor,
}: {
  type: PoiType
  name: string
  color?: string | null
  hasOwnMaps?: boolean
  showLabel?: boolean
  isHighlighted?: boolean
  status?: PoiStatus
  dangerLevel?: number | null
  /** When set (wealth layer on), tints the marker ring by wealth band. */
  wealthColor?: string | null
}) {
  const Icon = POI_TYPE_ICONS[type] || MapPin
  const explored = status === 'explored'
  const cleared = status === 'cleared'
  // Exploration state tints the marker when the GM hasn't set a custom color,
  // and always adds a colored ring + corner badge so the state reads at a glance.
  const stateColor = cleared ? '#64748b' : explored ? '#10b981' : null
  const markerColor = isHighlighted ? '#facc15' : (color ?? stateColor)
  // Highlight/exploration rings take precedence; a wealth ring is applied via
  // inline style below only when none of those own the ring.
  const ringClass = isHighlighted
    ? 'border-amber-200 ring-2 ring-amber-400'
    : cleared
      ? 'border-background ring-2 ring-slate-400'
      : explored
        ? 'border-background ring-2 ring-emerald-400'
        : 'border-background'
  const useWealthRing = !!wealthColor && !isHighlighted && !cleared && !explored
  const dangerous = dangerLevel != null && dangerLevel >= 4
  return (
    <div className="group relative flex flex-col items-center cursor-pointer" role="button" style={{ touchAction: 'manipulation' }}>
      <div
        className={`relative flex items-center justify-center size-9 rounded-full shadow-md border-2 hover:scale-110 transition-transform ${
          markerColor ? '' : 'bg-primary text-primary-foreground'
        } ${ringClass} ${cleared ? 'opacity-70' : ''} ${isHighlighted ? 'scale-110' : ''}`}
        style={{
          ...(markerColor ? { backgroundColor: markerColor, color: isHighlighted ? '#111827' : '#fff' } : {}),
          // Subtle wealth ring: a colored box-shadow halo that doesn't disturb layout.
          ...(useWealthRing ? { boxShadow: `0 0 0 2px ${wealthColor}` } : {}),
        }}
      >
        <Icon className="size-4" />
        {hasOwnMaps && (
          <div className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-blue-500 border border-background flex items-center justify-center">
            <MapIcon className="size-2 text-white" />
          </div>
        )}
        {(explored || cleared) && (
          <div
            className={`absolute -top-1 -right-1 size-3.5 rounded-full border border-background flex items-center justify-center ${
              cleared ? 'bg-slate-500' : 'bg-emerald-500'
            }`}
            title={cleared ? 'Cleared' : 'Visited'}
          >
            {cleared ? <CheckCheck className="size-2 text-white" /> : <Check className="size-2 text-white" />}
          </div>
        )}
        {dangerous && (
          <div
            className="absolute -top-1 -left-1 size-3.5 rounded-full bg-red-600 border border-background flex items-center justify-center"
            title={`Danger ${dangerLevel}`}
          >
            <span className="text-[8px] font-bold leading-none text-white">!</span>
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
  regions,
  connections,
  layers,
  mode,
  selectedPoiId,
  highlightPoiId,
  showLabels,
  showRegions,
  initialViewState,
  onViewStateChange,
  onReady,
  onPoiClick,
  onMapClick,
  onPoiDrag,
  onRegionBoundaryDrawn,
  onRegionClick,
  showResetControl = true,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map())
  const markerRootsRef = useRef<Map<string, ReturnType<typeof createRoot>>>(new Map())
  const markerDataRef = useRef<Map<string, { type: string; name: string; color: string | null; showLabel: boolean; isHighlighted: boolean; status: PoiStatus; dangerLevel: number | null; wealthColor: string | null }>>(new Map())
  const imageUrlRef = useRef<string | null>(null)
  const onPoiClickRef = useRef(onPoiClick)
  onPoiClickRef.current = onPoiClick
  const onPoiDragRef = useRef(onPoiDrag)
  onPoiDragRef.current = onPoiDrag
  const onRegionBoundaryDrawnRef = useRef(onRegionBoundaryDrawn)
  onRegionBoundaryDrawnRef.current = onRegionBoundaryDrawn
  const onRegionClickRef = useRef(onRegionClick)
  onRegionClickRef.current = onRegionClick
  const fitToImageRef = useRef<((duration?: number) => void) | null>(null)
  const mapLoadKey = useMemo(
    () => `${map.id}:${map.imageUrl}:${map.width}:${map.height}`,
    [map.id, map.imageUrl, map.width, map.height],
  )
  const [loadedMapKey, setLoadedMapKey] = useState<string | null>(null)
  const mapReady = loadedMapKey === mapLoadKey
  const [drawingVertices, setDrawingVertices] = useState<{ x: number; y: number }[]>([])
  const activeHighlightId = selectedPoiId ?? highlightPoiId

  // Resolve the layer-visibility map: explicit prop entries win, everything
  // else defaults ON. Memoized so the marker/layer effects only re-run when a
  // toggle actually changes.
  const resolvedLayers = useMemo<Record<MapLayerId, boolean>>(
    () => ({ ...ALL_LAYERS_ON, ...layers }),
    [layers],
  )
  const { rivers: showRivers, trade: showTrade, wealth: showWealth, resources: showResources, treasure: showTreasure } = resolvedLayers

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

    setLoadedMapKey(null)
    imageUrlRef.current = map.imageUrl

    const [swLng, swLat] = pxToLngLat(0, map.height)
    const [neLng, neLat] = pxToLngLat(map.width, 0)

    const hasImage = !!map.imageUrl
    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: hasImage
          ? {
              'map-image': {
                type: 'image',
                url: map.imageUrl,
                coordinates: [
                  [swLng, neLat], // top-left
                  [neLng, neLat], // top-right
                  [neLng, swLat], // bottom-right
                  [swLng, swLat], // bottom-left
                ],
              },
            }
          : {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': hasImage ? '#1a1a2e' : map.kind === 'town' ? '#e8dcc0' : '#0f172a' },
          },
          ...(hasImage
            ? [
                {
                  id: 'map-image-layer',
                  type: 'raster' as const,
                  source: 'map-image',
                  paint: { 'raster-opacity': 1 },
                },
              ]
            : []),
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
      setLoadedMapKey(mapLoadKey)
      const fitToImage = (duration = 300) => {
        mapInstance.fitBounds(
          [[swLng, swLat], [neLng, neLat]],
          { padding: 20, duration }
        )
      }
      fitToImageRef.current = fitToImage
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
      // Null the ref so any in-flight async work (e.g. tile image onload) can
      // detect this map is gone and skip touching the removed instance.
      mapRef.current = null
      imageUrlRef.current = null
      fitToImageRef.current = null
      setLoadedMapKey((current) => current === mapLoadKey ? null : current)
    }
  }, [map.id, map.imageUrl, map.width, map.height, map.kind, mapLoadKey, pxToLngLat])

  // Keep pois in a ref so map click handler always has latest data
  const poisRef = useRef(pois)
  poisRef.current = pois

  // Handle map clicks (place-poi, draw-path, draw-region modes)
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

      if (mode === 'draw-region' && inBounds) {
        setDrawingVertices((prev) => {
          // Close polygon if clicking near the first vertex (within 15 screen-px)
          if (prev.length >= 3) {
            const [firstLng, firstLat] = pxToLngLat(prev[0].x, prev[0].y)
            const firstScreen = instance.project([firstLng, firstLat])
            const dx = e.point.x - firstScreen.x
            const dy = e.point.y - firstScreen.y
            if (Math.sqrt(dx * dx + dy * dy) < 15) {
              const completed = [...prev]
              onRegionBoundaryDrawnRef.current?.(completed)
              return []
            }
          }
          return [...prev, pos]
        })
        return
      }
    }

    const dblClickHandler = (e: maplibregl.MapMouseEvent) => {
      if (mode === 'draw-region') {
        e.preventDefault()
        setDrawingVertices((prev) => {
          if (prev.length >= 3) {
            onRegionBoundaryDrawnRef.current?.([...prev])
          }
          return []
        })
      }
    }

    instance.on('click', handler)
    instance.on('dblclick', dblClickHandler)
    return () => {
      instance.off('click', handler)
      instance.off('dblclick', dblClickHandler)
    }
  }, [mapReady, mode, onMapClick, lngLatToPx, pxToLngLat, map.width, map.height])

  // Update cursor and drag behavior based on mode
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return
    const interactive = mode === 'place-poi' || mode === 'draw-path' || mode === 'draw-region'
    const canvas = instance.getCanvas()
    canvas.style.cursor = interactive ? 'crosshair' : ''
    if (interactive) {
      instance.dragPan.disable()
    } else {
      instance.dragPan.enable()
    }
    // Reset drawing vertices when leaving draw-region mode
    if (mode !== 'draw-region') {
      setDrawingVertices([])
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

      // Wealth tint only when the wealth layer is on; null = no ring.
      const wealthColor = showWealth && poi.wealthBand ? wealthBandColor(poi.wealthBand) : null

      if (existing) {
        existing.setLngLat([lng, lat])
        existing.setDraggable(mode === 'place-poi')
        const isHighlighted = poi.id === activeHighlightId
        // Re-render if marker content or selected state changed.
        const prev = markerDataRef.current.get(poi.id)
        if (prev && (prev.type !== poi.type || prev.name !== poi.name || prev.color !== (poi.markerColor ?? null) || prev.showLabel !== !!showLabels || prev.isHighlighted !== isHighlighted || prev.status !== poi.status || prev.dangerLevel !== (poi.dangerLevel ?? null) || prev.wealthColor !== wealthColor)) {
          const root = markerRootsRef.current.get(poi.id)
          root?.render(<MarkerIcon type={poi.type} name={poi.name} color={poi.markerColor} showLabel={showLabels} isHighlighted={isHighlighted} status={poi.status} dangerLevel={poi.dangerLevel} wealthColor={wealthColor} />)
          markerDataRef.current.set(poi.id, { type: poi.type, name: poi.name, color: poi.markerColor ?? null, showLabel: !!showLabels, isHighlighted, status: poi.status, dangerLevel: poi.dangerLevel ?? null, wealthColor })
        }
        return
      }

      // Create marker DOM
      const el = document.createElement('div')
      el.className = 'map-marker-container'
      const root = createRoot(el)
      const isHighlighted = poi.id === activeHighlightId
      root.render(<MarkerIcon type={poi.type} name={poi.name} color={poi.markerColor} showLabel={showLabels} isHighlighted={isHighlighted} status={poi.status} dangerLevel={poi.dangerLevel} wealthColor={wealthColor} />)
      markerRootsRef.current.set(poi.id, root)
      markerDataRef.current.set(poi.id, { type: poi.type, name: poi.name, color: poi.markerColor ?? null, showLabel: !!showLabels, isHighlighted, status: poi.status, dangerLevel: poi.dangerLevel ?? null, wealthColor })

      const marker = new maplibregl.Marker({
        element: el,
        draggable: mode === 'place-poi',
        anchor: 'bottom',
        // Lift the pin into the upper part of the hex so it stops covering the
        // center of the hand-drawn feature tile (the doodle's distinctive bit).
        offset: [0, -14],
      })
        .setLngLat([lng, lat])
        .addTo(instance)

      // Use both click and touchend for iPad/touch compatibility
      // iOS Safari doesn't reliably fire click on non-interactive divs
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onPoiClickRef.current?.(poi)
      })
      let touchMoved = false
      el.addEventListener('touchstart', () => { touchMoved = false }, { passive: true })
      el.addEventListener('touchmove', () => { touchMoved = true }, { passive: true })
      el.addEventListener('touchend', (e) => {
        if (touchMoved) return // was a pan/drag, not a tap
        e.preventDefault() // prevent delayed click
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
  }, [activeHighlightId, pois, mapReady, mode, showLabels, showWealth, pxToLngLat, lngLatToPx])

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
          // Portals read as a distinct planar link (violet), roads as dark.
          'line-color': ['case', ['==', ['get', 'type'], 'portal'], '#a855f7', '#6b5334'],
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

  // Render region boundary polygons
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return

    const fillSourceId = 'regions-source'
    const fillLayerId = 'regions-fill'
    const outlineLayerId = 'regions-outline'
    const labelSourceId = 'region-labels-source'
    const labelLayerId = 'region-labels-layer'

    const regionsWithBoundary = (regions ?? []).filter((r) => r.boundary && r.boundary.length >= 3)

    // Build fill/outline GeoJSON
    const features = regionsWithBoundary.map((r) => {
      const coords = r.boundary!.map((p) => pxToLngLat(p.x, p.y))
      coords.push(coords[0]) // close ring
      const color = r.color ?? colorForTerrain(r.terrain)
      return {
        type: 'Feature' as const,
        properties: { id: r.id, name: r.name, color },
        geometry: { type: 'Polygon' as const, coordinates: [coords] },
      }
    })
    const geojson = { type: 'FeatureCollection' as const, features }

    // Build centroid labels
    const labelFeatures = regionsWithBoundary.map((r) => {
      const cx = r.boundary!.reduce((s, p) => s + p.x, 0) / r.boundary!.length
      const cy = r.boundary!.reduce((s, p) => s + p.y, 0) / r.boundary!.length
      return {
        type: 'Feature' as const,
        properties: { name: r.name },
        geometry: { type: 'Point' as const, coordinates: pxToLngLat(cx, cy) },
      }
    })
    const labelGeojson = { type: 'FeatureCollection' as const, features: labelFeatures }

    const visible = showRegions !== false

    // Fill + outline
    if (instance.getSource(fillSourceId)) {
      ;(instance.getSource(fillSourceId) as maplibregl.GeoJSONSource).setData(geojson as GeoJSON.FeatureCollection)
    } else {
      instance.addSource(fillSourceId, { type: 'geojson', data: geojson as GeoJSON.FeatureCollection })
      // Insert fill below POI markers by adding before paths layer if it exists
      const beforeLayer = instance.getLayer('paths-layer') ? 'paths-layer' : undefined
      instance.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: fillSourceId,
        paint: {
          'fill-color': ['get', 'color'],
          // Kept low so the hand-drawn terrain tiles stay the dominant layer
          // (region grouping still reads via the outline + label).
          'fill-opacity': 0.1,
        },
      }, beforeLayer)
      instance.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: fillSourceId,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.8,
        },
      }, beforeLayer)
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
          'text-field': ['get', 'name'],
          'text-size': 14,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-halo-color': '#0f172a',
          'text-halo-width': 2,
        },
      })
    }

    // Toggle visibility
    if (instance.getLayer(fillLayerId)) {
      instance.setLayoutProperty(fillLayerId, 'visibility', visible ? 'visible' : 'none')
    }
    if (instance.getLayer(outlineLayerId)) {
      instance.setLayoutProperty(outlineLayerId, 'visibility', visible ? 'visible' : 'none')
    }
    if (instance.getLayer(labelLayerId)) {
      instance.setLayoutProperty(labelLayerId, 'visibility', visible && showLabels ? 'visible' : 'none')
    }
  }, [regions, mapReady, showRegions, showLabels, pxToLngLat])

  // Region click handler
  const regionsRef = useRef(regions)
  regionsRef.current = regions
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return

    const handler = (e: maplibregl.MapLayerMouseEvent) => {
      if (mode !== 'view') return
      const feature = e.features?.[0]
      if (!feature) return
      const regionId = feature.properties?.id
      const region = regionsRef.current?.find((r) => r.id === regionId)
      if (region) {
        e.originalEvent.stopPropagation()
        onRegionClickRef.current?.(region)
      }
    }

    const cursorEnter = () => {
      if (mode === 'view') instance.getCanvas().style.cursor = 'pointer'
    }
    const cursorLeave = () => {
      if (mode === 'view') instance.getCanvas().style.cursor = ''
    }

    instance.on('click', 'regions-fill', handler)
    instance.on('mouseenter', 'regions-fill', cursorEnter)
    instance.on('mouseleave', 'regions-fill', cursorLeave)
    return () => {
      instance.off('click', 'regions-fill', handler)
      instance.off('mouseenter', 'regions-fill', cursorEnter)
      instance.off('mouseleave', 'regions-fill', cursorLeave)
    }
  }, [mapReady, mode])

  // Render hex-grid biome fill for kind:'hex' maps.
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return
    if (map.kind !== 'hex' || !map.hexCells || map.hexCells.length === 0) return

    const sourceId = 'hex-cells'
    const layerId = 'hex-cells-fill'
    const lineId = 'hex-cells-line'

    const features = map.hexCells.map((cell) => ({
      type: 'Feature' as const,
      properties: { color: BIOME_COLORS[cell.biome] },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [...cell.corners.map((c) => pxToLngLat(c.x, c.y)),
           pxToLngLat(cell.corners[0].x, cell.corners[0].y)],
        ],
      },
    }))
    const geojson = { type: 'FeatureCollection' as const, features }

    const existing = instance.getSource(sourceId) as maplibregl.GeoJSONSource | undefined
    if (existing) {
      existing.setData(geojson as GeoJSON.FeatureCollection)
    } else {
      instance.addSource(sourceId, { type: 'geojson', data: geojson as GeoJSON.FeatureCollection })
      // Insert the biome fill at the BOTTOM (just above the background layer) so
      // the region fill/outline/labels — added by the region effect — render ON
      // TOP of the terrain instead of being hidden beneath an 85%-opaque fill.
      const styleLayers = instance.getStyle().layers
      const bgIdx = styleLayers.findIndex((l) => l.id === 'background')
      const beforeId = bgIdx >= 0 ? styleLayers[bgIdx + 1]?.id : undefined
      instance.addLayer(
        {
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.85 },
        },
        beforeId,
      )
      instance.addLayer(
        {
          id: lineId,
          type: 'line',
          source: sourceId,
          paint: { 'line-color': '#00000033', 'line-width': 1 },
        },
        beforeId,
      )
    }

    // Hand-drawn tile overlay: one centered icon per hex (cell.tile, falling back
    // to the biome's terrain tile). Sits just above the color fill, which shows
    // through transparent tiles and covers biomes with no tile (desert/frozen).
    const tileSourceId = 'hex-tiles'
    const tileLayerId = 'hex-tiles-symbol'

    const tileFeatures = map.hexCells
      .map((cell) => {
        const tile = cell.tile ?? terrainTileForBiome(cell.biome) ?? null
        if (!tile || !TERRAIN_TILE_URLS[tile]) return null
        // Centroid of the hex from its corners.
        const cx = cell.corners.reduce((s, c) => s + c.x, 0) / cell.corners.length
        const cy = cell.corners.reduce((s, c) => s + c.y, 0) / cell.corners.length
        return {
          type: 'Feature' as const,
          properties: { icon: `tile-${tile}` },
          geometry: { type: 'Point' as const, coordinates: pxToLngLat(cx, cy) },
        }
      })
      .filter(Boolean)
    const tileGeojson = { type: 'FeatureCollection' as const, features: tileFeatures }

    // Load each needed tile image once (async), then repaint so it appears.
    const neededTiles = new Set(
      map.hexCells
        .map((cell) => cell.tile ?? terrainTileForBiome(cell.biome) ?? null)
        .filter((t): t is string => !!t && !!TERRAIN_TILE_URLS[t]),
    )
    for (const tile of neededTiles) {
      const imageId = `tile-${tile}`
      if (instance.hasImage(imageId)) continue
      const img = new Image()
      img.onload = () => {
        // Bail if the map was unmounted or switched while this image loaded —
        // `instance` would be a removed map (style undefined) and throw.
        if (mapRef.current !== instance) return
        if (!instance.hasImage(imageId)) {
          instance.addImage(imageId, img)
          instance.triggerRepaint()
        }
      }
      img.onerror = () => {} // missing tile: leave the color fill showing through
      img.src = TERRAIN_TILE_URLS[tile]
    }

    // icon-size tracks geography: a pointy-top hex is (2 * hexSize) world-px tall;
    // the source PNG is ~330px. Exponential-base-2 interpolation makes the icon
    // double each zoom level, matching MapLibre's geographic scaling.
    const hexSize = map.hexSize ?? 40
    const TILE_SRC_PX = 330
    const TILE_FUDGE = 1.08 // slight overscale so adjacent tiles cover seams
    const baseSize = ((2 * hexSize * scale * 512) / 360 / TILE_SRC_PX) * TILE_FUDGE
    // On-screen tile px at zoom z == (baseSize * TILE_SRC_PX) * 2^z. Hide the
    // layer once that drops below ~28px (fully zoomed out): the doodles turn to
    // noise at that size, so the biome color fill carries the read instead.
    const iconPxAtZ0 = baseSize * TILE_SRC_PX
    const tileMinZoom = Math.max(0, Math.log2(28 / iconPxAtZ0))

    // The tile doodles belong just above the color fill but BELOW the region
    // fill/outline/labels and the road/path lines — so labels and roads stay
    // legible on top. Insert before the lowest of those upper layers.
    const aboveTiles = [
      'regions-fill',
      'regions-outline',
      'paths-layer',
      'path-labels-layer',
      'region-labels-layer',
    ]
    const tileBeforeId = aboveTiles.find((id) => instance.getLayer(id))

    if (instance.getSource(tileSourceId)) {
      ;(instance.getSource(tileSourceId) as maplibregl.GeoJSONSource).setData(
        tileGeojson as GeoJSON.FeatureCollection,
      )
      // Keep it under the labels/roads even if those layers were (re)added later.
      if (tileBeforeId && instance.getLayer(tileLayerId)) {
        instance.moveLayer(tileLayerId, tileBeforeId)
      }
    } else {
      instance.addSource(tileSourceId, {
        type: 'geojson',
        data: tileGeojson as GeoJSON.FeatureCollection,
      })
      instance.addLayer(
        {
          id: tileLayerId,
          type: 'symbol',
          source: tileSourceId,
          minzoom: tileMinZoom,
          layout: {
            'icon-image': ['get', 'icon'],
            'icon-size': [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              0,
              baseSize,
              22,
              baseSize * Math.pow(2, 22),
            ],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-anchor': 'center',
          },
        },
        tileBeforeId,
      )
    }

    // No teardown cleanup — matches the region/path effects in this file. The
    // init effect's `mapInstance.remove()` destroys all sources/layers on unmount
    // or map switch. A cleanup here would call `instance.getLayer(...)` on an
    // already-removed map (whose internal `.style` is undefined), throwing
    // "Cannot read properties of undefined (reading 'getLayer')" when navigating
    // away. Re-runs while the same map persists are handled idempotently by the
    // getSource→setData branch above.
  }, [map.kind, map.hexCells, map.hexSize, mapReady, pxToLngLat, scale])

  // ── Phase-4 resource/worldgen overlay layers ──────────────────────────
  // Rivers + chokepoints, trade routes, resource badges, treasure markers.
  // Mirrors the hex/path effects: build GeoJSON via the pure mapLayers builders,
  // add the source/layer once, then update via setData on re-run; visibility is
  // driven by the `layers` prop. Hex-only (the data lives on hex cells/POIs).
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return
    if (map.kind !== 'hex') return

    const vis = (on: boolean): 'visible' | 'none' => (on ? 'visible' : 'none')
    const poiById = new Map(pois.map((p) => [p.id, p]))

    // Rivers sit just above the biome fill/tiles but below regions/roads/labels —
    // reuse the same before-id list the tile layer uses.
    const aboveTiles = [
      'regions-fill',
      'regions-outline',
      'paths-layer',
      'path-labels-layer',
      'region-labels-layer',
    ]
    const riverBeforeId = aboveTiles.find((id) => instance.getLayer(id))

    // --- Rivers (line, road-style) ---
    // Drawn as thin blue lines between adjacent river cells so they read as
    // flowing water WITHOUT painting over settlement/landmark tile doodles.
    const riverSourceId = 'rivers-source'
    const riverLayerId = 'rivers-line'
    const riverGeojson = buildRiverGeoJSON(map.hexCells ?? [], pxToLngLat)
    if (instance.getSource(riverSourceId)) {
      ;(instance.getSource(riverSourceId) as maplibregl.GeoJSONSource).setData(riverGeojson)
      if (riverBeforeId && instance.getLayer(riverLayerId)) instance.moveLayer(riverLayerId, riverBeforeId)
    } else {
      instance.addSource(riverSourceId, { type: 'geojson', data: riverGeojson })
      instance.addLayer(
        {
          id: riverLayerId,
          type: 'line',
          source: riverSourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          // Thicker + soft blur reads as a flowing waterway rather than a hairline.
          paint: { 'line-color': '#3b82f6', 'line-width': 8, 'line-opacity': 0.9, 'line-blur': 0.6 },
        },
        riverBeforeId,
      )
    }
    if (instance.getLayer(riverLayerId)) instance.setLayoutProperty(riverLayerId, 'visibility', vis(showRivers))

    // --- Chokepoints (circle, tagged by kind), shares the rivers toggle ---
    const chokeSourceId = 'chokepoints-source'
    const chokeLayerId = 'chokepoints-circle'
    const chokeGeojson = buildChokepointGeoJSON(map.hexCells ?? [], pxToLngLat)
    if (instance.getSource(chokeSourceId)) {
      ;(instance.getSource(chokeSourceId) as maplibregl.GeoJSONSource).setData(chokeGeojson)
    } else {
      instance.addSource(chokeSourceId, { type: 'geojson', data: chokeGeojson })
      instance.addLayer({
        id: chokeLayerId,
        type: 'circle',
        source: chokeSourceId,
        paint: {
          // ford = teal, bridge = amber, pass = slate; default blue.
          'circle-color': [
            'match',
            ['get', 'kind'],
            'ford', '#0d9488',
            'bridge', '#d97706',
            'pass', '#475569',
            '#2563eb',
          ],
          'circle-radius': 5,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      })
    }
    if (instance.getLayer(chokeLayerId)) instance.setLayoutProperty(chokeLayerId, 'visibility', vis(showRivers))

    // --- Trade routes (road-style muddy brown, lightly wavy) ---
    const tradeSourceId = 'trade-routes-source'
    const tradeLayerId = 'trade-routes-line'
    const tradeGeojson = buildTradeRouteGeoJSON(connections ?? [], poiById, pxToLngLat)
    if (instance.getSource(tradeSourceId)) {
      ;(instance.getSource(tradeSourceId) as maplibregl.GeoJSONSource).setData(tradeGeojson)
    } else {
      instance.addSource(tradeSourceId, { type: 'geojson', data: tradeGeojson })
      instance.addLayer({
        id: tradeLayerId,
        type: 'line',
        source: tradeSourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        // Same muddy-brown road styling, lightly wavy via the builder.
        paint: { 'line-color': '#6b5334', 'line-width': 6, 'line-dasharray': [2, 1], 'line-opacity': 0.9 },
      })
    }
    if (instance.getLayer(tradeLayerId)) instance.setLayoutProperty(tradeLayerId, 'visibility', vis(showTrade))

    // --- Resource badges (symbol: produced-good label near the POI) ---
    const resourceSourceId = 'resources-source'
    const resourceLayerId = 'resources-symbol'
    const resourceGeojson = buildResourceIconGeoJSON(pois, pxToLngLat)
    if (instance.getSource(resourceSourceId)) {
      ;(instance.getSource(resourceSourceId) as maplibregl.GeoJSONSource).setData(resourceGeojson)
    } else {
      instance.addSource(resourceSourceId, { type: 'geojson', data: resourceGeojson })
      // Text label = produced good (icon images would need per-good assets we
      // don't have yet); a small offset keeps it clear of the DOM marker.
      instance.addLayer({
        id: resourceLayerId,
        type: 'symbol',
        source: resourceSourceId,
        layout: {
          'text-field': ['get', 'produces'],
          'text-size': 10,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#a16207',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      })
    }
    if (instance.getLayer(resourceLayerId)) instance.setLayoutProperty(resourceLayerId, 'visibility', vis(showResources))

    // --- Treasure markers (gold coin icon on loot-bearing POIs) ---
    const treasureSourceId = 'treasure-source'
    const treasureLayerId = 'treasure-symbol'
    const treasureGeojson = buildTreasureGeoJSON(pois, pxToLngLat)
    if (instance.getSource(treasureSourceId)) {
      ;(instance.getSource(treasureSourceId) as maplibregl.GeoJSONSource).setData(treasureGeojson)
    } else {
      instance.addSource(treasureSourceId, { type: 'geojson', data: treasureGeojson })
      instance.addLayer({
        id: treasureLayerId,
        type: 'symbol',
        source: treasureSourceId,
        layout: {
          'text-field': '◆',
          'text-size': 16,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        // The map font renders emoji monochrome, so tint the glyph gold with a
        // dark halo — reads as a gold coin/gem rather than a black blob.
        paint: {
          'text-color': '#f5c518',
          'text-halo-color': '#5c4308',
          'text-halo-width': 1.5,
        },
      })
    }
    if (instance.getLayer(treasureLayerId)) instance.setLayoutProperty(treasureLayerId, 'visibility', vis(showTreasure))

    // No teardown — matches the other layer effects; the init effect's
    // mapInstance.remove() tears down all sources/layers on unmount/map switch.
  }, [
    map.kind,
    map.hexCells,
    pois,
    connections,
    mapReady,
    pxToLngLat,
    showRivers,
    showTrade,
    showResources,
    showTreasure,
  ])

  // Render draw-region preview polygon
  useEffect(() => {
    const instance = mapRef.current
    if (!instance || !mapReady) return

    const previewSourceId = 'draw-region-preview-source'
    const previewFillId = 'draw-region-preview-fill'
    const previewLineId = 'draw-region-preview-line'
    const previewPointsId = 'draw-region-preview-points'
    const pointsSourceId = 'draw-region-points-source'

    // Build preview polygon (or empty if < 1 vertex)
    const coords = drawingVertices.map((v) => pxToLngLat(v.x, v.y))

    const polyFeatures =
      coords.length >= 3
        ? [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: {
                type: 'Polygon' as const,
                coordinates: [[...coords, coords[0]]],
              },
            },
          ]
        : coords.length >= 2
          ? [
              {
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'LineString' as const,
                  coordinates: coords,
                },
              },
            ]
          : []

    const polyGeoJson = { type: 'FeatureCollection' as const, features: polyFeatures }

    const pointFeatures = coords.map((c, i) => ({
      type: 'Feature' as const,
      properties: { first: i === 0 },
      geometry: { type: 'Point' as const, coordinates: c },
    }))
    const pointGeoJson = { type: 'FeatureCollection' as const, features: pointFeatures }

    if (instance.getSource(previewSourceId)) {
      ;(instance.getSource(previewSourceId) as maplibregl.GeoJSONSource).setData(polyGeoJson as GeoJSON.FeatureCollection)
    } else {
      instance.addSource(previewSourceId, { type: 'geojson', data: polyGeoJson as GeoJSON.FeatureCollection })
      instance.addLayer({
        id: previewFillId,
        type: 'fill',
        source: previewSourceId,
        paint: { 'fill-color': '#8b5cf6', 'fill-opacity': 0.2 },
        filter: ['==', '$type', 'Polygon'],
      })
      instance.addLayer({
        id: previewLineId,
        type: 'line',
        source: previewSourceId,
        paint: { 'line-color': '#8b5cf6', 'line-width': 2, 'line-dasharray': [3, 2] },
      })
    }

    if (instance.getSource(pointsSourceId)) {
      ;(instance.getSource(pointsSourceId) as maplibregl.GeoJSONSource).setData(pointGeoJson as GeoJSON.FeatureCollection)
    } else {
      instance.addSource(pointsSourceId, { type: 'geojson', data: pointGeoJson as GeoJSON.FeatureCollection })
      instance.addLayer({
        id: previewPointsId,
        type: 'circle',
        source: pointsSourceId,
        paint: {
          'circle-radius': ['case', ['get', 'first'], 6, 4],
          'circle-color': ['case', ['get', 'first'], '#22c55e', '#8b5cf6'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })
    }

    const showPreview = mode === 'draw-region' && drawingVertices.length > 0
    if (instance.getLayer(previewFillId)) {
      instance.setLayoutProperty(previewFillId, 'visibility', showPreview ? 'visible' : 'none')
    }
    if (instance.getLayer(previewLineId)) {
      instance.setLayoutProperty(previewLineId, 'visibility', showPreview ? 'visible' : 'none')
    }
    if (instance.getLayer(previewPointsId)) {
      instance.setLayoutProperty(previewPointsId, 'visibility', showPreview ? 'visible' : 'none')
    }
  }, [drawingVertices, mapReady, mode, pxToLngLat])

  // Highlight selected or externally highlighted POI
  // Track whether we've already centered on the highlightPoiId (don't re-fly on every render)
  const hasCenteredOnHighlightRef = useRef<string | null>(null)
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement()
      if (id === activeHighlightId) {
        el.classList.add('ring-2', 'ring-primary', 'rounded-full')
      } else {
        el.classList.remove('ring-2', 'ring-primary', 'rounded-full')
      }
    })

    // Center map on highlighted POI on initial load
    const instance = mapRef.current
    if (instance && highlightPoiId && activeHighlightId === highlightPoiId && hasCenteredOnHighlightRef.current !== highlightPoiId) {
      const marker = markersRef.current.get(highlightPoiId)
      if (marker) {
        hasCenteredOnHighlightRef.current = highlightPoiId
        const lngLat = marker.getLngLat()
        instance.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(instance.getZoom(), 3), duration: 600 })
      }
    }
  }, [activeHighlightId, highlightPoiId, mapReady, pois])

  const handleResetView = () => {
    fitToImageRef.current?.(300)
  }

  // Fullscreen is toggled from the toolbar (lifted to InteractiveMap); here we
  // only need to resize the map canvas whenever the fullscreen state changes.
  useEffect(() => {
    const handler = () => {
      const instance = mapRef.current
      if (instance) setTimeout(() => instance.resize(), 50)
    }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  return (
    <div className="relative w-full h-full min-h-[200px]">
      <div ref={containerRef} className="w-full h-full" />
      {showResetControl && (
        <Button
          size="icon"
          variant="secondary"
          className="absolute right-2 top-20 size-8 z-10 shadow-md"
          onClick={handleResetView}
          title="Reset map view"
          aria-label="Reset map view"
        >
          <RotateCcw className="size-4" />
        </Button>
      )}
    </div>
  )
}
