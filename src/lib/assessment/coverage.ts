/**
 * Dataset Reliability & Coverage Framework
 *
 * Prevents data hallucinations, false-negative safety ratings, and unverified inferences
 * as map coverage expands from Lasam to neighboring municipalities (e.g. Lal-lo, Allacapan, Gattaran).
 *
 * Core Principles:
 * 1. Absence of Data != Absence of Hazard (Never classify unmapped/out-of-coverage areas as "Safe").
 * 2. Explicit Confidence Grading (High = Local Ingested & Verified; Moderate = Regional Catalog; Data Gap = Unsurveyed).
 * 3. Multi-Municipality Awareness (Detects whether coordinates are in Lasam, Lal-lo, or other LGUs).
 */

import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point } from '@turf/turf'
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson'

export type CoverageTier = 'full' | 'regional' | 'unsupported'
export type ConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW' | 'DATA_GAP'

export interface LayerReliabilityStatus {
  layerKey: string
  label: string
  sourceAgency: string
  vintage: string
  scaleResolution: string
  status: 'available' | 'partial' | 'pending_ingestion' | 'unmapped'
  reliabilityScore: number // 0 - 100
  notes: string
}

export interface MunicipalityCoverageProfile {
  name: string
  psgc: string
  province: string
  tier: CoverageTier
  confidence: ConfidenceLevel
  description: string
  hallucinationNotice?: string
  bbox: { west: number; east: number; south: number; north: number }
  availableLayers: string[]
  pendingLayers: string[]
}

/** Northern Cagayan Planning Corridor Extent */
export const CAGAYAN_REGIONAL_BBOX = {
  west: 121.30,
  east: 121.95,
  south: 17.85,
  north: 18.35,
} as const

/** Municipality profiles in Northern Cagayan corridor */
export const MUNICIPALITY_PROFILES: Record<string, MunicipalityCoverageProfile> = {
  Lasam: {
    name: 'Lasam',
    psgc: '0201517000',
    province: 'Cagayan',
    tier: 'full',
    confidence: 'HIGH',
    description: 'Primary project focus municipality with full local GIS layers ingested and verified.',
    bbox: { west: 121.42, east: 121.66, south: 17.99, north: 18.12 },
    availableLayers: [
      'DENR-MGB Detailed Flood (1:10,000)',
      'LGU Flood Hazard Zones (2020)',
      'LGU Liquefaction Susceptibility (2013)',
      'LGU Land Erosion Hazard (2020)',
      'LGU Comprehensive Land Use Plan - CLUP (2020)',
      'DA-BSWM NPAAAD Agricultural Protection (2022)',
      'DA-BSWM SAFDZ Strategic Agri-Fishery Zones (2022)',
      '3D Building Footprint Inventory (OSM / Local)',
      'High-Resolution Hydro-Conditioned DEM (SRTM/LiDAR)',
      'PHIVOLCS Active Faults Catalog (50 km)',
      'PHIVOLCS Northern Luzon Volcanoes Inventory',
      'Critical Facilities GeoJSON (Schools, Health, Roads)',
    ],
    pendingLayers: [],
  },
  'Lal-lo': {
    name: 'Lal-lo',
    psgc: '0201516000',
    province: 'Cagayan',
    tier: 'regional',
    confidence: 'MODERATE',
    description:
      'Neighboring municipality east of the Cagayan River. Active regional hazard datasets (faults, volcanoes, regional wind/surge reference); local municipal GIS layers pending ingestion.',
    hallucinationNotice:
      'Regional PHIVOLCS fault lines and volcanic proximity are active for Lal-lo. However, local DENR-MGB detailed 1:10,000 flood polygons, municipal CLUP zoning, and local liquefaction/erosion shapefiles are currently restricted to Lasam. Missing layers are explicitly marked as "Unsurveyed / Data Gap" — NOT "Safe" — to prevent false-negative safety hallucinations.',
    bbox: { west: 121.60, east: 121.85, south: 18.10, north: 18.28 },
    availableLayers: [
      'PHIVOLCS Active Faults Catalog (50 km)',
      'PHIVOLCS Northern Luzon Volcanoes Inventory',
      'PAGASA Cagayan Valley Regional Wind Reference',
      'Regional Hydrology & Major Cagayan River Channels',
    ],
    pendingLayers: [
      'DENR-MGB Detailed Flood Susceptibility (1:10,000) for Lal-lo',
      'Lal-lo Approved CLUP Land-Use Map & Zoning Ordinance',
      'Lal-lo Liquefaction Susceptibility Survey',
      'Lal-lo Land Erosion & Slope Stability Layers',
      'Lal-lo Building Footprints & Structural Height Inventory',
      'DA-BSWM NPAAAD & SAFDZ Agricultural Protection for Lal-lo',
    ],
  },
  Allacapan: {
    name: 'Allacapan',
    psgc: '0201502000',
    province: 'Cagayan',
    tier: 'regional',
    confidence: 'MODERATE',
    description: 'Northern neighbor municipality. Regional hazard datasets active; local LGU layers pending.',
    hallucinationNotice:
      'Regional seismic and volcanic data active. Local MGB flood and municipal CLUP layers pending ingestion. Unmapped layers flagged as Data Gap, not Safe.',
    bbox: { west: 121.45, east: 121.65, south: 18.15, north: 18.33 },
    availableLayers: ['PHIVOLCS Active Faults', 'Northern Luzon Volcanoes'],
    pendingLayers: ['Local MGB Flood 1:10k', 'Allacapan CLUP', 'Local Liquefaction', 'Local Buildings'],
  },
  Gattaran: {
    name: 'Gattaran',
    psgc: '0201510000',
    province: 'Cagayan',
    tier: 'regional',
    confidence: 'MODERATE',
    description: 'Southeastern neighbor municipality along Cagayan River corridor. Regional datasets active.',
    hallucinationNotice:
      'Regional seismic and volcanic data active. Local MGB flood and municipal CLUP layers pending ingestion. Unmapped layers flagged as Data Gap, not Safe.',
    bbox: { west: 121.60, east: 121.90, south: 17.95, north: 18.12 },
    availableLayers: ['PHIVOLCS Active Faults', 'Northern Luzon Volcanoes'],
    pendingLayers: ['Local MGB Flood 1:10k', 'Gattaran CLUP', 'Local Liquefaction', 'Local Buildings'],
  },
  'Santo Niño': {
    name: 'Santo Niño (Faire)',
    psgc: '0201524000',
    province: 'Cagayan',
    tier: 'regional',
    confidence: 'MODERATE',
    description: 'Southern neighbor municipality. Regional datasets active; local LGU layers pending.',
    bbox: { west: 121.40, east: 121.62, south: 17.85, north: 18.02 },
    availableLayers: ['PHIVOLCS Active Faults', 'Northern Luzon Volcanoes'],
    pendingLayers: ['Local MGB Flood 1:10k', 'Santo Niño CLUP', 'Local Liquefaction', 'Local Buildings'],
  },
}

