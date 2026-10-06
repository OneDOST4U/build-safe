import { useCallback, useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import distance from '@turf/distance'
import { point } from '@turf/turf'
import { fitMapToLasam, getLasamCenter } from '@/lib/map/lasamView'
import { createMap, createMapFallback, bindMapResize, prepareBasemap } from '@/lib/map/createMap'
import { hideBasemapBuildings, applyBuildingExtrusionPaint, raiseBuildingLayers, BUILDING_COLOR, BUILDING_SELECTED, BUILDING_LIGHT } from '@/lib/map/buildingLayers'
import { LAYER_ID_MAP, resolveMapLibreLayerVisibility } from '@/lib/map/layerVisibility'
import { createEarthquakeRings } from '@/lib/map/visuals'
import {
  CAGUA_CENTER,
  createVolcanoPointFeature,
} from '@/lib/simulation/volcano'
import { buildTerrainSample } from '@/lib/terrain/elevation'
import { getBuildingColor } from '@/lib/simulation/stats'
import { MGB_FLOOD_COLORS } from '@/lib/simulation/mgbFlood'
import {
  buildClassColorMatch,
  EROSION_COLORS,
  LAND_USE_COLORS,
  LGU_FLOOD_COLORS,
  LIQUEFACTION_COLORS,
  NPAAAD_COLORS,
  SAFDZ_COLORS,
  LGU_HAZARD_OPACITY,
} from '@/lib/simulation/lguHazards'
import { FAULT_LAYER_IDS } from '@/lib/simulation/faultLegend'
import { MapLegend } from '@/components/map/MapLegend'
import { TerrainInfoBar } from '@/components/map/TerrainInfoBar'
import type {
  BuildingCollection,
  ElevationGrid,
  HazardMode,
  MapTool,
  RiverSettings,
  TerrainSample,
  TerrainSettings,
} from '@/types'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { SelectedRiver } from '@/components/layout/RiverInfoCard'

interface MapViewProps {
  buildings: BuildingCollection
  boundary: FeatureCollection
  riversMain: FeatureCollection
  riversTributaries: FeatureCollection
  drainage: FeatureCollection
  riverbanks: FeatureCollection
  watersheds: FeatureCollection
  flowArrows: FeatureCollection
  contours: FeatureCollection
  elevationGrid: ElevationGrid | null
  mgbFlood: FeatureCollection | null
  liquefaction: FeatureCollection | null
  erosion: FeatureCollection | null
  lguFlood: FeatureCollection | null
  landUse: FeatureCollection | null
  npaaad?: FeatureCollection | null
  safdz?: FeatureCollection | null
  faultLines: FeatureCollection | null
  epicenter: [number, number] | null
  earthquakeRadius: number
  earthquakeMagnitude: number
  hazardMode: HazardMode
  activeTool: MapTool
  is3D: boolean
  floodOpacity: number
  selectedBuildingId: string | null
  siteCoords: [number, number] | null
  /** When true, confirm fly-to runs for a committed site pin (not while dragging/picking). */
  flyToSite?: boolean
  layerVisibility: Record<string, boolean>
  terrainSettings: TerrainSettings
  riverSettings: RiverSettings
  onBuildingSelect: (buildingId: string | null) => void
  onRiverSelect: (river: SelectedRiver | null) => void
  onEpicenterPlace: (coords: [number, number]) => void
  onSitePlace: (coords: [number, number]) => void
  onFaultLineDrawn: (line: Feature<LineString>) => void
  onMeasureUpdate: (value: string | null) => void
  onMapReady?: () => void
}

export function MapView({
  buildings,
  boundary,
  riversMain,
  riversTributaries,
  drainage,
  riverbanks,
  watersheds,
  flowArrows,
  contours,
  elevationGrid,
  mgbFlood,
  liquefaction,
  erosion,
  lguFlood,
  landUse,
  npaaad,
  safdz,
  faultLines,
  epicenter,
  earthquakeRadius,
  earthquakeMagnitude: _earthquakeMagnitude,
  hazardMode,
  activeTool,
  is3D,
  floodOpacity,
  selectedBuildingId,
  siteCoords,
  flyToSite = false,
  layerVisibility,
  terrainSettings,
  riverSettings,
  onBuildingSelect,
  onRiverSelect,
  onEpicenterPlace,
  onSitePlace,
  onFaultLineDrawn,
  onMeasureUpdate,
  onMapReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const siteMarkerRef = useRef<maplibregl.Marker | null>(null)
  const drawPointsRef = useRef<[number, number][]>([])
  const isDrawingRef = useRef(false)
  const measurePointsRef = useRef<[number, number][]>([])
  const activeToolRef = useRef(activeTool)
  const onBuildingSelectRef = useRef(onBuildingSelect)
  const onRiverSelectRef = useRef(onRiverSelect)
  const elevationGridRef = useRef(elevationGrid)
  const terrainSettingsRef = useRef(terrainSettings)
  const onMapReadyRef = useRef(onMapReady)

  useEffect(() => {
    activeToolRef.current = activeTool
    onBuildingSelectRef.current = onBuildingSelect
    onRiverSelectRef.current = onRiverSelect
    elevationGridRef.current = elevationGrid
    terrainSettingsRef.current = terrainSettings
    onMapReadyRef.current = onMapReady
  }, [activeTool, onBuildingSelect, onRiverSelect, elevationGrid, terrainSettings, onMapReady])

  const [toolHint, setToolHint] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [terrainSample, setTerrainSample] = useState<TerrainSample | null>(null)

  const applyLayerVisibility = useCallback((map: Map) => {
    for (const layerIds of Object.values(LAYER_ID_MAP)) {
      for (const layerId of layerIds) {
        if (!map.getLayer(layerId)) continue
        map.setLayoutProperty(
          layerId,
          'visibility',
          resolveMapLibreLayerVisibility(
            layerId,
            layerVisibility,
            terrainSettings,
            riverSettings,
            is3D,
          ),
        )
      }
    }

    const sitePinVisible =
      (layerVisibility.site ?? true) || activeToolRef.current === 'place-site'
    const markerEl = siteMarkerRef.current?.getElement()
    if (markerEl) {
      markerEl.style.display = sitePinVisible ? '' : 'none'
    }

    raiseBuildingLayers(map)
  }, [layerVisibility, terrainSettings, riverSettings, is3D])

  const addBuildingLayers = useCallback((map: Map) => {
    map.addSource('buildings', { type: 'geojson', data: buildings })

    // Flat fill drapes on terrain and reads as dark “shadows” under 3D boxes — keep hidden
    // whenever extrusions are shown. Useful only as a 2D fallback when 3D is off.
    map.addLayer({
      id: 'buildings-footprint',
      type: 'fill',
      source: 'buildings',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'selected'], 1],
          BUILDING_SELECTED,
          BUILDING_COLOR,
        ],
        'fill-opacity': 0.55,
      },
    })
    map.addLayer({
      id: 'buildings-3d',
      type: 'fill-extrusion',
      source: 'buildings',
      filter: ['!=', ['get', 'selected'], 1],
      layout: {
        visibility: is3D || terrainSettings.terrain3d ? 'visible' : 'none',
      },
      paint: {
        'fill-extrusion-color': [
          'case',
          ['==', ['get', 'selected'], 1],
          BUILDING_SELECTED,
          ['coalesce', ['get', 'color'], BUILDING_COLOR],
        ],
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': true,
      },
    })
    map.addLayer({
      id: 'buildings-3d-selected',
      type: 'fill-extrusion',
      source: 'buildings',
      filter: ['==', ['get', 'selected'], 1],
      layout: {
        visibility: is3D || terrainSettings.terrain3d ? 'visible' : 'none',
      },
      paint: {
        'fill-extrusion-color': BUILDING_SELECTED,
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': false,
      },
    })
    applyBuildingExtrusionPaint(map, terrainSettings.terrain3d)
    raiseBuildingLayers(map)
    map.addLayer({
      id: 'buildings-outline',
      type: 'line',
      source: 'buildings',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#6b7280',
        'line-width': 0.5,
        'line-opacity': 0.5,
      },
    })
  }, [buildings, is3D, terrainSettings.terrain3d])

  const updateBuildingColors = useCallback(() => {
    const map = mapRef.current
    if (!map?.getSource('buildings')) return

    const colored = {
      ...buildings,
      features: buildings.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          baseColor: BUILDING_COLOR,
          color: getBuildingColor(
            f.properties.floodExposure,
            f.properties.earthquakeDamage,
            f.properties.faultDistance,
            hazardMode,
            BUILDING_COLOR,
            f.properties.type,
            f.properties.volcanoExposure,
          ),
          selected: f.properties.id === selectedBuildingId ? 1 : 0,
        },
      })),
    }

    ;(map.getSource('buildings') as maplibregl.GeoJSONSource).setData(colored as GeoJSON.FeatureCollection)
    applyBuildingExtrusionPaint(map, terrainSettings.terrain3d)
  }, [buildings, selectedBuildingId, terrainSettings.terrain3d, hazardMode])

  const flyToBuilding = useCallback((buildingId: string) => {
    const map = mapRef.current
    const feature = buildings.features.find((f) => f.properties.id === buildingId)
    if (!map || !feature) return

    const coords = feature.geometry.coordinates[0]
    const lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length
    const lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length

    map.flyTo({ center: [lng, lat], zoom: 17, pitch: is3D ? 55 : 0, duration: 900 })
  }, [buildings, is3D])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let unbindResize: (() => void) | undefined
    let cancelled = false

    async function initMap() {
      if (!containerRef.current) return

      const municipalCenter = getLasamCenter(boundary)

      try {
        let map = createMap({
          container: containerRef.current,
          center: municipalCenter,
          zoom: 11,
          pitch: 52,
          bearing: -20,
        })

        if (cancelled) {
          map.remove()
          return
        }

        try {
          await new Promise<void>((resolve, reject) => {
            map.once('load', () => resolve())
            map.once('error', (e) => reject(new Error(e.error?.message ?? 'Map failed to load')))
          })
        } catch {
          map.remove()
          map = createMapFallback({
            container: containerRef.current,
            center: municipalCenter,
            zoom: 11,
            pitch: 52,
            bearing: -20,
          })
          await new Promise<void>((resolve, reject) => {
            map.once('load', () => resolve())
            map.once('error', (e) => reject(new Error(e.error?.message ?? 'Map failed to load')))
          })
        }

        if (cancelled) {
          map.remove()
          return
        }

        hideBasemapBuildings(map)
        prepareBasemap(map)
        map.setLight(BUILDING_LIGHT)
        unbindResize = bindMapResize(map, containerRef.current)
        map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
        map.addControl(new maplibregl.ScaleControl(), 'bottom-left')

        // Terrain DEM (AWS Terrarium)
        try {
          map.addSource('lasam-dem', {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 15,
          })
          map.addLayer({
            id: 'hillshade',
            type: 'hillshade',
            source: 'lasam-dem',
            paint: {
              'hillshade-exaggeration': 0.3,
              'hillshade-shadow-color': '#94a3b8',
              'hillshade-highlight-color': '#f8fafc',
            },
            layout: { visibility: terrainSettings.hillshade ? 'visible' : 'none' },
          })

          // Do not drape the entire map over a remote DEM until at least one
          // elevation tile is ready. A blocked/slow DEM otherwise leaves the
          // basemap and GeoJSON layers looking like a blank canvas.
          const enableTerrainWhenReady = () => {
            if (!map.isSourceLoaded('lasam-dem')) return
            map.off('sourcedata', enableTerrainWhenReady)
            const current = terrainSettingsRef.current
            // MapLibre groups draped layers when terrain is enabled. With an
            // opaque raster basemap that can place GeoJSON fills/lines (flood,
            // boundary, rivers) underneath the raster tiles. Keep the reliable
            // production raster style flat so every planning overlay remains
            // visible; 3D building extrusions and camera pitch still work.
            const hasRasterBasemap = Boolean(
              map.getSource('osm') || map.getSource('basemap-raster-underlay'),
            )
            if (current.terrain3d && !hasRasterBasemap) {
              map.setTerrain({ source: 'lasam-dem', exaggeration: current.exaggeration })
            }
          }
          map.on('sourcedata', enableTerrainWhenReady)
          enableTerrainWhenReady()
        } catch {
          // Terrain optional if style/source fails
        }

        map.addSource('boundary', { type: 'geojson', data: boundary })
        map.addLayer({
          id: 'boundary-fill',
          type: 'fill',
          source: 'boundary',
          paint: { 'fill-color': '#0ea5e9', 'fill-opacity': 0.06 },
        })
        map.addLayer({
          id: 'boundary-line',
          type: 'line',
          source: 'boundary',
          paint: {
            'line-color': '#0369a1',
            'line-width': 2.5,
            'line-opacity': 0.85,
            'line-dasharray': [4, 2],
          },
        })

        map.addSource('watersheds', { type: 'geojson', data: watersheds })
        map.addLayer({
          id: 'watershed-fill',
          type: 'fill',
          source: 'watersheds',
          paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.04 },
          layout: { visibility: riverSettings.watershed ? 'visible' : 'none' },
        })
        map.addLayer({
          id: 'watershed-line',
          type: 'line',
          source: 'watersheds',
          paint: { 'line-color': '#0284c7', 'line-width': 1.5, 'line-dasharray': [3, 2] },
          layout: { visibility: riverSettings.watershed ? 'visible' : 'none' },
        })

        map.addSource('riverbanks', { type: 'geojson', data: riverbanks })
        map.addLayer({
          id: 'riverbanks-fill',
          type: 'fill',
          source: 'riverbanks',
          paint: { 'fill-color': '#7dd3fc', 'fill-opacity': 0.25 },
          layout: { visibility: riverSettings.riverbanks ? 'visible' : 'none' },
        })
        map.addLayer({
          id: 'riverbanks-line',
          type: 'line',
          source: 'riverbanks',
          paint: { 'line-color': '#0369a1', 'line-width': 1 },
          layout: { visibility: riverSettings.riverbanks ? 'visible' : 'none' },
        })

        map.addSource('rivers-main', { type: 'geojson', data: riversMain })
        map.addLayer({
          id: 'rivers-main',
          type: 'line',
          source: 'rivers-main',
          paint: { 'line-color': '#0369a1', 'line-width': 4, 'line-opacity': 0.9 },
          layout: { visibility: riverSettings.main ? 'visible' : 'none' },
        })

        map.addSource('rivers-tributaries', { type: 'geojson', data: riversTributaries })
        map.addLayer({
          id: 'rivers-tributaries',
          type: 'line',
          source: 'rivers-tributaries',
          paint: { 'line-color': '#0ea5e9', 'line-width': 2.2, 'line-opacity': 0.85 },
          layout: { visibility: riverSettings.tributaries ? 'visible' : 'none' },
        })

        map.addSource('drainage', { type: 'geojson', data: drainage })
        map.addLayer({
          id: 'drainage',
          type: 'line',
          source: 'drainage',
          paint: { 'line-color': '#38bdf8', 'line-width': 1.4, 'line-dasharray': [2, 1] },
          layout: { visibility: riverSettings.drainage ? 'visible' : 'none' },
        })

        map.addSource('flow-arrows', { type: 'geojson', data: flowArrows })
        map.addLayer({
          id: 'flow-arrows',
          type: 'line',
          source: 'flow-arrows',
          paint: { 'line-color': '#1d4ed8', 'line-width': 1.2 },
          layout: { visibility: riverSettings.flowArrows ? 'visible' : 'none' },
        })

        map.addSource('contours', { type: 'geojson', data: contours })
        map.addLayer({
          id: 'contours',
          type: 'line',
          source: 'contours',
          paint: { 'line-color': '#a16207', 'line-width': 0.6, 'line-opacity': 0.55 },
          layout: { visibility: terrainSettings.contours ? 'visible' : 'none' },
        })

        const initialFlood = mgbFlood ?? { type: 'FeatureCollection', features: [] }
        map.addSource('flood-zone', { type: 'geojson', data: initialFlood })
        map.addLayer({
          id: 'flood-zone-fill',
          type: 'fill',
          source: 'flood-zone',
          paint: {
            'fill-color': [
              'match',
              ['get', 'susceptibility'],
              'low',
              MGB_FLOOD_COLORS.low,
              'moderate',
              MGB_FLOOD_COLORS.moderate,
              'high',
              MGB_FLOOD_COLORS.high,
              'very_high',
              MGB_FLOOD_COLORS.very_high,
              '#94a3b8',
            ],
            'fill-opacity': floodOpacity,
            'fill-outline-color': '#0f172a',
          },
        })

        const initialLiquefaction = liquefaction ?? { type: 'FeatureCollection', features: [] }
        map.addSource('liquefaction-zone', { type: 'geojson', data: initialLiquefaction })
        map.addLayer({
          id: 'liquefaction-fill',
          type: 'fill',
          source: 'liquefaction-zone',
          paint: {
            'fill-color': [
              'match',
              ['get', 'susceptibility'],
              'low',
              LIQUEFACTION_COLORS.low,
              'moderate',
              LIQUEFACTION_COLORS.moderate,
              'high',
              LIQUEFACTION_COLORS.high,
              LIQUEFACTION_COLORS.unknown,
            ],
            'fill-opacity': LGU_HAZARD_OPACITY,
            'fill-outline-color': '#78350f',
          },
          layout: { visibility: 'none' },
        })

        const initialErosion = erosion ?? { type: 'FeatureCollection', features: [] }
        map.addSource('erosion-zone', { type: 'geojson', data: initialErosion })
        map.addLayer({
          id: 'erosion-fill',
          type: 'fill',
          source: 'erosion-zone',
          paint: {
            'fill-color': [
              'match',
              ['get', 'erosion_class'],
              'none',
              EROSION_COLORS.none,
              'slight',
              EROSION_COLORS.slight,
              'moderate',
              EROSION_COLORS.moderate,
              'severe',
              EROSION_COLORS.severe,
              EROSION_COLORS.unknown,
            ],
            'fill-opacity': LGU_HAZARD_OPACITY,
            'fill-outline-color': '#365314',
          },
          layout: { visibility: 'none' },
        })

        const initialLguFlood = lguFlood ?? { type: 'FeatureCollection', features: [] }
        map.addSource('lgu-flood-zone', { type: 'geojson', data: initialLguFlood })
        map.addLayer({
          id: 'lgu-flood-fill',
          type: 'fill',
          source: 'lgu-flood-zone',
          paint: {
            'fill-color': buildClassColorMatch(
              'susceptibility',
              LGU_FLOOD_COLORS,
              LGU_FLOOD_COLORS.unknown,
            ),
            'fill-opacity': LGU_HAZARD_OPACITY,
            'fill-outline-color': '#1e3a8a',
          },
          layout: { visibility: 'none' },
        })

        const initialLandUse = landUse ?? { type: 'FeatureCollection', features: [] }
        map.addSource('land-use-zone', { type: 'geojson', data: initialLandUse })
        map.addLayer({
          id: 'land-use-fill',
          type: 'fill',
          source: 'land-use-zone',
          paint: {
            'fill-color': buildClassColorMatch(
              'land_use_class',
              LAND_USE_COLORS,
              LAND_USE_COLORS.unknown,
            ),
            'fill-opacity': LGU_HAZARD_OPACITY,
            'fill-outline-color': '#334155',
          },
          layout: { visibility: 'none' },
        })

        const initialNpaaad = npaaad ?? { type: 'FeatureCollection', features: [] }
        map.addSource('npaaad-zone', { type: 'geojson', data: initialNpaaad })
        map.addLayer({
          id: 'npaaad-fill',
          type: 'fill',
          source: 'npaaad-zone',
          paint: {
            'fill-color': buildClassColorMatch(
              'code',
              NPAAAD_COLORS,
              NPAAAD_COLORS.Others,
            ),
            'fill-opacity': LGU_HAZARD_OPACITY,
            'fill-outline-color': '#047857',
          },
          layout: { visibility: 'none' },
        })
        map.addLayer({
          id: 'npaaad-line',
          type: 'line',
          source: 'npaaad-zone',
          paint: {
            'line-color': '#047857',
            'line-width': 1,
            'line-opacity': 0.6,
          },
          layout: { visibility: 'none' },
        })

        const initialSafdz = safdz ?? { type: 'FeatureCollection', features: [] }
        map.addSource('safdz-zone', { type: 'geojson', data: initialSafdz })
        map.addLayer({
          id: 'safdz-fill',
          type: 'fill',
          source: 'safdz-zone',
          paint: {
            'fill-color': buildClassColorMatch(
              'code',
              SAFDZ_COLORS,
              SAFDZ_COLORS.Others,
            ),
            'fill-opacity': LGU_HAZARD_OPACITY,
            'fill-outline-color': '#4d7c0f',
          },
          layout: { visibility: 'none' },
        })
        map.addLayer({
          id: 'safdz-line',
          type: 'line',
          source: 'safdz-zone',
          paint: {
            'line-color': '#4d7c0f',
            'line-width': 1,
            'line-opacity': 0.6,
          },
          layout: { visibility: 'none' },
        })

        addBuildingLayers(map)

        const initialFault = faultLines ?? { type: 'FeatureCollection', features: [] }
        map.addSource('fault-line', { type: 'geojson', data: initialFault })

        const faultLayerDefs: {
          id: (typeof FAULT_LAYER_IDS)[number]
          filter: maplibregl.FilterSpecification
          color: string
          width: number
          dasharray?: number[]
        }[] = [
          {
            id: 'fault-line-active-certain',
            filter: [
              'any',
              ['==', ['get', 'legend_key'], 'active-certain'],
              [
                'all',
                ['!', ['has', 'legend_key']],
                ['any', ['==', ['get', 'fault_class'], 'Active'], ['!', ['has', 'fault_class']]],
              ],
            ],
            color: '#dc2626',
            width: 3,
          },
          {
            id: 'fault-line-active-approximate',
            filter: ['==', ['get', 'legend_key'], 'active-approximate'],
            color: '#dc2626',
            width: 2.5,
            dasharray: [2, 1.5],
          },
          {
            id: 'fault-line-active-concealed',
            filter: ['==', ['get', 'legend_key'], 'active-concealed'],
            color: '#dc2626',
            width: 2.5,
            dasharray: [0.5, 1.5],
          },
          {
            id: 'fault-line-active-fissures',
            filter: ['==', ['get', 'legend_key'], 'active-fissures'],
            color: '#ca8a04',
            width: 3,
          },
          {
            id: 'fault-line-potential-certain',
            filter: [
              'any',
              ['==', ['get', 'legend_key'], 'potential-certain'],
              [
                'all',
                ['!', ['has', 'legend_key']],
                ['==', ['get', 'fault_class'], 'Potentially Active'],
              ],
            ],
            color: '#171717',
            width: 2.5,
          },
          {
            id: 'fault-line-potential-approximate',
            filter: ['==', ['get', 'legend_key'], 'potential-approximate'],
            color: '#171717',
            width: 2.5,
            dasharray: [2, 1.5],
          },
        ]

        for (const def of faultLayerDefs) {
          map.addLayer({
            id: def.id,
            type: 'line',
            source: 'fault-line',
            filter: def.filter,
            paint: {
              'line-color': def.color,
              'line-width': def.width,
              ...(def.dasharray ? { 'line-dasharray': def.dasharray } : {}),
            },
          })
        }

        const showFaultPopup = (e: MapLayerMouseEvent) => {
          if (activeToolRef.current !== 'select') return
          const feature = e.features?.[0]
          if (!feature?.properties) return
          const p = feature.properties
          const title = String(p.fault_name ?? p.name ?? 'Fault segment')
          const category = String(p.category_label ?? p.fault_class ?? '—')
          const trace = String(p.trace_type ?? '—')
          const segment = p.segname != null ? String(p.segname) : '—'
          new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font:12px/1.4 system-ui,sans-serif;color:#0f172a">
                <strong style="display:block;margin-bottom:4px">${title}</strong>
                <div><span style="color:#64748b">Category:</span> ${category}</div>
                <div><span style="color:#64748b">Trace type:</span> ${trace}</div>
                <div><span style="color:#64748b">Segment:</span> ${segment}</div>
                <div style="margin-top:6px;font-size:10px;color:#94a3b8">Source: PHIVOLCS / GeoRisk ULAP (demo)</div>
              </div>`,
            )
            .addTo(map)
        }

        for (const layerId of FAULT_LAYER_IDS) {
          map.on('click', layerId, showFaultPopup)
          map.on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = ''
          })
        }

        const showAgriPopup = (titlePrefix: string) => (e: MapLayerMouseEvent) => {
          if (activeToolRef.current !== 'select') return
          const feature = e.features?.[0]
          if (!feature?.properties) return
          const p = feature.properties
          const code = String(p.code ?? '')
          const label = String(p.label ?? p.description ?? code)
          const desc = String(p.description ?? '')
          new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font:12px/1.4 system-ui,sans-serif;color:#0f172a">
                <strong style="display:block;margin-bottom:4px;color:#047857">${titlePrefix}: ${code}</strong>
                <div style="font-weight:600;margin-bottom:4px">${label}</div>
                ${desc && desc !== label ? `<div style="color:#64748b;font-size:11px">${desc}</div>` : ''}
                <div style="margin-top:6px;font-size:10px;color:#94a3b8">Source: DA-BSWM (${p.year ?? '2022'})</div>
              </div>`,
            )
            .addTo(map)
        }

        map.on('click', 'npaaad-fill', showAgriPopup('NPAAAD Protection'))
        map.on('mouseenter', 'npaaad-fill', () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'npaaad-fill', () => {
          map.getCanvas().style.cursor = ''
        })

        map.on('click', 'safdz-fill', showAgriPopup('SAFDZ Zone'))
        map.on('mouseenter', 'safdz-fill', () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'safdz-fill', () => {
          map.getCanvas().style.cursor = ''
        })

      map.addSource('epicenter', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'epicenter-rings', type: 'fill', source: 'epicenter', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#ef4444', 'fill-opacity': ['coalesce', ['get', 'opacity'], 0.12] } })
      map.addLayer({ id: 'epicenter-point', type: 'circle', source: 'epicenter', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 9, 'circle-color': '#dc2626', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })

      map.addSource('volcano', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [createVolcanoPointFeature()],
        },
      })
      map.addLayer({
        id: 'volcano-point',
        type: 'circle',
        source: 'volcano',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 10,
          'circle-color': '#b45309',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      map.addSource('site-assessment', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addSource('measure', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'measure-line', type: 'line', source: 'measure', paint: { 'line-color': '#7c3aed', 'line-width': 2, 'line-dasharray': [2, 2] } })
      map.addLayer({ id: 'measure-points', type: 'circle', source: 'measure', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#7c3aed', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } })

      map.addSource('draw-fault', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'draw-fault-line', type: 'line', source: 'draw-fault', paint: { 'line-color': '#b91c1c', 'line-width': 3, 'line-dasharray': [2, 1] } })

      map.on('click', 'buildings-3d', (e: MapLayerMouseEvent) => {
        if (activeToolRef.current !== 'select') return
        const feature = e.features?.[0]
        if (feature?.properties?.id) {
          onBuildingSelectRef.current(feature.properties.id as string)
        }
      })

      const selectRiver = (e: MapLayerMouseEvent) => {
        if (activeToolRef.current !== 'select') return
        const feature = e.features?.[0]
        if (!feature?.properties) return
        const coords = (feature.geometry as LineString).coordinates?.[0]
        let bankElevationM: number | null = null
        const grid = elevationGridRef.current
        if (grid && coords) {
          bankElevationM = buildTerrainSample(grid, coords[0], coords[1]).elevation
        }
        onRiverSelectRef.current({
          id: String(feature.properties.id ?? ''),
          name: String(feature.properties.name ?? feature.properties.waterway ?? 'Waterway'),
          waterway: String(feature.properties.waterway ?? 'stream'),
          className: String(feature.properties.class ?? 'tributary'),
          lengthKm: feature.properties.length_km as number | undefined,
          bankElevationM,
        })
      }
      map.on('click', 'rivers-main', selectRiver)
      map.on('click', 'rivers-tributaries', selectRiver)

        if (cancelled) {
          map.remove()
          return
        }

        fitMapToLasam(map, boundary, { duration: 0 })

        applyLayerVisibility(map)
        mapRef.current = map
        setMapError(null)
        onMapReadyRef.current?.()
      } catch (error) {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : 'Failed to initialize map')
        }
      }
    }

    initMap()

    return () => {
      cancelled = true
      unbindResize?.()
      siteMarkerRef.current?.remove()
      siteMarkerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
    // Map must init once; data updates use setData in separate effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    updateBuildingColors()
  }, [updateBuildingColors])

  // Sync 3D building paint when mode/terrain changes; visibility handled by applyLayerVisibility.
  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('buildings-3d')) return
    applyBuildingExtrusionPaint(map, terrainSettings.terrain3d)
    map.setLight(BUILDING_LIGHT)
    applyLayerVisibility(map)
  }, [is3D, terrainSettings.terrain3d, applyLayerVisibility])

  useEffect(() => {
    if (selectedBuildingId) flyToBuilding(selectedBuildingId)
  }, [selectedBuildingId, flyToBuilding])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const floodData = mgbFlood ?? { type: 'FeatureCollection', features: [] }

    ;(map.getSource('flood-zone') as maplibregl.GeoJSONSource)?.setData(
      floodData as GeoJSON.FeatureCollection,
    )

    if (map.getLayer('flood-zone-fill')) {
      map.setPaintProperty('flood-zone-fill', 'fill-opacity', floodOpacity)
    }
  }, [mgbFlood, floodOpacity])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const liquefactionData = liquefaction ?? { type: 'FeatureCollection', features: [] }
    ;(map.getSource('liquefaction-zone') as maplibregl.GeoJSONSource)?.setData(
      liquefactionData as GeoJSON.FeatureCollection,
    )
  }, [liquefaction])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const erosionData = erosion ?? { type: 'FeatureCollection', features: [] }
    ;(map.getSource('erosion-zone') as maplibregl.GeoJSONSource)?.setData(
      erosionData as GeoJSON.FeatureCollection,
    )
  }, [erosion])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const lguFloodData = lguFlood ?? { type: 'FeatureCollection', features: [] }
    ;(map.getSource('lgu-flood-zone') as maplibregl.GeoJSONSource)?.setData(
      lguFloodData as GeoJSON.FeatureCollection,
    )
  }, [lguFlood])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const landUseData = landUse ?? { type: 'FeatureCollection', features: [] }
    ;(map.getSource('land-use-zone') as maplibregl.GeoJSONSource)?.setData(
      landUseData as GeoJSON.FeatureCollection,
    )
  }, [landUse])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const npaaadData = npaaad ?? { type: 'FeatureCollection', features: [] }
    ;(map.getSource('npaaad-zone') as maplibregl.GeoJSONSource)?.setData(
      npaaadData as GeoJSON.FeatureCollection,
    )
  }, [npaaad])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const safdzData = safdz ?? { type: 'FeatureCollection', features: [] }
    ;(map.getSource('safdz-zone') as maplibregl.GeoJSONSource)?.setData(
      safdzData as GeoJSON.FeatureCollection,
    )
  }, [safdz])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    ;(map.getSource('rivers-main') as maplibregl.GeoJSONSource | undefined)?.setData(riversMain)
    ;(map.getSource('rivers-tributaries') as maplibregl.GeoJSONSource | undefined)?.setData(
      riversTributaries,
    )
    ;(map.getSource('drainage') as maplibregl.GeoJSONSource | undefined)?.setData(drainage)
    ;(map.getSource('riverbanks') as maplibregl.GeoJSONSource | undefined)?.setData(riverbanks)
    ;(map.getSource('watersheds') as maplibregl.GeoJSONSource | undefined)?.setData(watersheds)
    ;(map.getSource('flow-arrows') as maplibregl.GeoJSONSource | undefined)?.setData(flowArrows)
    ;(map.getSource('contours') as maplibregl.GeoJSONSource | undefined)?.setData(contours)
  }, [riversMain, riversTributaries, drainage, riverbanks, watersheds, flowArrows, contours])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getSource('lasam-dem')) return
    const hasRasterBasemap = Boolean(
      map.getSource('osm') || map.getSource('basemap-raster-underlay'),
    )
    if (
      terrainSettings.terrain3d &&
      !hasRasterBasemap &&
      map.isSourceLoaded('lasam-dem')
    ) {
      map.setTerrain({ source: 'lasam-dem', exaggeration: terrainSettings.exaggeration })
    } else {
      map.setTerrain(null)
    }
    map.setLight(BUILDING_LIGHT)
    applyBuildingExtrusionPaint(map, terrainSettings.terrain3d)
    applyLayerVisibility(map)
  }, [terrainSettings, applyLayerVisibility])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    applyLayerVisibility(map)
  }, [applyLayerVisibility])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !elevationGrid) return

    const onMove = (e: MapMouseEvent) => {
      const sample = buildTerrainSample(elevationGrid, e.lngLat.lng, e.lngLat.lat)
      setTerrainSample(sample)
    }
    map.on('mousemove', onMove)
    return () => {
      map.off('mousemove', onMove)
    }
  }, [elevationGrid])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const faultData = faultLines ?? { type: 'FeatureCollection', features: [] }
    ;(map.getSource('fault-line') as maplibregl.GeoJSONSource)?.setData(
      faultData as GeoJSON.FeatureCollection,
    )
  }, [faultLines])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    if (epicenter) {
      const rings = createEarthquakeRings(epicenter, earthquakeRadius)
      ;(map.getSource('epicenter') as maplibregl.GeoJSONSource)?.setData({
        type: 'FeatureCollection',
        features: [
          ...rings,
          { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: epicenter } },
        ],
      })
    } else {
      ;(map.getSource('epicenter') as maplibregl.GeoJSONSource)?.setData({
        type: 'FeatureCollection',
        features: [],
      })
    }
  }, [epicenter, earthquakeRadius])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const syncSitePin = () => {
      if (!siteCoords) {
        siteMarkerRef.current?.remove()
        siteMarkerRef.current = null
        ;(map.getSource('site-assessment') as maplibregl.GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: [],
        })
        return
      }

      ;(map.getSource('site-assessment') as maplibregl.GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { id: 'proposed-site' },
            geometry: { type: 'Point', coordinates: siteCoords },
          },
        ],
      })

      if (!siteMarkerRef.current) {
        const el = document.createElement('div')
        el.className = 'site-pin-marker'
        el.style.cssText =
          'width:36px;height:48px;cursor:pointer;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;z-index:6;'
        el.innerHTML =
          '<img src="/markers/site-pin.svg" alt="" width="36" height="48" draggable="false" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));" />'
        siteMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, 2] })
          .setLngLat(siteCoords)
          .addTo(map)
      } else {
        siteMarkerRef.current.setLngLat(siteCoords)
      }

      const sitePinVisible =
        (layerVisibility.site ?? true) || activeTool === 'place-site'
      siteMarkerRef.current.getElement().style.display = sitePinVisible ? '' : 'none'

      if (flyToSite) {
        map.flyTo({
          center: siteCoords,
          zoom: Math.max(map.getZoom(), 16),
          pitch: is3D ? 55 : 0,
          duration: 900,
        })
      }
    }

    if (map.isStyleLoaded()) {
      syncSitePin()
    } else {
      map.once('load', syncSitePin)
    }

    return () => {
      map.off('load', syncSitePin)
    }
  }, [siteCoords, flyToSite, is3D, layerVisibility.site, activeTool])

  useEffect(() => {
    const map = mapRef.current
    if (!map || hazardMode !== 'volcano') return
    map.flyTo({ center: CAGUA_CENTER, zoom: 9.2, pitch: is3D ? 45 : 0, duration: 1200 })
  }, [hazardMode, is3D])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ pitch: is3D ? 55 : 0, duration: 700 })
  }, [is3D])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const hints: Partial<Record<MapTool, string>> = {
      'draw-fault': 'Click to add fault points. Double-click to finish the line.',
      epicenter: 'Click the map to place the earthquake epicenter.',
      'place-site': 'Click the map to drop the proposed building site pin.',
      measure: 'Click two points to measure distance.',
      'zoom-home': 'Click anywhere to view all of Lasam.',
    }

    setToolHint(hints[activeTool] ?? null)

    const handleClick = (e: MapMouseEvent) => {
      if (activeTool === 'place-site') {
        onSitePlace([e.lngLat.lng, e.lngLat.lat])
        return
      }

      if (activeTool === 'epicenter') {
        onEpicenterPlace([e.lngLat.lng, e.lngLat.lat])
        return
      }

      if (activeTool === 'zoom-home') {
        fitMapToLasam(map, boundary, {
          pitch: is3D ? 52 : 0,
          duration: 1200,
        })
        return
      }

      if (activeTool === 'draw-fault') {
        if (!isDrawingRef.current) {
          isDrawingRef.current = true
          drawPointsRef.current = [[e.lngLat.lng, e.lngLat.lat]]
        } else {
          drawPointsRef.current.push([e.lngLat.lng, e.lngLat.lat])
        }

        const lineFeature: Feature<LineString> = {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: drawPointsRef.current },
        }

        ;(map.getSource('draw-fault') as maplibregl.GeoJSONSource)?.setData({
          type: 'FeatureCollection',
          features: [lineFeature],
        })
        return
      }

      if (activeTool === 'measure') {
        measurePointsRef.current.push([e.lngLat.lng, e.lngLat.lat])
        if (measurePointsRef.current.length > 2) {
          measurePointsRef.current = [[e.lngLat.lng, e.lngLat.lat]]
        }

        const pts = measurePointsRef.current
        const features: GeoJSON.Feature[] = pts.map((p) => ({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: p },
        }))

        if (pts.length === 2) {
          features.push({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: pts },
          })
          const dist = distance(point(pts[0]), point(pts[1]), { units: 'meters' })
          onMeasureUpdate(`${Math.round(dist)} meters`)
        } else {
          onMeasureUpdate('Select second point…')
        }

        ;(map.getSource('measure') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features,
        })
      }
    }

    const handleDblClick = () => {
      if (activeTool === 'draw-fault' && drawPointsRef.current.length >= 2) {
        const line: Feature<LineString> = {
          type: 'Feature',
          properties: { name: 'Drawn Fault Line' },
          geometry: { type: 'LineString', coordinates: drawPointsRef.current },
        }
        onFaultLineDrawn(line)
        drawPointsRef.current = []
        isDrawingRef.current = false
        ;(map.getSource('draw-fault') as maplibregl.GeoJSONSource)?.setData({
          type: 'FeatureCollection',
          features: [],
        })
      }
    }

    map.on('click', handleClick)
    map.on('dblclick', handleDblClick)
    return () => {
      map.off('click', handleClick)
      map.off('dblclick', handleDblClick)
    }
  }, [activeTool, is3D, boundary, onEpicenterPlace, onSitePlace, onFaultLineDrawn, onMeasureUpdate])

  useEffect(() => {
    if (activeTool !== 'measure') {
      measurePointsRef.current = []
      onMeasureUpdate(null)
      const map = mapRef.current
      if (map?.getSource('measure')) {
        ;(map.getSource('measure') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        })
      }
    }
  }, [activeTool, onMeasureUpdate])

  return (
    <div className="relative h-full w-full min-h-[420px]">
      <div ref={containerRef} className="h-full w-full" />
      {mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90 p-6">
          <div className="max-w-sm rounded-lg border border-red-200 bg-white p-4 text-center shadow-lg">
            <p className="text-sm font-semibold text-red-700">Map failed to load</p>
            <p className="mt-2 text-xs text-slate-600">{mapError}</p>
            <p className="mt-2 text-xs text-slate-500">Check your internet connection and reload the page.</p>
          </div>
        </div>
      )}
      <MapLegend hazardMode={hazardMode} layerVisibility={layerVisibility} />
      <TerrainInfoBar sample={terrainSample} />
      {toolHint && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 max-w-[90%] -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-2 text-xs text-white shadow-lg">
          {toolHint}
        </div>
      )}
    </div>
  )
}
