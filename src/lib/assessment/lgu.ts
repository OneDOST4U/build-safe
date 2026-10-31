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
  const rawRemarks = String(match.properties?.remarks ?? '').toLowerCase().trim()
  const isAgri =
    rawClass === 'agriculture' ||
    rawClass === 'crops' ||
    rawLabel.toLowerCase().includes('agri') ||
    rawLabel.toLowerCase().includes('crop')

  const isInstitutionalZone =
    rawClass === 'institutional' ||
    rawLabel.toLowerCase().includes('institutional') ||
    rawRemarks.includes('school') ||
    rawRemarks.includes('afp camp')

  const isParksZone =
    rawClass === 'parks' ||
    rawLabel.toLowerCase().includes('parks') ||
    rawLabel.toLowerCase().includes('recreation')

  const isCemeteryZone =
    rawClass === 'cemetery' ||
    rawLabel.toLowerCase().includes('cemetery') ||
    rawRemarks.includes('cemetery') ||
    rawRemarks.includes('memorial')

  const isResidentialZone =
    rawClass === 'residential' ||
    rawClass === 'socialized_housing' ||
    rawLabel.toLowerCase().includes('residential') ||
    rawLabel.toLowerCase().includes('socialized housing')

  const isCommercialZone =
    rawClass === 'commercial' || rawLabel.toLowerCase().includes('commercial')

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
      landUseRow: `🚫 Agricultural Land (CLUP 2020) — Officially classified for Agriculture.`,
      zoningComplianceRow: `🚫 Prohibited — Under Lasam CLUP (2020), building construction is strictly restricted to Residential and Commercial zones only. Constructing a ${buildingType} on agricultural land is prohibited.`,
      isAgriConflict: true,
    }
  }

  if (isResidentialZone) {
    if (isFarm) {
      return {
        landUseRow: '🚫 Residential (CLUP 2020) — Designated for residential settlement.',
        zoningComplianceRow:
          '🚫 Prohibited — Under Lasam CLUP (2020), agricultural farm lots and crop cultivation are strictly restricted to designated Agricultural areas only. Farming in residential areas is prohibited.',
        isAgriConflict: true,
      }
    }
    return {
      landUseRow: '✅ Residential (CLUP 2020) — Designated for residential settlement.',
      zoningComplianceRow: `✅ Conforming — Proposed ${buildingType} is fully conforming with Lasam CLUP Residential zoning.`,
      isAgriConflict: false,
    }
  }

  if (isCommercialZone) {
    if (category === 'farm_lot') {
      return {
        landUseRow: '🚫 Commercial (CLUP 2020) — Designated for commercial and business enterprises.',
        zoningComplianceRow:
          '🚫 Prohibited — Under Lasam CLUP (2020), agricultural farm lots and crop cultivation are strictly restricted to designated Agricultural areas only. Farming in commercial areas is prohibited.',
        isAgriConflict: true,
      }
    }
    return {
      landUseRow: '✅ Commercial (CLUP 2020) — Designated for commercial and business enterprises.',
      zoningComplianceRow: `✅ Conforming — Proposed ${buildingType} is conforming with Lasam CLUP Commercial zoning.`,
      isAgriConflict: false,
    }
  }

  if (isParksZone) {
    return {
      landUseRow: '🚫 Parks & Recreation (CLUP 2020) — Public open space and community recreational grounds.',
      zoningComplianceRow:
        '🚫 Prohibited — Construction of buildings and establishing farm lots are strictly prohibited in designated Parks & Recreation zones under Lasam CLUP.',
      isAgriConflict: true,
    }
  }

  if (isCemeteryZone) {
    return {
      landUseRow: '🚫 Cemetery (CLUP 2020) — Sacred burial and memorial grounds.',
      zoningComplianceRow:
        '🚫 Prohibited — Construction of buildings and farm lots is strictly prohibited in designated Cemetery grounds under Lasam CLUP and Sanitation Code.',
      isAgriConflict: true,
    }
  }

  if (isInstitutionalZone) {
    return {
      landUseRow:
        '🚫 Institutional (CLUP 2020) — Designated for government, educational, and public facilities.',
      zoningComplianceRow:
        '🚫 Prohibited — Private building development and farm lots are strictly prohibited in designated Institutional zones under Lasam CLUP.',
      isAgriConflict: true,
    }
  }

  if (isForestZone) {
    return {
      landUseRow: '🚫 Forest Conservation (CLUP 2020) — Protected forest & watershed.',
      zoningComplianceRow:
        '🚫 Prohibited — Urban and residential development strictly prohibited in forest protection zones without DENR permit.',
      isAgriConflict: true,
    }
  }

  if (isWaterZone) {
    return {
      landUseRow: '🚫 Water Body (CLUP 2020) — Lakes, rivers, and natural drainage channels.',
      zoningComplianceRow:
        '🚫 Prohibited — Construction of buildings and establishment of farm lots inside water bodies is strictly prohibited under PD 1067 (Water Code) & PD 1096.',
      isAgriConflict: true,
    }
  }

  const normalized =
    formatLandUseClass(match.properties?.land_use_class as Parameters<typeof formatLandUseClass>[0]) ||
    rawLabel

  if (category === 'building' && !isResidentialZone && !isCommercialZone) {
    return {
      landUseRow: `🚫 ${normalized} (CLUP 2020) — Non-residential / non-commercial land use.`,
      zoningComplianceRow: `🚫 Prohibited — Under Lasam CLUP (2020), building construction is strictly restricted to designated Residential and Commercial areas only.`,
      isAgriConflict: true,
    }
  }

  if (category === 'farm_lot' && !isAgri) {
    return {
      landUseRow: `🚫 ${normalized} (CLUP 2020) — Non-agricultural land use.`,
      zoningComplianceRow: `🚫 Prohibited — Under Lasam CLUP (2020), farm lots and crop cultivation are strictly permitted only in designated Agricultural areas. Farming on ${normalized.toLowerCase()} is prohibited.`,
      isAgriConflict: true,
    }
  }
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