export interface SiteCoverageReport {
  municipality: string
  psgc: string
  province: string
  tier: CoverageTier
  confidence: ConfidenceLevel
  confidenceScore: number // 0-100 overall score
  confidenceLabel: string
  isLasamLocal: boolean
  isRegionalCoverage: boolean
  isWithinCorridor: boolean
  profile: MunicipalityCoverageProfile
  layerAudit: LayerReliabilityStatus[]
  warnings: string[]
  hallucinationPreventionRules: string[]
}

/** Check if coordinates are within the Cagayan regional assessment corridor */
export function isWithinRegionalCorridor(lng: number, lat: number): boolean {
  return (
    lng >= CAGAYAN_REGIONAL_BBOX.west &&
    lng <= CAGAYAN_REGIONAL_BBOX.east &&
    lat >= CAGAYAN_REGIONAL_BBOX.south &&
    lat <= CAGAYAN_REGIONAL_BBOX.north
  )
}

/** Check whether a coordinate falls strictly within the official municipal boundary of Lasam */
export function isPointInsideLasam(
  lng: number,
  lat: number,
  lasamBoundary?: FeatureCollection | null,
): boolean {
  const pt = point([lng, lat])

  if (lasamBoundary?.features?.length) {
    for (const feat of lasamBoundary.features) {
      if (!feat.geometry) continue
      const geomType = feat.geometry.type
      if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        try {
          if (booleanPointInPolygon(pt, feat.geometry as Polygon | MultiPolygon)) {
            return true
          }
        } catch {
          // ignore error
        }
      }
    }
    return false
  }

  const lasamBbox = MUNICIPALITY_PROFILES.Lasam.bbox
  return (
    lng >= lasamBbox.west &&
    lng <= lasamBbox.east &&
    lat >= lasamBbox.south &&
    lat <= lasamBbox.north
  )
}

