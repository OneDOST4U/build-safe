import type { FeatureCollection } from 'geojson'
import {
  formatLandUseClass,
  getErosionAtPoint,
  getLandUseAtPoint,
  getLguFloodAtPoint,
  getLiquefactionAtPoint,
  getNpaaadAtPoint,
  getSafdzAtPoint,
} from '@/lib/simulation/lguLayerQuery'
import type { AssessmentRow } from '@/types'

const UNAVAILABLE = 'Unavailable — run npm run convert:hazards'

function withBarangay(label: string | null | undefined, barangay: unknown): string {
  const place = String(barangay ?? '').trim()
  if (!label) return place ? `Unknown — ${place}` : 'Unknown'
  return place ? `${label} — ${place}` : label
}

import { identifyMunicipality } from '@/lib/assessment/coverage'
import type { ProposedBuildingType } from '@/lib/assessment/buildingTypes'
import type { AssessmentTargetCategory } from '@/lib/assessment/farmLot'

export interface LguAssessmentContext {
  lguFlood?: FeatureCollection | null
  liquefaction?: FeatureCollection | null
  erosion?: FeatureCollection | null
  landUse?: FeatureCollection | null
  npaaad?: FeatureCollection | null
  safdz?: FeatureCollection | null
  municipalityName?: string
  buildingType?: ProposedBuildingType | string
  category?: AssessmentTargetCategory
}

export function assessLgu(
  coords: [number, number],
  ctx: LguAssessmentContext,
): AssessmentRow[] {
  const muni = ctx.municipalityName ?? identifyMunicipality(coords[0], coords[1])
  const isLasam = muni === 'Lasam'
  const buildingType = ctx.buildingType ?? 'Single-family house'
  const category = ctx.category ?? 'building'

  const { landUseRow, zoningComplianceRow, isAgriConflict } = evaluateLandUseZoning(
    coords,
    ctx.landUse,
    ctx.npaaad,
    isLasam,
    muni,
    buildingType,
    category,
  )

  const rows: AssessmentRow[] = [
    {
      label: 'Flood (LGU 2020)',
      value: formatLguFlood(coords, ctx.lguFlood, isLasam, muni),
    },
    {
      label: 'Liquefaction (2013)',
      value: formatLiquefaction(coords, ctx.liquefaction, isLasam, muni),
    },
    {
      label: 'Land erosion (2020)',
      value: formatErosion(coords, ctx.erosion, isLasam, muni),
    },
    {
      label: 'Existing land use (CLUP 2020)',
      value: landUseRow,
    },
    {
      label: 'CLUP Zoning Compliance',
      value: zoningComplianceRow,
    },
  ]

  if (ctx.npaaad?.features?.length || !isLasam) {
    rows.push({
      label: 'NPAAAD Protection (DA 2022)',
      value: formatNpaaad(coords, ctx.npaaad, isLasam, muni, isAgriConflict),
    })
  }

  if (ctx.safdz?.features?.length || !isLasam) {
    rows.push({
      label: 'SAFDZ Agri Zone (DA 2022)',
      value: formatSafdz(coords, ctx.safdz, isLasam, muni),
    })
  }

  return rows
}

function formatLguFlood(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
  isLasam: boolean,
  muni: string,
): string {
  if (!isLasam) {
    return `Unsurveyed / Data Gap — LGU flood hazard layer is Lasam-specific (2020). ${muni} flood zone data pending ingestion.`
  }
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getLguFloodAtPoint(coords, collection)
  if (!match) return 'Outside mapped LGU flood zones (Lasam 2020)'

  const label = String(match.properties?.susceptibility_label ?? '').trim()
  return label ? `${label} (coarse LGU zone)` : 'Mapped (LGU 2020)'
}

function formatLiquefaction(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
  isLasam: boolean,
  muni: string,
): string {
  if (!isLasam) {
    return `Unsurveyed / Data Gap — Liquefaction layer is Lasam-specific (2013). ${muni} study pending ingestion.`
  }
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getLiquefactionAtPoint(coords, collection)
  if (!match) return 'Outside mapped liquefaction susceptibility (Lasam 2013)'

  return withBarangay(
    String(match.properties?.susceptibility_label ?? '').trim() || null,
    match.properties?.barangay,
  )
}

