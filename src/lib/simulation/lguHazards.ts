/** LGU / local overlay styling (liquefaction, erosion, LGU flood, CLUP land use). */

import type { ExpressionSpecification } from 'maplibre-gl'

export type LiquefactionSusceptibility = 'low' | 'moderate' | 'high' | 'unknown'
export type ErosionClass = 'none' | 'slight' | 'moderate' | 'severe' | 'river' | 'unknown'
export type LguFloodSusceptibility = 'low' | 'moderate' | 'high' | 'unknown'
export type LandUseClass =
  | 'forest'
  | 'residential'
  | 'socialized_housing'
  | 'commercial'
  | 'agriculture'
  | 'crops'
  | 'agri_industrial'
  | 'institutional'
  | 'parks'
  | 'eco_tourism'
  | 'cemetery'
  | 'infrastructure'
  | 'water'
  | 'road'
  | 'unknown'

export const LIQUEFACTION_COLORS: Record<LiquefactionSusceptibility, string> = {
  low: '#fde047',
  moderate: '#f97316',
  high: '#dc2626',
  unknown: '#94a3b8',
}

export const EROSION_COLORS: Record<ErosionClass, string> = {
  none: '#bbf7d0',
  slight: '#fde68a',
  moderate: '#fb923c',
  severe: '#991b1b',
  river: '#38bdf8',
  unknown: '#94a3b8',
}

/** Coarse LGU flood (2020) — blue palette to distinguish from MGB warm tones. */
export const LGU_FLOOD_COLORS: Record<LguFloodSusceptibility, string> = {
  low: '#93c5fd',
  moderate: '#2563eb',
  high: '#1e3a8a',
  unknown: '#94a3b8',
}

export const LAND_USE_COLORS: Record<LandUseClass, string> = {
  forest: '#166534',
  residential: '#facc15',
  socialized_housing: '#fb923c',
  commercial: '#be123c',
  agriculture: '#84cc16',
  crops: '#84cc16',
  agri_industrial: '#ca8a04',
  institutional: '#6366f1',
  parks: '#22c55e',
  eco_tourism: '#14b8a6',
  cemetery: '#78716c',
  infrastructure: '#64748b',
  water: '#0ea5e9',
  road: '#a8a29e',
  unknown: '#cbd5e1',
}

export const LIQUEFACTION_LEGEND = [
  { key: 'high' as const, label: 'High', color: LIQUEFACTION_COLORS.high },
  { key: 'moderate' as const, label: 'Moderate', color: LIQUEFACTION_COLORS.moderate },
  { key: 'low' as const, label: 'Low', color: LIQUEFACTION_COLORS.low },
]

export const EROSION_LEGEND = [
  { key: 'severe' as const, label: 'Severe', color: EROSION_COLORS.severe },
  { key: 'moderate' as const, label: 'Moderate', color: EROSION_COLORS.moderate },
  { key: 'slight' as const, label: 'Slight', color: EROSION_COLORS.slight },
  { key: 'none' as const, label: 'No apparent', color: EROSION_COLORS.none },
]

export const LGU_FLOOD_LEGEND = [
  { key: 'high' as const, label: 'High', color: LGU_FLOOD_COLORS.high },
  { key: 'moderate' as const, label: 'Moderate', color: LGU_FLOOD_COLORS.moderate },
  { key: 'low' as const, label: 'Low', color: LGU_FLOOD_COLORS.low },
]