/** Determine municipality for given coordinates */
export function identifyMunicipality(
  lng: number,
  lat: number,
  lasamBoundary?: FeatureCollection | null,
): string {
  if (isPointInsideLasam(lng, lat, lasamBoundary)) {
    return 'Lasam'
  }

  // 3. Test Lal-lo (east of Cagayan River)
  const lalloBbox = MUNICIPALITY_PROFILES['Lal-lo'].bbox
  if (
    lng >= lalloBbox.west &&
    lng <= lalloBbox.east &&
    lat >= lalloBbox.south &&
    lat <= lalloBbox.north
  ) {
    return 'Lal-lo'
  }

  // 4. Test Allacapan (north of Lasam)
  const allacapanBbox = MUNICIPALITY_PROFILES.Allacapan.bbox
  if (
    lng >= allacapanBbox.west &&
    lng <= allacapanBbox.east &&
    lat >= allacapanBbox.south &&
    lat <= allacapanBbox.north
  ) {
    return 'Allacapan'
  }

  // 5. Test Gattaran (southeast)
  const gattaranBbox = MUNICIPALITY_PROFILES.Gattaran.bbox
  if (
    lng >= gattaranBbox.west &&
    lng <= gattaranBbox.east &&
    lat >= gattaranBbox.south &&
    lat <= gattaranBbox.north
  ) {
    return 'Gattaran'
  }

  // 6. Test Santo Niño (south)
  const faireBbox = MUNICIPALITY_PROFILES['Santo Niño'].bbox
  if (
    lng >= faireBbox.west &&
    lng <= faireBbox.east &&
    lat >= faireBbox.south &&
    lat <= faireBbox.north
  ) {
    return 'Santo Niño'
  }

  // 7. General Northern Cagayan corridor
  if (isWithinRegionalCorridor(lng, lat)) {
    return 'Northern Cagayan (Regional)'
  }

  return 'Outside Extent'
}