function formatErosion(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
  isLasam: boolean,
  muni: string,
): string {
  if (!isLasam) {
    return `Unsurveyed / Data Gap — Land erosion map is Lasam-specific (2020). ${muni} slope stability data pending.`
  }
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getErosionAtPoint(coords, collection)
  if (!match) return 'Outside mapped land erosion zones (Lasam 2020)'

  return withBarangay(
    String(match.properties?.erosion_label ?? '').trim() || null,
    match.properties?.barangay,
  )
}

function evaluateLandUseZoning(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
  npaaadCollection: FeatureCollection | null | undefined,
  isLasam: boolean,
  muni: string,
  buildingType: string,
  category: 'building' | 'farm_lot',
): { landUseRow: string; zoningComplianceRow: string; isAgriConflict: boolean } {
  if (!isLasam) {
    return {
      landUseRow: `Unsurveyed / Data Gap — CLUP zoning is Lasam-specific (2020). ${muni} official CLUP pending ingestion.`,
      zoningComplianceRow: `Unsurveyed / Data Gap — ${muni} local zoning ordinance pending ingestion.`,
      isAgriConflict: false,
    }
  }
  if (!collection?.features?.length) {
    return {
      landUseRow: UNAVAILABLE,
      zoningComplianceRow: UNAVAILABLE,
      isAgriConflict: false,
    }
  }

  const match = getLandUseAtPoint(coords, collection)
  if (!match) {
    return {
      landUseRow: 'Outside mapped CLUP land-use polygons (Lasam 2020)',
      zoningComplianceRow: 'Unclassified / Unzoned — Verify designated land-use with Lasam MPDO.',
      isAgriConflict: false,
    }
  }

  const rawLabel = String(match.properties?.land_use_label ?? '').trim()
  const rawClass = String(match.properties?.land_use_class ?? '').toLowerCase().trim()
  const isAgri =
    rawClass === 'agriculture' ||
    rawClass === 'crops' ||
    rawLabel.toLowerCase().includes('agri') ||
    rawLabel.toLowerCase().includes('crop')

  const isResidentialZone =
    rawClass === 'residential' ||
    rawClass === 'socialized_housing' ||
    rawLabel.toLowerCase().includes('residential') ||
    rawLabel.toLowerCase().includes('socialized housing')

  const isCommercialZone =
    rawClass === 'commercial' || rawLabel.toLowerCase().includes('commercial')
  const isIndustrialZone =
    rawClass === 'industrial' ||
    rawClass === 'agri_industrial' ||
    rawLabel.toLowerCase().includes('industrial')

  const isForestZone = rawClass === 'forest' || rawLabel.toLowerCase().includes('forest')
  const isWaterZone =
    rawClass === 'water' ||
    rawLabel.toLowerCase().includes('lake') ||
    rawLabel.toLowerCase().includes('river') ||
    rawLabel.toLowerCase().includes('creek')

  const isAgriStructure = buildingType === 'Agricultural structure (barn, poultry shed)'
  const isFarm = category === 'farm_lot'

  // Query NPAAAD
  const npaaadMatch = getNpaaadAtPoint(coords, npaaadCollection)
  const isNpaaadProtected = Boolean(npaaadMatch)
  const npaaadLabel = npaaadMatch?.properties?.label ?? npaaadMatch?.properties?.description ?? ''

  if (isAgri) {
    if (isFarm) {
      return {
        landUseRow: '✅ Agriculture (CLUP 2020) — Designated for agricultural production & farming.',
        zoningComplianceRow:
          '✅ Conforming — Proposed farm lot directly aligns with designated agricultural land-use policy.',
        isAgriConflict: false,
      }
    }
    if (isAgriStructure) {
      return {
        landUseRow: '✅ Agriculture (CLUP 2020) — Agricultural production & farming zone.',
        zoningComplianceRow:
          '✅ Permitted Ancillary — Agricultural structures (barn, poultry shed, dryer) are permitted in agricultural zones.',
        isAgriConflict: false,
      }
    }

    // Proposed is Residential, Commercial, Industrial, Institutional, etc. on Agricultural land
    if (isNpaaadProtected) {
      return {
        landUseRow: `🚫 Agricultural Land (CLUP 2020) — Classified for agricultural production. Non-conforming for ${buildingType.toLowerCase()}.`,
        zoningComplianceRow: `🚫 Prohibited / Prime Protected Farmland — Sited on designated Agricultural land within NPAAAD (${npaaadLabel || 'irrigated farmland'}). Under RA 8435 (AFMA Sec. 9), conversion of prime agricultural land is non-negotiable / prohibited.`,
        isAgriConflict: true,
      }
    }

    return {
      landUseRow: `🚫 Agricultural Land (CLUP 2020) — Officially classified for Agriculture. Not zoned for residential / urban construction.`,
      zoningComplianceRow: `🚫 Non-Conforming / Agricultural Land — Site is classified as Agricultural Land. Constructing a ${buildingType} requires formal DAR Land-Use Conversion Clearance (DAR AO 1-2019) and Sangguniang Bayan Reclassification Ordinance (RA 7160 Sec. 20) before building permits can be lawfully issued.`,
      isAgriConflict: true,
    }
  }

  if (isResidentialZone) {
    if (isFarm) {
      return {
        landUseRow: 'Residential (CLUP 2020) — Designated for residential settlement.',
        zoningComplianceRow:
          '⚠️ Conditional — Farm lot inside residential zone; commercial cultivation subject to urban residential zoning restrictions.',
        isAgriConflict: false,
      }
    }
    return {
      landUseRow: '✅ Residential (CLUP 2020) — Designated for residential settlement.',
      zoningComplianceRow: `✅ Conforming — Proposed ${buildingType} is fully conforming with Lasam CLUP Residential zoning.`,
      isAgriConflict: false,
    }
  }

  if (isCommercialZone) {
    return {
      landUseRow: 'Commercial (CLUP 2020) — Designated for commercial and business enterprises.',
      zoningComplianceRow:
        category === 'farm_lot'
          ? '⚠️ Conditional — Farm lot inside commercial zone requires zoning clearance.'
          : `Locational Clearance Required — Proposed ${buildingType} subject to commercial zone regulations.`,
      isAgriConflict: false,
    }
  }

  if (isIndustrialZone) {
    return {
      landUseRow: 'Agri-Industrial (CLUP 2020) — Designated for agricultural processing and light industrial.',
      zoningComplianceRow: `Locational Clearance Required — Proposed ${buildingType} subject to industrial zone regulations.`,
      isAgriConflict: false,
    }
  }

  if (isForestZone) {
    return {
      landUseRow: '🚫 Forest Conservation (CLUP 2020) — Protected forest & watershed.',
      zoningComplianceRow:
        '🚫 Prohibited — Urban and residential development strictly prohibited in forest protection zones without DENR permit.',
      isAgriConflict: false,
    }
  }

  if (isWaterZone) {
    return {
      landUseRow: '🚫 Water Body (CLUP 2020) — Lakes, rivers, and natural drainage channels.',
      zoningComplianceRow:
        '🚫 Prohibited — Construction within open water bodies strictly prohibited under PD 1067.',
      isAgriConflict: false,
    }
  }

  const normalized =
    formatLandUseClass(match.properties?.land_use_class as Parameters<typeof formatLandUseClass>[0]) ||
    rawLabel
  return {
    landUseRow: normalized,
    zoningComplianceRow: `Locational Clearance Required — Verify permitted uses for ${normalized} with Lasam MPDO.`,
    isAgriConflict: false,
  }
}

