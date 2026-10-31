/** Lasam poblacion / Centro — PhilAtlas municipal center */
export const LASAM_CENTER: [number, number] = [121.6015, 18.0645]
export const DEFAULT_ZOOM = 17
export { MAP_STYLE } from '@/lib/map/styles'

/** Application branding */
export const APP_BRAND = {
  name: 'BUILD-SAFE',
  tagline: 'Multi-Hazard Site Intelligence & Decision Support System',
} as const

export const APP_TITLE = `${APP_BRAND.name}: ${APP_BRAND.tagline}`

export const APP_DEMO_SUBTITLE = 'Interactive demonstration prototype · Lasam, Cagayan'

export const APP_LOGO_PATH = '/build-safe-logo.png'
export const APP_LOGO_ALT = 'BUILD-SAFE logo'

export const FLOOD_SCENARIOS = [
  { id: '1h', label: '1-hour rainfall', hours: 1 },
  { id: '3h', label: '3-hour rainfall', hours: 3 },
  { id: '6h', label: '6-hour rainfall', hours: 6 },
  { id: '12h', label: '12-hour rainfall', hours: 12 },
  { id: '24h', label: '24-hour rainfall', hours: 24 },
  { id: 'custom', label: 'Custom scenario', hours: 0 },
] as const

export const VOLCANO_COLORS = {
  none: '#94a3b8',
  low: '#fde047',
  moderate: '#fb923c',
  high: '#ef4444',
  severe: '#7f1d1d',
} as const

export const FLOOD_COLORS = {
  none: '#94a3b8',
  low: '#facc15',
  moderate: '#fb923c',
  high: '#ef4444',
  severe: '#991b1b',
} as const

export const EARTHQUAKE_COLORS = {
  minimal: '#22c55e',
  light: '#facc15',
  moderate: '#fb923c',
  severe: '#ef4444',
  critical: '#991b1b',
} as const

export const DEMO_DISCLAIMER =
  'For demonstration only. Results are not official hazard assessments and must not be used for planning decisions without validated GIS and engineering review.'

export const SIMULATION_DISCLAIMER =
  'Preliminary planning prototype — MGB flood susceptibility (clipped to PSA Lasam), PHIVOLCS fault, and Cagua volcano. Not a substitute for official DENR-MGB / PHIVOLCS products. Sources: DENR-MGB, PSA / GeoRisk, PHIVOLCS / GeoRisk ULAP / GVP.'
