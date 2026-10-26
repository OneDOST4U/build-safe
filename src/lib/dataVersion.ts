/** Bump when sample GeoJSON in public/data/ changes to bust browser cache. */
// Change whenever files under public/data change. These URLs are cached as
// immutable on Vercel, so a new version is required to prevent old GIS data
// from being paired with a newly deployed application bundle.
export const DATA_VERSION = 'gis-20261026-hazard-render-v3'

const GIS_BASE_URL = (import.meta.env.VITE_GIS_BASE_URL ?? '').replace(/\/$/, '')

export function dataUrl(path: string): string {
  return `${GIS_BASE_URL}${path}?v=${DATA_VERSION}`
}

