import type { Map } from 'maplibre-gl'

/** Reliable raster tiles (OpenStreetMap). */
export const OSM_RASTER_TILES = [
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
]

const UNDERLAY_SOURCE = 'basemap-raster-underlay'
const UNDERLAY_LAYER = 'basemap-raster-underlay'

/**
 * Insert a reliable raster underlay beneath vector style layers if needed.
 */
export function installRasterUnderlay(map: Map): void {
  if (map.getSource(UNDERLAY_SOURCE)) return

  map.addSource(UNDERLAY_SOURCE, {
    type: 'raster',
    tiles: OSM_RASTER_TILES,
    tileSize: 256,
    maxzoom: 19,
    attribution: '© OpenStreetMap contributors',
  })

  const anchor = map.getStyle().layers[0]?.id
  map.addLayer(
    {
      id: UNDERLAY_LAYER,
      type: 'raster',
      source: UNDERLAY_SOURCE,
      minzoom: 0,
      maxzoom: 19,
    },
    anchor,
  )

  if (map.getLayer('background')) {
    map.setPaintProperty('background', 'background-color', 'transparent')
  }
}

