import { useCallback, useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map, MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import distance from '@turf/distance'
import { point } from '@turf/turf'
import { fitMapToLasam, getLasamCenter } from '@/lib/map/lasamView'
import {
  createMap,
  createMapFallback,
  bindMapResize,
  prepareBasemap,
  waitForMapStyle,
} from '@/lib/map/createMap'
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
import {
  HOVERABLE_LEGEND_LAYERS,
  parseHoveredLegendFeature,
  type HoveredLegendInfo,
} from '@/lib/map/hoverLegend'
import { MapPin } from 'lucide-react'
import { identifyMunicipality, isPointInsideLasam } from '@/lib/assessment/coverage'
import { getLandUseAtPoint } from '@/lib/simulation/lguLayerQuery'
import { checkWaterBodyProximity } from '@/lib/assessment/waterBody'
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
import type { HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import { generateHighwayCorridorRoute, getHighwayDrivingRoute } from '@/lib/map/roadRouting'
import type { ProposedBuildingType } from '@/lib/assessment/buildingTypes'
import type { AssessmentTargetCategory } from '@/lib/assessment/farmLot'
import { createProposedBuildingCollection } from '@/lib/assessment/proposedBuilding'

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
  buildingType?: ProposedBuildingType
  category?: AssessmentTargetCategory
  hasAssessmentResult?: boolean
  onReopenReport?: () => void
  reportOpen?: boolean
  hazardPanelOpen?: boolean
  highlightedFacility?: HighlightedFacilityInfo | null
  onClearHighlightedFacility?: () => void
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
  buildingType,
  category,
  hasAssessmentResult = false,
  onReopenReport,
  reportOpen = false,
  hazardPanelOpen = false,
  highlightedFacility = null,
  onClearHighlightedFacility,
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
  const facilityMarkerRef = useRef<maplibregl.Marker | null>(null)
  const facilityPopupRef = useRef<maplibregl.Popup | null>(null)
  const onClearHighlightedFacilityRef = useRef(onClearHighlightedFacility)
  onClearHighlightedFacilityRef.current = onClearHighlightedFacility
  const drawPointsRef = useRef<[number, number][]>([])
  const isDrawingRef = useRef(false)
  const measurePointsRef = useRef<[number, number][]>([])
  const activeToolRef = useRef(activeTool)
  const onBuildingSelectRef = useRef(onBuildingSelect)
  const onRiverSelectRef = useRef(onRiverSelect)
  const onSitePlaceRef = useRef(onSitePlace)
  const boundaryRef = useRef(boundary)
  const elevationGridRef = useRef(elevationGrid)
  const terrainSettingsRef = useRef(terrainSettings)
  const onMapReadyRef = useRef(onMapReady)
  const onReopenReportRef = useRef(onReopenReport)
  onReopenReportRef.current = onReopenReport
  const latestLayerDataRef = useRef({
    boundary, riversMain, riversTributaries, drainage, riverbanks, watersheds,
    flowArrows, contours, mgbFlood, liquefaction, erosion, lguFlood, landUse,
    npaaad, safdz, faultLines,
  })
  // Background GIS downloads can finish before MapLibre assigns mapRef.
  // Retain the newest render synchronously so map startup cannot miss them.
  latestLayerDataRef.current = {
    boundary, riversMain, riversTributaries, drainage, riverbanks, watersheds,
    flowArrows, contours, mgbFlood, liquefaction, erosion, lguFlood, landUse,
    npaaad, safdz, faultLines,
  }

  useEffect(() => {
    boundaryRef.current = boundary
    activeToolRef.current = activeTool
    onBuildingSelectRef.current = onBuildingSelect
    onRiverSelectRef.current = onRiverSelect
    onSitePlaceRef.current = onSitePlace
    elevationGridRef.current = elevationGrid
    terrainSettingsRef.current = terrainSettings
    onMapReadyRef.current = onMapReady
  }, [boundary, activeTool, onBuildingSelect, onRiverSelect, onSitePlace, elevationGrid, terrainSettings, onMapReady])

  const [toolHint, setToolHint] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [terrainSample, setTerrainSample] = useState<TerrainSample | null>(null)
  const [hoverSiteCoords, setHoverSiteCoords] = useState<{
    lng: number
    lat: number
    muni: string
    isInsideLasam?: boolean
    isWaterBody?: boolean
    waterBodyName?: string
    isInstitutional?: boolean
    institutionalName?: string
    isProhibited?: boolean
    prohibitedReason?: string
    point: { x: number; y: number }
  } | null>(null)
  const [hoveredWater, setHoveredWater] = useState<{
    name: string
    waterway: string
    className: string
    point: { x: number; y: number }
  } | null>(null)
  const [hoveredLegend, setHoveredLegend] = useState<HoveredLegendInfo | null>(null)

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
      (layerVisibility.site ?? true) || activeToolRef.current === 'place-site' || hasAssessmentResult
    const markerEl = siteMarkerRef.current?.getElement()
    if (markerEl) {
      markerEl.style.display = sitePinVisible ? '' : 'none'
    }

    raiseBuildingLayers(map)

    // Operational hazard polygons must remain above the basemap and 3D
    // buildings. MapLibre can regroup draped fill layers in pitched views,
    // which previously left a toggle ON while the polygon looked absent.
    // Move enabled hazard layers last so their display state is unambiguous.
    const operationalLayers = [
      'flood-zone-fill',
      'liquefaction-fill',
      'erosion-fill',
      'lgu-flood-fill',
      'lgu-flood-outline',
      'land-use-fill',
      'npaaad-fill',
      'npaaad-line',
      'safdz-fill',
      'safdz-line',
    ]
    for (const layerId of operationalLayers) {
      if (map.getLayer(layerId)) map.moveLayer(layerId)
    }
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
          await waitForMapStyle(map)
        } catch {
          map.remove()
          map = createMapFallback({
            container: containerRef.current,
            center: municipalCenter,
            zoom: 11,
            pitch: 52,
            bearing: -20,
          })
          await waitForMapStyle(map)
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
            'fill-opacity': 0.68,
            'fill-outline-color': '#1e3a8a',
          },
          layout: { visibility: 'none' },
        })
        map.addLayer({
          id: 'lgu-flood-outline',
          type: 'line',
          source: 'lgu-flood-zone',
          paint: {
            'line-color': '#172554',
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 13, 3],
            'line-opacity': 0.95,
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
          if (activeToolRef.current !== 'select' && activeToolRef.current !== 'pan') return
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
            if (activeToolRef.current === 'select' || activeToolRef.current === 'pan') {
              map.getCanvas().style.cursor = 'pointer'
            }
          })
          map.on('mouseleave', layerId, () => {
            if (activeToolRef.current === 'select' || activeToolRef.current === 'pan') {
              map.getCanvas().style.cursor = ''
            }
          })
        }

        const showAgriPopup = (titlePrefix: string) => (e: MapLayerMouseEvent) => {
          if (activeToolRef.current !== 'select' && activeToolRef.current !== 'pan') return
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

        const showLandUsePopup = (e: MapLayerMouseEvent) => {
          if (activeToolRef.current !== 'select' && activeToolRef.current !== 'pan') return
          const feature = e.features?.[0]
          if (!feature?.properties) return
          const p = feature.properties
          const label = String(p.land_use_label ?? 'Land Use')
          const remarks = p.remarks ? String(p.remarks) : ''
          new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font:12px/1.4 system-ui,sans-serif;color:#0f172a">
                <strong style="display:block;margin-bottom:4px;color:#166534">Land Use (CLUP): ${label}</strong>
                ${remarks ? `<div style="color:#64748b;font-size:11px;margin-bottom:4px">${remarks}</div>` : ''}
                <div style="font-size:10px;color:#94a3b8">Source: LGU Lasam CLUP (2020)</div>
              </div>`,
            )
            .addTo(map)
        }

        map.on('click', 'land-use-fill', showLandUsePopup)
        map.on('mouseenter', 'land-use-fill', () => {
          if (activeToolRef.current === 'select' || activeToolRef.current === 'pan') {
            map.getCanvas().style.cursor = 'pointer'
          }
        })
        map.on('mouseleave', 'land-use-fill', () => {
          if (activeToolRef.current === 'select' || activeToolRef.current === 'pan') {
            map.getCanvas().style.cursor = ''
          }
        })

        map.on('click', 'npaaad-fill', showAgriPopup('NPAAAD Protection'))
        map.on('mouseenter', 'npaaad-fill', () => {
          if (activeToolRef.current === 'select' || activeToolRef.current === 'pan') {
            map.getCanvas().style.cursor = 'pointer'
          }
        })
        map.on('mouseleave', 'npaaad-fill', () => {
          if (activeToolRef.current === 'select' || activeToolRef.current === 'pan') {
            map.getCanvas().style.cursor = ''
          }
        })

        map.on('click', 'safdz-fill', showAgriPopup('SAFDZ Zone'))
        map.on('mouseenter', 'safdz-fill', () => {
          if (activeToolRef.current === 'select' || activeToolRef.current === 'pan') {
            map.getCanvas().style.cursor = 'pointer'
          }
        })
        map.on('mouseleave', 'safdz-fill', () => {
          if (activeToolRef.current === 'select' || activeToolRef.current === 'pan') {
            map.getCanvas().style.cursor = ''
          }
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

      map.addSource('facility-route-line', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'facility-route-glow',
        type: 'line',
        source: 'facility-route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#059669',
          'line-width': 8,
          'line-opacity': 0.5,
          'line-blur': 2.5,
        },
      })
      map.addLayer({
        id: 'facility-route-main',
        type: 'line',
        source: 'facility-route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#10b981',
          'line-width': 3.5,
          'line-dasharray': [2, 1.5],
        },
      })

      map.addSource('proposed-building', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'proposed-building-3d',
        type: 'fill-extrusion',
        source: 'proposed-building',
        paint: {
          'fill-extrusion-color': '#FACC15',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.98,
          'fill-extrusion-vertical-gradient': true,
        },
      })
      map.addLayer({
        id: 'proposed-building-outline',
        type: 'line',
        source: 'proposed-building',
        paint: {
          'line-color': '#0f172a',
          'line-width': 2,
          'line-opacity': 0.75,
        },
      })

      map.on('click', 'proposed-building-3d', (e) => {
        e.originalEvent?.stopPropagation?.()
        onReopenReportRef.current?.()
      })
      map.on('mouseenter', 'proposed-building-3d', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'proposed-building-3d', () => {
        map.getCanvas().style.cursor = ''
      })

      map.addSource('measure', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'measure-line', type: 'line', source: 'measure', paint: { 'line-color': '#7c3aed', 'line-width': 2, 'line-dasharray': [2, 2] } })
      map.addLayer({ id: 'measure-points', type: 'circle', source: 'measure', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#7c3aed', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } })

      map.addSource('draw-fault', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'draw-fault-line', type: 'line', source: 'draw-fault', paint: { 'line-color': '#b91c1c', 'line-width': 3, 'line-dasharray': [2, 1] } })

      map.on('click', 'buildings-3d', (e: MapLayerMouseEvent) => {
        if (activeToolRef.current !== 'select' && activeToolRef.current !== 'pan') return
        const feature = e.features?.[0]
        if (feature?.properties?.id) {
          onBuildingSelectRef.current(feature.properties.id as string)
        }
      })

      const WATER_INTERACTIVE_LAYERS = [
        'rivers-main',
        'rivers-tributaries',
        'riverbanks-fill',
        'riverbanks-line',
        'drainage',
      ]

      const onWaterClick = (e: MapLayerMouseEvent) => {
        // If user is placing a site pin, do not allow placing in water bodies
        if (activeToolRef.current === 'place-site') {
          new maplibregl.Popup({ closeButton: true, maxWidth: '300px', className: 'water-warning-popup' })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                <div style="background:#dc2626;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                  <span>🚫 Water Body — Prohibited</span>
                </div>
                <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                  Cannot Place Building or Farm Here
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                  Establishing building structures or farm lots inside active waterways and riverbeds is strictly prohibited under Presidential Decree No. 1067 (Water Code) and PD 1096.
                </div>
              </div>`,
            )
            .addTo(map)
          return
        }

        const feature = e.features?.[0]
        if (!feature?.properties) return
        const p = feature.properties
        const rawName = p.name ?? p.waterway ?? 'Waterway'
        const isRiverGeneric = String(rawName).toLowerCase() === 'river'
        const name = isRiverGeneric ? 'Active River Waterway' : String(rawName)
        const waterway = String(
          p.waterway ?? (feature.layer.id.includes('riverbank') ? 'riverbank' : 'stream'),
        )
        const className = String(
          p.class ?? (feature.layer.id.includes('riverbank') ? 'river bank / bed' : 'water body'),
        )

        let bankElevationM: number | null = null
        const grid = elevationGridRef.current
        if (grid && e.lngLat) {
          bankElevationM = buildTerrainSample(grid, e.lngLat.lng, e.lngLat.lat).elevation
        }

        // Show authoritative MapLibre popup right at the clicked coordinate
        new maplibregl.Popup({
          closeButton: true,
          maxWidth: '320px',
          className: 'water-body-warning-popup',
        })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.45;padding:2px 0;">
              <div style="background:#dc2626;color:#ffffff;padding:6px 10px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                <span>🚫 WATER BODY — CANNOT BUILD OR FARM HERE</span>
              </div>
              <div style="font-weight:700;font-size:13.5px;color:#0f172a;margin-bottom:4px;">
                ${name}
              </div>
              <div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:6px 8px;border-radius:6px;font-size:11px;margin-bottom:6px;line-height:1.4;">
                <strong>Construction & Farming Strictly Prohibited:</strong> Under <strong>Presidential Decree No. 1067</strong> (Water Code of the Philippines, Art. 51) and <strong>PD 1096</strong> (National Building Code), building structures or establishing farm lots within riverbeds, active waterways, and riparian easements is unlawful.
              </div>
              <div style="font-size:10.5px;color:#334155;background:#f8fafc;padding:5px 8px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:6px;">
                <strong style="color:#0f172a">Mandatory Legal Easements:</strong><br/>
                • Urban areas: <strong>3 meters</strong><br/>
                • Agricultural areas: <strong>20 meters</strong><br/>
                • Forest / Protected: <strong>40 meters</strong>
              </div>
              <div style="font-size:10px;color:#64748b;display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:4px;">
                <span>Type: <strong style="color:#334155">${waterway}</strong> (${className})</span>
                ${bankElevationM != null ? `<span>Elev: <strong style="color:#334155">${bankElevationM.toFixed(1)}m</strong></span>` : ''}
              </div>
            </div>`,
          )
          .addTo(map)

        onRiverSelectRef.current({
          id: String(p.id ?? p.parent_id ?? ''),
          name,
          waterway,
          className,
          lengthKm: p.length_km as number | undefined,
          bankElevationM,
          isWaterBody: true,
          advisory:
            'Construction and farming strictly prohibited under Presidential Decree No. 1067 (Water Code).',
        })

        // No site placement on water body - Water Code PD 1067 forbids construction
      }

      for (const layerId of WATER_INTERACTIVE_LAYERS) {
        map.on('click', layerId, onWaterClick)
        map.on('mouseenter', layerId, (e: MapLayerMouseEvent) => {
          const feat = e.features?.[0]
          const p = feat?.properties ?? {}
          const rawName = p.name ?? p.waterway ?? 'Waterway'
          const name = String(rawName).toLowerCase() === 'river' ? 'River Segment' : String(rawName)
          const waterway = String(
            p.waterway ?? (layerId.includes('riverbank') ? 'riverbank' : 'stream'),
          )
          const className = String(p.class ?? 'water body')

          map.getCanvas().style.cursor =
            activeToolRef.current === 'place-site' ? 'crosshair' : 'pointer'
          setHoveredWater({
            name,
            waterway,
            className,
            point: { x: e.point.x, y: e.point.y },
          })
        })
        map.on('mousemove', layerId, (e: MapLayerMouseEvent) => {
          const feat = e.features?.[0]
          const p = feat?.properties ?? {}
          const rawName = p.name ?? p.waterway ?? 'Waterway'
          const name = String(rawName).toLowerCase() === 'river' ? 'River Segment' : String(rawName)
          const waterway = String(
            p.waterway ?? (layerId.includes('riverbank') ? 'riverbank' : 'stream'),
          )
          const className = String(p.class ?? 'water body')

          map.getCanvas().style.cursor =
            activeToolRef.current === 'place-site' ? 'crosshair' : 'pointer'
          setHoveredWater({
            name,
            waterway,
            className,
            point: { x: e.point.x, y: e.point.y },
          })
        })
        map.on('mouseleave', layerId, (e: MapLayerMouseEvent) => {
          setHoveredWater(null)
          if (activeToolRef.current === 'place-site') {
            const inside = e?.lngLat
              ? isPointInsideLasam(e.lngLat.lng, e.lngLat.lat, boundaryRef.current)
              : true
            map.getCanvas().style.cursor = inside ? 'crosshair' : 'not-allowed'
          } else {
            map.getCanvas().style.cursor = ''
          }
        })
      }

      if (map.getLayer('water')) {
        map.on('click', 'water', onWaterClick)
        map.on('mouseenter', 'water', (e: MapLayerMouseEvent) => {
          map.getCanvas().style.cursor =
            activeToolRef.current === 'place-site' ? 'crosshair' : 'pointer'
          setHoveredWater({
            name: 'Natural Water Body',
            waterway: 'water',
            className: 'water body',
            point: { x: e.point.x, y: e.point.y },
          })
        })
        map.on('mouseleave', 'water', (e: MapLayerMouseEvent) => {
          setHoveredWater(null)
          if (activeToolRef.current === 'place-site') {
            const inside = e?.lngLat
              ? isPointInsideLasam(e.lngLat.lng, e.lngLat.lat, boundaryRef.current)
              : true
            map.getCanvas().style.cursor = inside ? 'crosshair' : 'not-allowed'
          } else {
            map.getCanvas().style.cursor = ''
          }
        })
      }

        if (cancelled) {
          map.remove()
          return
        }

        // Reconcile data that may have arrived while MapLibre was starting.
        // Without this, the sidebar can show loaded feature counts while the
        // corresponding MapLibre source still contains the initial empty data.
        const latest = latestLayerDataRef.current
        const syncSource = (id: string, data: FeatureCollection | null | undefined) => {
          const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined
          if (source && data) source.setData(data)
        }
        syncSource('boundary', latest.boundary)
        syncSource('watersheds', latest.watersheds)
        syncSource('riverbanks', latest.riverbanks)
        syncSource('rivers-main', latest.riversMain)
        syncSource('rivers-tributaries', latest.riversTributaries)
        syncSource('drainage', latest.drainage)
        syncSource('flow-arrows', latest.flowArrows)
        syncSource('contours', latest.contours)
        syncSource('flood-zone', latest.mgbFlood)
        syncSource('liquefaction-zone', latest.liquefaction)
        syncSource('erosion-zone', latest.erosion)
        syncSource('lgu-flood-zone', latest.lguFlood)
        syncSource('land-use-zone', latest.landUse)
        syncSource('npaaad-zone', latest.npaaad)
        syncSource('safdz-zone', latest.safdz)
        syncSource('fault-line', latest.faultLines)

        fitMapToLasam(map, latest.boundary, { duration: 0 })

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

  // Render proposed 3D building ("box house") on the live map whenever siteCoords is set
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const syncProposedBuilding = () => {
      const source = map.getSource('proposed-building') as maplibregl.GeoJSONSource | undefined
      if (!source) return

      if (!siteCoords || activeTool === 'place-site') {
        source.setData({ type: 'FeatureCollection', features: [] })
        return
      }

      const activeBuildingType = (category === 'farm_lot'
        ? 'Agricultural structure (barn, poultry shed)'
        : (buildingType ?? 'Single-family house')) as ProposedBuildingType

      try {
        const buildingData = createProposedBuildingCollection(
          siteCoords[0],
          siteCoords[1],
          activeBuildingType,
          buildings,
        )
        source.setData(buildingData)
        raiseBuildingLayers(map)
      } catch (err) {
        console.error('Failed to create proposed building collection:', err)
      }
    }

    if (map.isStyleLoaded()) {
      syncProposedBuilding()
    } else {
      map.once('load', syncProposedBuilding)
    }

    return () => {
      map.off('load', syncProposedBuilding)
    }
  }, [siteCoords, buildingType, category, buildings, activeTool])

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

      const isProhibitedLocation = Boolean(
        siteCoords && landUse && (() => {
          const lu = getLandUseAtPoint(siteCoords, landUse)
          const c = String(lu?.properties?.land_use_class ?? '').toLowerCase().trim()
          const l = String(lu?.properties?.land_use_label ?? '').toLowerCase().trim()
          const r = String(lu?.properties?.remarks ?? '').toLowerCase().trim()
          const isRes = c === 'residential' || c === 'socialized_housing' || l.includes('residential') || l.includes('socialized housing')
          const isComm = c === 'commercial' || l.includes('commercial')
          const isParks = c === 'parks' || l.includes('parks') || l.includes('recreation')
          const isCem = c === 'cemetery' || l.includes('cemetery') || r.includes('cemetery') || r.includes('memorial')
          const isInst = c === 'institutional' || l.includes('institutional') || r.includes('school') || r.includes('afp camp')
          const isWat = c === 'water' || l.includes('river') || l.includes('water')
          const isAgri = c === 'agriculture' || c === 'crops' || l.includes('agri') || l.includes('crop')
          if (isParks || isCem || isInst || isWat) return true
          if (category === 'building' && !isRes && !isComm) return true
          if (category === 'farm_lot' && !isAgri) return true
          return false
        })()
      )

      const markerHtml = hasAssessmentResult
        ? isProhibitedLocation
          ? `
          <div class="live-site-assessment-badge" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;user-select:none;transition:transform 0.15s ease;">
            <div style="display:flex;align-items:center;gap:4.5px;background:#dc2626;color:#ffffff;padding:3px 9px;border-radius:9999px;font-size:10.5px;font-weight:700;letter-spacing:0.3px;border:1.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.35);white-space:nowrap;">
              <span style="font-size:10px;">🚫</span>
              <span>PROHIBITED SITE</span>
              <span style="font-size:8.5px;background:rgba(255,255,255,0.25);padding:1px 5px;border-radius:4px;font-weight:800;letter-spacing:0.2px;">OPEN</span>
            </div>
            <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;margin-top:4px;box-shadow:0 0 6px #dc2626;"></div>
          </div>
        `
          : `
        <div class="live-site-assessment-badge" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;user-select:none;transition:transform 0.15s ease;">
          <div style="display:flex;align-items:center;gap:4.5px;background:#065f46;color:#ffffff;padding:3px 9px;border-radius:9999px;font-size:10.5px;font-weight:700;letter-spacing:0.3px;border:1.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.35);white-space:nowrap;">
            <span style="font-size:10px;">📍</span>
            <span>LIVE SITE ASSESSMENT</span>
            <span style="font-size:8.5px;background:rgba(255,255,255,0.25);padding:1px 5px;border-radius:4px;font-weight:800;letter-spacing:0.2px;">OPEN</span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid #065f46;margin-top:-1px;"></div>
          <div style="width:6px;height:6px;border-radius:50%;background:#34d399;margin-top:2px;box-shadow:0 0 6px #10b981;"></div>
        </div>
      `
        : `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="position:absolute;bottom:2px;width:30px;height:30px;border-radius:50%;background:rgba(2,132,199,0.35);box-shadow:0 0 0 4px rgba(2,132,199,0.25);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:absolute;bottom:10px;width:10px;height:10px;border-radius:50%;background:#0284c7;border:2px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
          <img src="/markers/site-pin.svg" alt="" width="36" height="48" draggable="false" style="display:block;filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));position:relative;z-index:2;" />
        </div>
      `

      const markerOffset: [number, number] = hasAssessmentResult ? [0, -28] : [0, 2]

      if (!siteMarkerRef.current) {
        const el = document.createElement('div')
        el.className = 'site-pin-marker'
        el.style.cssText =
          `width:auto;height:auto;display:flex;align-items:flex-end;justify-content:center;z-index:30;pointer-events:${hasAssessmentResult ? 'auto' : 'none'};cursor:${hasAssessmentResult ? 'pointer' : 'default'};`
        el.title = hasAssessmentResult ? 'Click to reopen Site Assessment Report' : ''
        el.innerHTML = markerHtml
        if (hasAssessmentResult) {
          el.onclick = (e) => {
            e.stopPropagation()
            e.preventDefault()
            onReopenReportRef.current?.()
          }
          el.onmousedown = (e) => e.stopPropagation()
          el.ontouchstart = (e) => e.stopPropagation()
        }
        siteMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: markerOffset })
          .setLngLat(siteCoords)
          .addTo(map)
      } else {
        const el = siteMarkerRef.current.getElement()
        el.style.pointerEvents = hasAssessmentResult ? 'auto' : 'none'
        el.style.cursor = hasAssessmentResult ? 'pointer' : 'default'
        el.title = hasAssessmentResult ? 'Click to open Live Site Assessment' : ''
        el.innerHTML = markerHtml
        if (hasAssessmentResult) {
          el.onclick = (e) => {
            e.stopPropagation()
            e.preventDefault()
            onReopenReportRef.current?.()
          }
          el.onmousedown = (e) => e.stopPropagation()
          el.ontouchstart = (e) => e.stopPropagation()
        } else {
          el.onclick = null
          el.onmousedown = null
          el.ontouchstart = null
        }
        siteMarkerRef.current.setOffset(markerOffset)
        siteMarkerRef.current.setLngLat(siteCoords)
      }

      const sitePinVisible =
        (layerVisibility.site ?? true) || activeTool === 'place-site' || hasAssessmentResult
      siteMarkerRef.current.getElement().style.display = sitePinVisible ? '' : 'none'

      if (flyToSite && !highlightedFacility) {
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
  }, [siteCoords, flyToSite, is3D, layerVisibility.site, activeTool, hasAssessmentResult, onReopenReport])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const syncFacilityRoute = () => {
      const lineSource = map.getSource('facility-route-line') as maplibregl.GeoJSONSource | undefined

      const isProhibitedLocation = Boolean(
        siteCoords && landUse && (() => {
          const lu = getLandUseAtPoint(siteCoords, landUse)
          const c = String(lu?.properties?.land_use_class ?? '').toLowerCase().trim()
          const l = String(lu?.properties?.land_use_label ?? '').toLowerCase().trim()
          const r = String(lu?.properties?.remarks ?? '').toLowerCase().trim()
          const isRes = c === 'residential' || c === 'socialized_housing' || l.includes('residential') || l.includes('socialized housing')
          const isComm = c === 'commercial' || l.includes('commercial')
          const isParks = c === 'parks' || l.includes('parks') || l.includes('recreation')
          const isCem = c === 'cemetery' || l.includes('cemetery') || r.includes('cemetery') || r.includes('memorial')
          const isInst = c === 'institutional' || l.includes('institutional') || r.includes('school') || r.includes('afp camp')
          const isWat = c === 'water' || l.includes('river') || l.includes('water')
          const isAgri = c === 'agriculture' || c === 'crops' || l.includes('agri') || l.includes('crop')
          if (isParks || isCem || isInst || isWat) return true
          if (category === 'building' && !isRes && !isComm) return true
          if (category === 'farm_lot' && !isAgri) return true
          return false
        })()
      )

      if (!highlightedFacility || !siteCoords || isProhibitedLocation) {
        lineSource?.setData({
          type: 'FeatureCollection',
          features: [],
        })
        facilityMarkerRef.current?.remove()
        facilityMarkerRef.current = null
        facilityPopupRef.current?.remove()
        facilityPopupRef.current = null
        return
      }

      const [siteLng, siteLat] = siteCoords
      const [facLng, facLat] = highlightedFacility.coords

      // 1. Draw live highway route immediately (0ms local road geometry, never a straight line!)
      const instantRoute = generateHighwayCorridorRoute([siteLng, siteLat], [facLng, facLat])
      lineSource?.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: highlightedFacility.name, road: instantRoute.roadName },
            geometry: {
              type: 'LineString',
              coordinates: instantRoute.coordinates,
            },
          },
        ],
      })

      // 2. Add / update destination marker
      facilityMarkerRef.current?.remove()
      const el = document.createElement('div')
      el.className = 'facility-route-target-pin'
      el.style.cssText =
        'cursor:pointer;display:flex;flex-direction:column;align-items:center;z-index:35;pointer-events:auto;'
      const safeFacName = highlightedFacility.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      el.innerHTML = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="position:absolute;bottom:0px;width:34px;height:34px;border-radius:50%;background:rgba(16,185,129,0.35);box-shadow:0 0 0 4px rgba(16,185,129,0.25);animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:absolute;bottom:8px;width:14px;height:14px;border-radius:50%;background:#059669;border:2.5px solid #ffffff;box-shadow:0 2px 5px rgba(0,0,0,0.4);"></div>
          <div style="background:#065f46;color:#ffffff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:9999px;border:1.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);margin-bottom:18px;white-space:nowrap;display:flex;align-items:center;gap:4px;">
            <span>📍</span>
            <span>${safeFacName}</span>
          </div>
        </div>
      `
      facilityMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [0, 2],
      })
        .setLngLat([facLng, facLat])
        .addTo(map)

      // 3. Smoothly animate live map camera to show the full road route and destination
      const leftPad = hazardPanelOpen ? 360 : 80
      const routePadding = { top: 110, bottom: 90, left: leftPad, right: 80 }

      const bounds = new maplibregl.LngLatBounds()
      for (const pt of instantRoute.coordinates) {
        bounds.extend(pt)
      }

      map.fitBounds(bounds, {
        padding: routePadding,
        maxZoom: 16,
        duration: 900,
      })

      // 4. Show live route info popup card
      facilityPopupRef.current?.remove()
      const categoryLabel = (highlightedFacility.category ?? 'Destination Facility')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      const distLabel =
        highlightedFacility.distanceM != null
          ? highlightedFacility.distanceM >= 1000
            ? `${(highlightedFacility.distanceM / 1000).toFixed(2)} km`
            : `${Math.round(highlightedFacility.distanceM)} m`
          : ''
      const travelTimeText = (highlightedFacility.valueText ?? '')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: [0, -32],
        maxWidth: '300px',
        className: 'facility-live-route-popup',
      })
        .setLngLat([facLng, facLat])
        .setHTML(
          `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:4px 2px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10px;font-weight:700;color:#047857;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:3px;">
              <span>📍 ${categoryLabel}</span>
              <span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:1px 6px;border-radius:4px;font-size:9.5px;font-weight:600;">LIVE ROUTE</span>
            </div>
            <div style="font-weight:700;font-size:13px;color:#0f172a;margin-bottom:6px;line-height:1.3;">
              ${safeFacName}
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:6px 8px;font-size:11px;color:#166534;">
              ${distLabel ? `<div><strong>Straight-line Distance:</strong> ${distLabel}</div>` : ''}
              ${travelTimeText ? `<div><strong>Travel Estimate:</strong> ${travelTimeText}</div>` : ''}
            </div>
            <div style="margin-top:6px;font-size:9.5px;color:#64748b;text-align:right;">
              Close (✕) to clear route
            </div>
          </div>`,
        )
        .addTo(map)

      popup.on('close', () => {
        onClearHighlightedFacilityRef.current?.()
      })

      facilityPopupRef.current = popup

      // 5. Fetch high-resolution turn-by-turn road network geometry
      void getHighwayDrivingRoute([siteLng, siteLat], [facLng, facLat]).then((roadRoute) => {
        if (!cancelled && lineSource && roadRoute.coordinates.length > 2) {
          lineSource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { name: highlightedFacility.name, road: roadRoute.roadName },
                geometry: {
                  type: 'LineString',
                  coordinates: roadRoute.coordinates,
                },
              },
            ],
          })

          const roadBounds = new maplibregl.LngLatBounds()
          for (const pt of roadRoute.coordinates) {
            roadBounds.extend(pt)
          }
          map.fitBounds(roadBounds, {
            padding: routePadding,
            maxZoom: 16,
            duration: 650,
          })
        }
      })
    }

    let cancelled = false

    if (map.isStyleLoaded()) {
      syncFacilityRoute()
    } else {
      map.once('load', syncFacilityRoute)
    }

    return () => {
      cancelled = true
      map.off('load', syncFacilityRoute)
    }
  }, [highlightedFacility, siteCoords, hazardPanelOpen])

  // When the report modal is minimized (reportOpen transitions from true to false),
  // resize the map canvas and frame the active route or site pin
  const prevReportOpenRef = useRef(reportOpen)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const wasOpen = prevReportOpenRef.current
    prevReportOpenRef.current = reportOpen

    if (wasOpen && !reportOpen) {
      const timer = setTimeout(() => {
        map.resize()
        if (highlightedFacility && siteCoords) {
          const [siteLng, siteLat] = siteCoords
          const [facLng, facLat] = highlightedFacility.coords
          const instantRoute = generateHighwayCorridorRoute([siteLng, siteLat], [facLng, facLat])
          const bounds = new maplibregl.LngLatBounds()
          for (const pt of instantRoute.coordinates) {
            bounds.extend(pt)
          }
          const leftPad = hazardPanelOpen ? 360 : 80
          map.fitBounds(bounds, {
            padding: { top: 110, bottom: 90, left: leftPad, right: 80 },
            maxZoom: 16,
            duration: 900,
          })
        }
      }, 60)
      return () => clearTimeout(timer)
    }
  }, [reportOpen, highlightedFacility, siteCoords, hazardPanelOpen])

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
        const lng = e.lngLat.lng
        const lat = e.lngLat.lat
        const insideBoundary = isPointInsideLasam(lng, lat, boundaryRef.current ?? boundary)

        if (!insideBoundary) {
          const muniName = identifyMunicipality(lng, lat, boundaryRef.current ?? boundary)
          new maplibregl.Popup({
            closeButton: true,
            maxWidth: '300px',
            className: 'boundary-warning-popup',
          })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                <div style="background:#ea580c;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                  <span>🚫 Outside Lasam Boundary</span>
                </div>
                <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                  Cannot Place Site Here (${muniName})
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                  The proposed building site must be located strictly within the official municipal boundary of Lasam, Cagayan. Clicking outside Lasam is disabled.
                </div>
              </div>`,
            )
            .addTo(map)
          return
        }

        // Check Land Use Zone Restrictions (Parks, Cemetery, Institutional, Residential & Commercial for Building)
        if (landUse) {
          const luFeat = getLandUseAtPoint([lng, lat], landUse)
          if (luFeat) {
            const luClass = String(luFeat.properties?.land_use_class ?? '').toLowerCase().trim()
            const luLabel = String(luFeat.properties?.land_use_label ?? '').toLowerCase().trim()
            const luRemarks = String(luFeat.properties?.remarks ?? '').toLowerCase().trim()

            const isParks = luClass === 'parks' || luLabel.includes('parks') || luLabel.includes('recreation')
            const isCem = luClass === 'cemetery' || luLabel.includes('cemetery') || luRemarks.includes('cemetery') || luRemarks.includes('memorial')
            const isInst = luClass === 'institutional' || luLabel.includes('institutional') || luRemarks.includes('school') || luRemarks.includes('afp camp')
            const isWat = luClass === 'water' || luLabel.includes('river') || luLabel.includes('creek') || luLabel.includes('water')
            const isRes = luClass === 'residential' || luClass === 'socialized_housing' || luLabel.includes('residential') || luLabel.includes('socialized housing')
            const isComm = luClass === 'commercial' || luLabel.includes('commercial')
            const isAgri = luClass === 'agriculture' || luClass === 'crops' || luLabel.includes('agri') || luLabel.includes('crop')

            if (isWat) {
              new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
                .setLngLat(e.lngLat)
                .setHTML(
                  `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                    <div style="background:#dc2626;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                      <span>🚫 Water Body — Prohibited</span>
                    </div>
                    <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                      Cannot Build or Farm Here
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                      Parcel is designated as <strong>Rivers & Water Bodies</strong> under Lasam CLUP (2020). Constructing building structures and establishing farm lots in water bodies is strictly prohibited under Presidential Decree No. 1067.
                    </div>
                  </div>`,
                )
                .addTo(map)
              return
            }

            if (isParks) {
              new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
                .setLngLat(e.lngLat)
                .setHTML(
                  `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                    <div style="background:#dc2626;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                      <span>🚫 Parks & Recreation — Prohibited</span>
                    </div>
                    <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                      Cannot Build or Farm Here
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                      Parcel is designated as <strong>Parks & Recreation</strong> under Lasam CLUP (2020). Building construction and establishing farm lots are strictly prohibited in public recreational spaces.
                    </div>
                  </div>`,
                )
                .addTo(map)
              return
            }

            if (isCem) {
              new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
                .setLngLat(e.lngLat)
                .setHTML(
                  `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                    <div style="background:#dc2626;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                      <span>🚫 Cemetery Grounds — Prohibited</span>
                    </div>
                    <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                      Cannot Build or Farm Here
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                      Parcel is designated as a <strong>Cemetery / Memorial Park</strong> under Lasam CLUP (2020). Constructing private building structures and farm lots is strictly prohibited.
                    </div>
                  </div>`,
                )
                .addTo(map)
              return
            }

            if (isInst) {
              const name = luFeat.properties?.remarks || luFeat.properties?.land_use_label || 'Institutional Zone'
              new maplibregl.Popup({
                closeButton: true,
                maxWidth: '300px',
                className: 'institutional-warning-popup',
              })
                .setLngLat(e.lngLat)
                .setHTML(
                  `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                    <div style="background:#7e22ce;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                      <span>🚫 Institutional Zone — Prohibited</span>
                    </div>
                    <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                      Cannot Build or Farm Here (${name})
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                      Parcel is designated as <strong>Institutional Land Use</strong> under Lasam CLUP (2020) for government and public educational facilities. Private building development and farm lots are strictly prohibited.
                    </div>
                  </div>`,
                )
                .addTo(map)
              return
            }

            if (category === 'building' && !isRes && !isComm) {
              const zoneName = isAgri ? 'Agricultural Land' : luFeat.properties?.land_use_label || 'Non-Residential'
              new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
                .setLngLat(e.lngLat)
                .setHTML(
                  `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                    <div style="background:#dc2626;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                      <span>🚫 Only Residential & Commercial Allowed</span>
                    </div>
                    <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                      Cannot Build Here (${zoneName})
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                      Under Lasam CLUP (2020), building structures are strictly restricted to <strong>Residential</strong> and <strong>Commercial</strong> areas only. Building on ${zoneName.toLowerCase()} is prohibited.
                    </div>
                  </div>`,
                )
                .addTo(map)
              return
            }

            if (category === 'farm_lot' && !isAgri) {
              const zoneName = luFeat.properties?.land_use_label || luClass || 'Non-Agricultural Land'
              new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
                .setLngLat(e.lngLat)
                .setHTML(
                  `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                    <div style="background:#dc2626;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                      <span>🚫 Only Agricultural Areas Allowed</span>
                    </div>
                    <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                      Cannot Farm Here (${zoneName})
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                      Under Lasam CLUP (2020), agricultural farm lots and crop cultivation are strictly restricted to designated <strong>Agricultural</strong> areas only. Farming on ${zoneName.toLowerCase()} is prohibited.
                    </div>
                  </div>`,
                )
                .addTo(map)
              return
            }
          }
        }

        // Check Water Body via geometry calculation and rendered layers
        const waterCheckAtPt = checkWaterBodyProximity([lng, lat], {
          riversMain,
          riversTributaries,
          riverbanks,
          drainage,
        })
        if (waterCheckAtPt.isWaterBody) {
          const rName = waterCheckAtPt.nearestWaterBodyName || 'Water Body'
          new maplibregl.Popup({
            closeButton: true,
            maxWidth: '300px',
            className: 'water-warning-popup',
          })
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                <div style="background:#dc2626;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                  <span>🚫 Water Body — Prohibited</span>
                </div>
                <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                  Cannot Build or Farm Here (${rName})
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                  Establishing building structures or farm lots inside active waterways and riverbeds is strictly prohibited under Presidential Decree No. 1067 and PD 1096.
                </div>
              </div>`,
            )
            .addTo(map)
          return
        }

        // Check Water Body
        const existingWaterLayers = [
          'rivers-main',
          'rivers-tributaries',
          'riverbanks-fill',
          'riverbanks-line',
          'drainage',
          'water',
          'waterway',
        ].filter((id) => map.getLayer(id))

        if (existingWaterLayers.length > 0) {
          const waterFeats = map.queryRenderedFeatures(e.point, {
            layers: existingWaterLayers,
          })
          if (waterFeats.length > 0) {
            const featP = waterFeats[0].properties
            const rName = featP?.name || featP?.waterway || 'Water Body'
            new maplibregl.Popup({
              closeButton: true,
              maxWidth: '300px',
              className: 'water-warning-popup',
            })
              .setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.4;padding:2px 0;">
                  <div style="background:#dc2626;color:#ffffff;padding:5px 8px;margin:-10px -10px 8px -10px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                    <span>🚫 Water Body — Prohibited</span>
                  </div>
                  <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:6px;">
                    Cannot Build or Farm Here (${rName})
                  </div>
                  <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">
                    Establishing building structures or farm lots inside active waterways and riverbeds is strictly prohibited under Presidential Decree No. 1067 and PD 1096.
                  </div>
                </div>`,
              )
              .addTo(map)
            return
          }
        }

        onSitePlace([lng, lat])
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

    if (activeTool === 'place-site') {
      map.getCanvas().style.cursor = 'crosshair'
    } else {
      map.getCanvas().style.cursor = ''
      setHoverSiteCoords(null)
    }

    const handleMouseMove = (e: MapMouseEvent) => {
      // 1. Dynamic cursor legend for active open hazard / land use map layers
      const activeHazardLayers = HOVERABLE_LEGEND_LAYERS.filter((id) => {
        if (!map.getLayer(id)) return false
        return map.getLayoutProperty(id, 'visibility') !== 'none'
      })

      if (activeHazardLayers.length > 0) {
        const feats = map.queryRenderedFeatures(e.point, {
          layers: activeHazardLayers as unknown as string[],
        })
        if (feats.length > 0) {
          const parsed = parseHoveredLegendFeature(feats[0], { x: e.point.x, y: e.point.y })
          setHoveredLegend(parsed)
        } else {
          setHoveredLegend(null)
        }
      } else {
        setHoveredLegend(null)
      }

      // 2. Site placement cursor
      if (activeTool === 'place-site') {
        const lng = e.lngLat.lng
        const lat = e.lngLat.lat
        const insideLasam = isPointInsideLasam(lng, lat, boundaryRef.current ?? boundary)
        const muni = insideLasam ? 'Lasam' : identifyMunicipality(lng, lat, boundaryRef.current ?? boundary)

        // Check if inside land use zones
        let isInstitutional = false
        let isParks = false
        let isCemetery = false
        let isRes = false
        let isComm = false
        let isAgriZone = false
        let zoneLabel = ''

        if (landUse) {
          const luFeat = getLandUseAtPoint([lng, lat], landUse)
          if (luFeat) {
            const luClass = String(luFeat.properties?.land_use_class ?? '').toLowerCase().trim()
            const luLabel = String(luFeat.properties?.land_use_label ?? '').toLowerCase().trim()
            const luRemarks = String(luFeat.properties?.remarks ?? '').toLowerCase().trim()
            zoneLabel = luFeat.properties?.remarks || luFeat.properties?.land_use_label || luClass

            isParks = luClass === 'parks' || luLabel.includes('parks') || luLabel.includes('recreation')
            isCemetery = luClass === 'cemetery' || luLabel.includes('cemetery') || luRemarks.includes('cemetery') || luRemarks.includes('memorial')
            isInstitutional = luClass === 'institutional' || luLabel.includes('institutional') || luRemarks.includes('school') || luRemarks.includes('afp camp')
            isRes = luClass === 'residential' || luClass === 'socialized_housing' || luLabel.includes('residential') || luLabel.includes('socialized housing')
            isComm = luClass === 'commercial' || luLabel.includes('commercial')
            isAgriZone = luClass === 'agriculture' || luClass === 'crops' || luLabel.includes('agri') || luLabel.includes('crop')
          }
        }

        const existingWaterLayers = [
          'rivers-main',
          'rivers-tributaries',
          'riverbanks-fill',
          'riverbanks-line',
          'drainage',
          'water',
          'waterway',
        ].filter((id) => map.getLayer(id))

        let isWater = false
        let waterName: string | undefined

        // Geometry-based water body check
        const waterCheckAtCursor = checkWaterBodyProximity([lng, lat], {
          riversMain,
          riversTributaries,
          riverbanks,
          drainage,
        })
        if (waterCheckAtCursor.isWaterBody) {
          isWater = true
          waterName = waterCheckAtCursor.nearestWaterBodyName || 'Active Water Channel'
        }

        if (existingWaterLayers.length > 0) {
          const waterFeats = map.queryRenderedFeatures(e.point, {
            layers: existingWaterLayers,
          })
          if (waterFeats.length > 0) {
            isWater = true
            const featP = waterFeats[0].properties
            const rName = featP?.name || featP?.waterway || 'Waterway'
            waterName =
              String(rName).toLowerCase() === 'river'
                ? 'Active River Waterway'
                : String(rName)
          }
        }

        let isProhibited = false
        let prohibitedReason = ''

        if (!insideLasam) {
          isProhibited = true
          prohibitedReason = `Outside Lasam (${muni})`
        } else if (isWater) {
          isProhibited = true
          prohibitedReason = waterName || 'Water Body (PD 1067)'
        } else if (isParks) {
          isProhibited = true
          prohibitedReason = 'Parks & Recreation'
        } else if (isCemetery) {
          isProhibited = true
          prohibitedReason = 'Cemetery Grounds'
        } else if (isInstitutional) {
          isProhibited = true
          prohibitedReason = zoneLabel || 'Institutional Zone'
        } else if (category === 'building' && !isRes && !isComm) {
          isProhibited = true
          prohibitedReason = isAgriZone ? 'Agricultural Land' : (zoneLabel || 'Non-Residential / Non-Commercial')
        } else if (category === 'farm_lot' && !isAgriZone) {
          isProhibited = true
          prohibitedReason = zoneLabel ? `Non-Agri (${zoneLabel})` : 'Non-Agricultural Land'
        }

        setHoverSiteCoords({
          lng,
          lat,
          muni,
          isInsideLasam: insideLasam,
          isWaterBody: isWater,
          waterBodyName: waterName,
          isInstitutional,
          institutionalName: zoneLabel,
          isProhibited,
          prohibitedReason,
          point: { x: e.point.x, y: e.point.y },
        })

        if (isProhibited) {
          map.getCanvas().style.cursor = 'not-allowed'
        } else {
          map.getCanvas().style.cursor = 'crosshair'
        }
      }
    }

    const handleCanvasMouseLeave = () => {
      setHoverSiteCoords(null)
      setHoveredLegend(null)
    }

    const canvas = map.getCanvas()
    canvas.addEventListener('mouseleave', handleCanvasMouseLeave)

    map.on('click', handleClick)
    map.on('dblclick', handleDblClick)
    map.on('mousemove', handleMouseMove)
    return () => {
      canvas.removeEventListener('mouseleave', handleCanvasMouseLeave)
      map.off('click', handleClick)
      map.off('dblclick', handleDblClick)
      map.off('mousemove', handleMouseMove)
      map.getCanvas().style.cursor = ''
      setHoveredLegend(null)
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
      {/* Active Layer Legend Tooltip following cursor */}
      {hoveredLegend && activeTool !== 'place-site' && !hoveredWater && (
        <div
          className="pointer-events-none absolute z-30 select-none will-change-[left,top]"
          style={{
            left: `${Math.min(
              hoveredLegend.x + 16,
              (containerRef.current?.clientWidth ?? 600) - 260,
            )}px`,
            top: `${Math.max(14, hoveredLegend.y - 38)}px`,
          }}
        >
          <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/95 px-3 py-1.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-75">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-white/30"
              style={{ backgroundColor: hoveredLegend.color }}
            />
            <span className="text-sm">{hoveredLegend.icon}</span>
            <span className="font-bold tracking-tight text-slate-100">{hoveredLegend.label}</span>
            <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[9px] font-semibold text-slate-300 uppercase tracking-wider">
              {hoveredLegend.layerTitle}
            </span>
          </div>
        </div>
      )}
      {hoveredWater && activeTool !== 'place-site' && (
        <div
          className="pointer-events-none absolute z-30 flex items-center gap-1.5 rounded-full border border-red-300 bg-red-950/95 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(hoveredWater.point.x + 12, (containerRef.current?.clientWidth ?? 400) - 240)}px`,
            top: `${Math.max(12, hoveredWater.point.y - 38)}px`,
          }}
        >
          <span className="text-sm">🌊</span>
          <span>{hoveredWater.name}</span>
          <span className="rounded bg-red-800 px-1.5 py-0.5 text-[9px] font-bold text-red-200">
            🚫 No-Build Zone (PD 1067)
          </span>
        </div>
      )}
      {activeTool === 'place-site' && hoverSiteCoords && !siteCoords && (
        <div
          className="pointer-events-none absolute z-30 select-none will-change-[left,top]"
          style={{
            left: `${hoverSiteCoords.point.x}px`,
            top: `${hoverSiteCoords.point.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Tooltip badge floating directly above cursor */}
            <div
              className={`mb-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xl backdrop-blur-md transition-colors ${
                hoverSiteCoords.isProhibited
                  ? 'border border-red-300 bg-red-950/95 text-red-200'
                  : 'border border-sky-300/80 bg-slate-900/95 text-white'
              }`}
            >
              {hoverSiteCoords.isProhibited ? (
                <span className="flex items-center gap-1.5">
                  <span>🚫</span>
                  <span>Prohibited: {hoverSiteCoords.prohibitedReason}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Left-Click to Land Pin</span>
                  {hoveredLegend && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      <span>{hoveredLegend.icon}</span>
                      <span>{hoveredLegend.label}</span>
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* When permitted, show bouncing pin arrow. When prohibited, disable the arrow pointing to it! */}
            {!hoverSiteCoords.isProhibited ? (
              <div className="relative flex flex-col items-center">
                <img
                  src="/markers/site-pin.svg"
                  alt=""
                  width="34"
                  height="46"
                  draggable={false}
                  className="drop-shadow-xl animate-bounce"
                  style={{ animationDuration: '2.4s' }}
                />
                <div className="absolute -bottom-1 h-5 w-5 rounded-full animate-ping bg-sky-400/60" />
                <div className="absolute -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm bg-sky-500" />
              </div>
            ) : (
              /* When prohibited (Parks, Cemetery, Institutional, Water Body, Outside Lasam, or Non-Residential/Commercial for Building), DISABLE THE ARROW POINTING TO IT */
              <div className="relative flex flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow-lg font-bold text-xs">
                  🚫
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTool === 'place-site' && hoverSiteCoords && !siteCoords && (
        hoverSiteCoords.isProhibited ? (
          <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-red-400 bg-red-950/95 px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-sm animate-pulse">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white font-bold text-xs">
              🚫
            </span>
            <span>
              {hoverSiteCoords.prohibitedReason} — {category === 'building' ? 'Building Prohibited (Only Residential & Commercial Permitted)' : 'Farming Prohibited (Only Agricultural Areas Permitted)'}
            </span>
            <span className="rounded bg-red-900 px-1.5 py-0.5 text-[10px] font-bold text-red-200">
              Disabled
            </span>
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-sky-300 bg-sky-950/90 px-3.5 py-1.5 text-xs font-medium text-white shadow-xl backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5 text-sky-400 animate-bounce" />
            <span>Click map to place site · {hoverSiteCoords.lat.toFixed(5)}° N, {hoverSiteCoords.lng.toFixed(5)}° E</span>
            <span className="rounded bg-sky-800 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">
              Lasam
            </span>
          </div>
        )
      )}
      {toolHint && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 max-w-[90%] -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-2 text-xs text-white shadow-lg">
          {toolHint}
        </div>
      )}
    </div>
  )
}