/** Generate comprehensive reliability & coverage audit for any assessed point */
export function getSiteCoverageReport(
  lng: number,
  lat: number,
  lasamBoundary?: FeatureCollection | null,
): SiteCoverageReport {
  const muniName = identifyMunicipality(lng, lat, lasamBoundary)
  const isLasam = muniName === 'Lasam'
  const isLallo = muniName === 'Lal-lo'
  const isCorridor = isWithinRegionalCorridor(lng, lat)

  const profile =
    MUNICIPALITY_PROFILES[muniName] ?? {
      name: muniName,
      psgc: '0201500000',
      province: 'Cagayan',
      tier: isCorridor ? 'regional' : 'unsupported',
      confidence: isCorridor ? 'MODERATE' : 'DATA_GAP',
      description: isCorridor
        ? 'Regional Cagayan corridor location. Regional datasets active; local municipal GIS layers unmapped.'
        : 'Coordinates are outside the Northern Cagayan planning corridor.',
      hallucinationNotice: isCorridor
        ? 'Regional hazard models applied. Local municipal datasets are unavailable; unmapped layers flagged as Data Gap.'
        : 'Coordinates fall outside the system mapping bounds.',
      bbox: CAGAYAN_REGIONAL_BBOX,
      availableLayers: isCorridor ? ['PHIVOLCS Active Faults', 'Northern Luzon Volcanoes'] : [],
      pendingLayers: ['Local MGB Flood 1:10k', 'Local CLUP', 'Local Liquefaction', 'Local Buildings'],
    }

  const layerAudit: LayerReliabilityStatus[] = [
    {
      layerKey: 'mgb_flood',
      label: 'DENR-MGB Detailed Flood Susceptibility',
      sourceAgency: 'Mines and Geosciences Bureau (MGB)',
      vintage: '2020 / GeoRisk ULAP',
      scaleResolution: '1:10,000 detailed polygon survey',
      status: isLasam ? 'available' : 'pending_ingestion',
      reliabilityScore: isLasam ? 95 : 0,
      notes: isLasam
        ? 'Official MGB 1:10k polygons clipped to Lasam PSA boundary.'
        : `MGB detailed 1:10k survey not ingested for ${muniName}. Must NOT be assumed "Safe".`,
    },
    {
      layerKey: 'phivolcs_faults',
      label: 'PHIVOLCS Active Faults',
      sourceAgency: 'DOST-PHIVOLCS / GeoRisk ULAP',
      vintage: '2023-2024 active catalog',
      scaleResolution: 'Regional 50 km buffer search radius',
      status: isCorridor ? 'available' : 'unmapped',
      reliabilityScore: isCorridor ? 90 : 20,
      notes: 'Active fault traces and buffer zones calculated dynamically from PHIVOLCS catalog.',
    },
    {
      layerKey: 'phivolcs_volcanoes',
      label: 'Volcano Proximity & Planning Buffers',
      sourceAgency: 'Smithsonian GVP / DOST-PHIVOLCS',
      vintage: '2024 regional inventory',
      scaleResolution: 'Regional point & concentric radial buffers',
      status: isCorridor ? 'available' : 'unmapped',
      reliabilityScore: isCorridor ? 90 : 20,
      notes: 'Distance to Cagua volcano summit and radial hazard planning buffer calculation.',
    },
    {
      layerKey: 'lgu_clup',
      label: 'CLUP Land Use Zoning',
      sourceAgency: `${isLasam ? 'Lasam' : muniName} Municipal Planning & Dev. Office (MPDC)`,
      vintage: isLasam ? '2020 Approved CLUP' : 'Pending',
      scaleResolution: 'Cadastral / parcel land-use polygons',
      status: isLasam ? 'available' : 'pending_ingestion',
      reliabilityScore: isLasam ? 85 : 0,
      notes: isLasam
        ? 'Comprehensive Land Use Plan polygons converted from official LGU shapefiles.'
        : `Municipal CLUP zoning not ingested for ${muniName}; prevents misclassification of land use.`,
    },
    {
      layerKey: 'lgu_liquefaction',
      label: 'Liquefaction Susceptibility',
      sourceAgency: 'MGB / LGU Disaster Risk Reduction Office',
      vintage: isLasam ? '2013 Local Assessment' : 'Pending',
      scaleResolution: 'Barangay-level susceptibility zones',
      status: isLasam ? 'available' : 'pending_ingestion',
      reliabilityScore: isLasam ? 80 : 0,
      notes: isLasam
        ? 'Local liquefaction map converted from municipal hazard layer.'
        : `Local liquefaction data pending ingestion for ${muniName}.`,
    },
    {
      layerKey: 'lgu_erosion',
      label: 'Land Erosion Susceptibility',
      sourceAgency: 'BSWM / DENR / LGU',
      vintage: isLasam ? '2020 Local Survey' : 'Pending',
      scaleResolution: 'Slope stability polygons',
      status: isLasam ? 'available' : 'pending_ingestion',
      reliabilityScore: isLasam ? 80 : 0,
      notes: isLasam
        ? 'Soil erosion zones converted from municipal hazard layer.'
        : `Local erosion data pending ingestion for ${muniName}.`,
    },
    {
      layerKey: 'building_footprints',
      label: '3D Building Footprints & Exposure',
      sourceAgency: 'OpenStreetMap / Project Field Validation',
      vintage: isLasam ? '2026 Processed Geometries' : 'Pending',
      scaleResolution: 'Individual structure polygons & 3D extrusion heights',
      status: isLasam ? 'available' : 'pending_ingestion',
      reliabilityScore: isLasam ? 85 : 10,
      notes: isLasam
        ? 'Detailed building polygons with estimated heights and terrain elevation.'
        : `Detailed building footprints not loaded for ${muniName}; absence of 3D boxes does not mean zero structures.`,
    },
  ]

  const warnings: string[] = []
  if (!isLasam) {
    warnings.push(
      `Site is located in ${muniName} (${profile.province}). Municipal datasets (MGB detailed flood, local CLUP, and buildings) are currently ingested only for Lasam.`,
    )
    warnings.push(
      'Zero-Hallucination Policy: Unmapped layers are reported as "Unsurveyed / Data Gap" — NEVER as "Safe". Absence of data is not evidence of safety.',
    )
    if (isLallo) {
      warnings.push(
        'Lal-lo Planning Advisory: For official building permit clearance in Lal-lo, consult the Lal-lo Municipal Planning and Development Coordinator (MPDC) and MGB Region II.',
      )
    }
  }

  const hallucinationPreventionRules = [
    'Absence of data is NEVER treated as absence of hazard (No unmapped location is labeled "Safe").',
    'Local datasets (MGB 1:10k flood, CLUP zoning, local liquefaction) are strictly bound to verified LGU territories.',
    'Regional datasets (PHIVOLCS active faults, volcano inventory) apply across Northern Cagayan with explicit distance formulas.',
    'Confidence scores automatically degrade when assessing coordinates outside primary local coverage.',
  ]

  const confidenceScore = isLasam ? 90 : isCorridor ? 55 : 15
  const confidence: ConfidenceLevel = isLasam ? 'HIGH' : isCorridor ? 'MODERATE' : 'DATA_GAP'
  const confidenceLabel = isLasam
    ? 'HIGH CONFIDENCE (Local Verified)'
    : isCorridor
      ? 'MODERATE CONFIDENCE (Regional Only — Local Gaps Flagged)'
      : 'DATA GAP (Outside Survey Extent)'

  return {
    municipality: muniName,
    psgc: profile.psgc,
    province: profile.province,
    tier: profile.tier,
    confidence,
    confidenceScore,
    confidenceLabel,
    isLasamLocal: isLasam,
    isRegionalCoverage: isCorridor && !isLasam,
    isWithinCorridor: isCorridor,
    profile,
    layerAudit,
    warnings,
    hallucinationPreventionRules,
  }
}
