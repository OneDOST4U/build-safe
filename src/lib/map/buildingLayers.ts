import type { Map } from 'maplibre-gl'

/** Warm sandy beige — matches OpenFreeMap / reference map building tone. */
export const BUILDING_COLOR = '#d3c8ba'
/** @deprecated Use BUILDING_COLOR */
export const BUILDING_GRAY = BUILDING_COLOR
export const BUILDING_SELECTED = '#3b82f6'

const BASEMAP_BUILDING_LAYER_IDS = ['building', 'building-3d']

/** Soft overhead light: enough depth on walls, roofs stay warm beige (not black). */
export const BUILDING_LIGHT = {
  anchor: 'viewport' as const,
  color: '#fff8f0',
  intensity: 0.15,
  position: [1.5, 210, 88] as [number, number, number],
}
/** @deprecated Use BUILDING_LIGHT */
export const FLAT_BUILDING_LIGHT = BUILDING_LIGHT

/** Hide native vector-tile buildings so only our GeoJSON extrusions show. */
export function hideBasemapBuildings(map: Map): void {
  for (const layerId of BASEMAP_BUILDING_LAYER_IDS) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', 'none')
    }
  }
}

function applyExtrusionHeights(map: Map, layerId: string, terrainDraped: boolean): void {
  if (!map.getLayer(layerId)) return
  if (terrainDraped) {
    map.setPaintProperty(layerId, 'fill-extrusion-base', 0)
    map.setPaintProperty(layerId, 'fill-extrusion-height', ['get', 'height'])
  } else {
    map.setPaintProperty(layerId, 'fill-extrusion-base', ['coalesce', ['get', 'ground_elevation_m'], 0])
    map.setPaintProperty(layerId, 'fill-extrusion-height', [
      '+',
      ['coalesce', ['get', 'ground_elevation_m'], 0],
      ['get', 'height'],
    ])
  }
}

/** Terrain-draped extrusions with warm beige fill (no per-feature dark colors). */
export function applyBuildingExtrusionPaint(map: Map, terrainDraped: boolean): void {
  for (const layerId of ['buildings-3d', 'buildings-3d-selected', 'proposed-building-3d']) {
    if (!map.getLayer(layerId)) continue
    const verticalGradient = layerId !== 'buildings-3d-selected'
    map.setPaintProperty(layerId, 'fill-extrusion-vertical-gradient', verticalGradient)
    if (layerId === 'proposed-building-3d') {
      map.setPaintProperty(layerId, 'fill-extrusion-opacity', 0.98)
    } else {
      map.setPaintProperty(layerId, 'fill-extrusion-opacity', 1)
    }
    applyExtrusionHeights(map, layerId, terrainDraped)
  }

  if (map.getLayer('buildings-3d')) {
    map.setPaintProperty('buildings-3d', 'fill-extrusion-color', [
      'case',
      ['==', ['get', 'selected'], 1],
      BUILDING_SELECTED,
      ['coalesce', ['get', 'color'], BUILDING_COLOR],
    ])
  }
  if (map.getLayer('buildings-3d-selected')) {
    map.setPaintProperty('buildings-3d-selected', 'fill-extrusion-color', BUILDING_SELECTED)
    map.setPaintProperty('buildings-3d-selected', 'fill-extrusion-vertical-gradient', false)
  }
}

export function raiseBuildingLayers(map: Map): void {
  hideBasemapBuildings(map)
  for (const layerId of [
    'buildings-3d',
    'buildings-3d-selected',
    'proposed-building-3d',
    'proposed-building-outline',
  ]) {
    if (map.getLayer(layerId)) {
      map.moveLayer(layerId)
    }
  }
}

export const GIS_BUILDING_LAYERS = [
  'buildings-footprint',
  'buildings-3d',
  'buildings-3d-selected',
  'buildings-outline',
] as const