export const LAND_USE_LEGEND: { key: LandUseClass; label: string; color: string }[] = [
  { key: 'forest', label: 'Forest', color: LAND_USE_COLORS.forest },
  { key: 'residential', label: 'Residential', color: LAND_USE_COLORS.residential },
  { key: 'socialized_housing', label: 'Socialized housing', color: LAND_USE_COLORS.socialized_housing },
  { key: 'commercial', label: 'Commercial', color: LAND_USE_COLORS.commercial },
  { key: 'agriculture', label: 'Agriculture', color: LAND_USE_COLORS.agriculture },
  { key: 'agri_industrial', label: 'Agri-industrial', color: LAND_USE_COLORS.agri_industrial },
  { key: 'institutional', label: 'Institutional', color: LAND_USE_COLORS.institutional },
  { key: 'parks', label: 'Parks & recreation', color: LAND_USE_COLORS.parks },
  { key: 'eco_tourism', label: 'Eco-tourism', color: LAND_USE_COLORS.eco_tourism },
  { key: 'cemetery', label: 'Cemetery', color: LAND_USE_COLORS.cemetery },
  { key: 'infrastructure', label: 'Infrastructure / utilities', color: LAND_USE_COLORS.infrastructure },
  { key: 'water', label: 'Lakes / rivers', color: LAND_USE_COLORS.water },
  { key: 'road', label: 'Road', color: LAND_USE_COLORS.road },
]

export const NPAAAD_COLORS: Record<string, string> = {
  A: '#059669',
  BU: '#e11d48',
  C: '#84cc16',
  D: '#d97706',
  F: '#ea580c',
  G: '#0284c7',
  H: '#15803d',
  WB: '#0284c7',
  Others: '#64748b',
}

export const NPAAAD_LEGEND = [
  { key: 'A', label: 'All irrigated lands/areas (A)', color: NPAAAD_COLORS.A },
  { key: 'C', label: 'Alluvial plain highly suitable (C)', color: NPAAAD_COLORS.C },
  { key: 'D', label: 'Agro-Industrial croplands (D)', color: NPAAAD_COLORS.D },
  { key: 'F', label: 'Ecologically fragile lands (F)', color: NPAAAD_COLORS.F },
  { key: 'G', label: 'Fishery areas (G)', color: NPAAAD_COLORS.G },
  { key: 'H', label: 'Forest / Watershed (H)', color: NPAAAD_COLORS.H },
  { key: 'BU', label: 'Built-up areas (BU)', color: NPAAAD_COLORS.BU },
  { key: 'WB', label: 'Water bodies (WB)', color: NPAAAD_COLORS.WB },
  { key: 'Others', label: 'Other lands / Infrastructure', color: NPAAAD_COLORS.Others },
]

export const SAFDZ_COLORS: Record<string, string> = {
  '1': '#65a30d',
  '2': '#d97706',
  '3': '#0284c7',
  '8': '#0d9488',
  '9': '#16a34a',
  '10': '#15803d',
  BU: '#e11d48',
  WB: '#0284c7',
  Others: '#64748b',
}

export const SAFDZ_LEGEND = [
  { key: '1', label: 'Strategic Crop Zone (1)', color: SAFDZ_COLORS['1'] },
  { key: '2', label: 'Strategic Livestock Zone (2)', color: SAFDZ_COLORS['2'] },
  { key: '3', label: 'Strategic Fishery Zone (3)', color: SAFDZ_COLORS['3'] },
  { key: '8', label: 'Remaining NPAAAD (8)', color: SAFDZ_COLORS['8'] },
  { key: '9', label: 'Agro-Forestry Zone (9)', color: SAFDZ_COLORS['9'] },
  { key: '10', label: 'Forest / Watershed Areas (10)', color: SAFDZ_COLORS['10'] },
  { key: 'BU', label: 'Built-up areas (BU)', color: SAFDZ_COLORS.BU },
  { key: 'WB', label: 'Water Bodies (WB)', color: SAFDZ_COLORS.WB },
  { key: 'Others', label: 'Other lands / Infrastructure', color: SAFDZ_COLORS.Others },
]

export const LGU_HAZARD_OPACITY = 0.5

export function buildClassColorMatch(
  property: string,
  colors: Record<string, string>,
  fallback: string,
): ExpressionSpecification {
  const match: (string | ExpressionSpecification)[] = ['match', ['get', property]]
  for (const [key, color] of Object.entries(colors)) {
    match.push(key, color)
  }
  match.push(fallback)
  return match as ExpressionSpecification
}

