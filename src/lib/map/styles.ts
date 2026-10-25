import type { StyleSpecification } from 'maplibre-gl'
import { OSM_RASTER_TILES } from '@/lib/map/basemapUnderlay'

/** MapLibre official demo tiles — reliable for local development */
export const MAPLIBRE_DEMO_STYLE = 'https://demotiles.maplibre.org/style.json'

/** OpenFreeMap — vector styles with natural-earth low zoom + OSM vectors (free, no API key) */
export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
export const OPENFREEMAP_BRIGHT_STYLE = 'https://tiles.openfreemap.org/styles/bright'
export const OPENFREEMAP_POSITRON_STYLE = 'https://tiles.openfreemap.org/styles/positron'

/** Full raster fallback when vector style JSON cannot load */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: OSM_RASTER_TILES,
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

/**
 * Primary basemap.
 *
 * Keep the style definition in the bundle so map initialization never depends
 * on a third-party style JSON, sprite, or glyph server. The raster tiles are
 * still remote, but a failed tile can no longer prevent the local planning
 * overlays from loading.
 */
export const MAP_STYLE = OSM_RASTER_STYLE

/** Fallback style */
export const MAP_STYLE_FALLBACK = OSM_RASTER_STYLE

/** Optional richer style for local experimentation */
export const MAP_STYLE_DEV = OPENFREEMAP_STYLE

export const MAP_STYLE_CANDIDATES: Array<string | StyleSpecification> = [
  OSM_RASTER_STYLE,
  OPENFREEMAP_STYLE,
  MAPLIBRE_DEMO_STYLE,
]

