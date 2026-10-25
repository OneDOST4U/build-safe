import type { ProposedBuildingType } from '@/lib/assessment/buildingTypes'

export type HazardMode = 'lgu' | 'flood' | 'fault' | 'volcano' | 'layers'
export type MapTool =
  | 'select'
  | 'pan'
  | 'draw-fault'
  | 'epicenter'
  | 'measure'
  | 'zoom-home'
  | 'place-site'

export type { ProposedBuildingType }

export type FloodExposure = 'none' | 'low' | 'moderate' | 'high' | 'severe'
export type EarthquakeDamage = 'minimal' | 'light' | 'moderate' | 'severe' | 'critical'
export type VolcanoExposure = 'none' | 'low' | 'moderate' | 'high' | 'severe'
export type ValidationStatus = 'unverified' | 'validated' | 'corrected'

export interface BuildingProperties {
  id: string
  building_id: string
  type: string
  building_type: string
  barangay: string
  floors: number
  height: number
  height_estimated: boolean
  baseColor: string
  data_source: string
  validation_status: ValidationStatus
  ground_elevation_m?: number
  roof_elevation_m?: number
  nearest_river_m?: number
  nearest_river_name?: string
  drainage_direction?: string
  slope_deg?: number
  flood_depth_m?: number
  name?: string | null
  osm_id?: number
  color?: string
  floodExposure?: FloodExposure
  earthquakeDamage?: EarthquakeDamage
  faultDistance?: number
  volcanoDistanceKm?: number
  volcanoExposure?: VolcanoExposure
  selected?: number
}

export interface BuildingFeature {
  type: 'Feature'
  properties: BuildingProperties
  geometry: GeoJSON.Polygon
}

export interface BuildingCollection {
  type: 'FeatureCollection'
  features: BuildingFeature[]
}

export interface SimulationStats {
  totalBuildings: number
  floodAffected: number
  faultExposed: number
  earthquakeAffected: number
  volcanoAffected: number
  lowRisk: number
  moderateRisk: number
  highRisk: number
}

export interface SelectedBuilding {
  id: string
  type: string
  barangay: string
  floors: number
  height: number
  heightEstimated: boolean
  groundElevation?: number
  dataSource: string
  validationStatus: string
  floodStatus: string
  earthquakeStatus: string
  faultDistance: string
  floodDepth: string
  volcanoStatus?: string
  name?: string | null
}

export interface TerrainSettings {
  terrain3d: boolean
  hillshade: boolean
  contours: boolean
  elevationColors: boolean
  exaggeration: number
  opacity: number
}

export interface RiverSettings {
  main: boolean
  tributaries: boolean
  drainage: boolean
  riverbanks: boolean
  watershed: boolean
  flowArrows: boolean
}

export interface TerrainSample {
  lng: number
  lat: number
  elevation: number | null
  slope: number | null
  flowDir: string | null
  nearestRiver: string | null
  nearestRiverM: number | null
  barangay: string | null
}

export interface ElevationGrid {
  type: string
  crs: string
  west: number
  south: number
  east: number
  north: number
  cellSizeDeg: number
  cols: number
  rows: number
  values: number[]
  slope?: number[]
  flowDir?: string[]
  flowAcc?: number[]
  source?: string
  unit?: string
}

export interface AssessmentRow {
  label: string
  value: string
  facilityName?: string
  facilityCoords?: [number, number]
  facilityDistanceM?: number
  category?: string
}

import type {
  AssessmentTargetCategory,
  CropSuitabilityInfo,
  FarmCropType,
} from '@/lib/assessment/farmLot'

export type {
  AssessmentTargetCategory,
  CropSuitabilityInfo,
  FarmCropType,
}
import type { SiteCoverageReport } from '@/lib/assessment/coverage'

export interface SiteAssessmentInput {
  lat: number
  lng: number
  category?: AssessmentTargetCategory
  buildingType?: ProposedBuildingType
  cropType?: FarmCropType
}

export interface SiteAssessmentResult {
  input: SiteAssessmentInput
  assessedAt: string
  seismic: AssessmentRow[]
  volcanic: AssessmentRow[]
  hydromet: AssessmentRow[]
  lgu: AssessmentRow[]
  facilities: AssessmentRow[]
  coverage: SiteCoverageReport
  farmAssessment?: AssessmentRow[]
  cropSuitability?: CropSuitabilityInfo
}

export interface SimulationState {
  hazardMode: HazardMode
  activeTool: MapTool
  is3D: boolean
  floodOpacity: number
  earthquakeMagnitude: number
  earthquakeDepth: number
  earthquakeRadius: number
  epicenter: [number, number] | null
  faultLineName: string
  stats: SimulationStats
  selectedBuilding: SelectedBuilding | null
}