function formatNpaaad(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
  isLasam: boolean,
  muni: string,
  isAgriConflict = false,
): string {
  if (!isLasam) {
    return `Unsurveyed / Data Gap — DA agricultural protection boundary is clipped to Lasam. ${muni} data pending.`
  }
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getNpaaadAtPoint(coords, collection)
  if (!match) return 'Outside mapped NPAAAD boundaries (Lasam 2022)'

  const code = String(match.properties?.code ?? '').trim()
  const label = String(match.properties?.label ?? match.properties?.description ?? code).trim()
  const zoneDesc = code ? `${code} (${label})` : label

  if (isAgriConflict) {
    return `⚠️ Prime Protected Farmland (AFMA) — ${zoneDesc}. Farmland conversion is non-negotiable / strictly restricted under RA 8435.`
  }

  return zoneDesc
}

function formatSafdz(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
  isLasam: boolean,
  muni: string,
): string {
  if (!isLasam) {
    return `Unsurveyed / Data Gap — SAFDZ strategic fishery/agri layer is clipped to Lasam. ${muni} data pending.`
  }
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getSafdzAtPoint(coords, collection)
  if (!match) return 'Outside mapped SAFDZ boundaries (Lasam 2022)'

  const code = String(match.properties?.code ?? '').trim()
  const label = String(match.properties?.label ?? match.properties?.description ?? code).trim()
  return code ? `Zone ${code} — ${label}` : label
}

