/** Bump when sample GeoJSON in public/data/ changes to bust browser cache. */
// Change whenever files under public/data change. These URLs are cached as
// immutable on Vercel, so a new version is required to prevent old GIS data
// from being paired with a newly deployed application bundle.
export const DATA_VERSION = 'gis-20261026-map-sync-v2'

export function dataUrl(path: string): string {
  return `${path}?v=${DATA_VERSION}`
}

