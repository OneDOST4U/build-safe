import type { FeatureCollection } from 'geojson'
import { getMgbSusceptibilityAtPoint, type MgbSusceptibility } from '@/lib/simulation/mgbFlood'
import {
  getErosionAtPoint,
  getLandUseAtPoint,
  getLguFloodAtPoint,
  getLiquefactionAtPoint,
  getNpaaadAtPoint,
  getSafdzAtPoint,
} from '@/lib/simulation/lguLayerQuery'
import { checkWaterBodyProximity } from '@/lib/assessment/waterBody'
import type { AssessmentRow } from '@/types'

export type AssessmentTargetCategory = 'building' | 'farm_lot'

export type FarmCropType =
  | 'Palay (Rice - Lowland / Irrigated)'
  | 'Corn (Yellow / White Maize)'
  | 'Root Crops (Cassava / Camote / Yam)'
  | 'Other Crops (Vegetables / Fruits / High-Value)'

export const DEFAULT_FARM_CROP: FarmCropType = 'Palay (Rice - Lowland / Irrigated)'

export const FARM_CROP_OPTIONS: {
  value: FarmCropType
  label: string
  shortName: string
  icon: string
  description: string
}[] = [
  {
    value: 'Palay (Rice - Lowland / Irrigated)',
    label: 'Palay (Rice - Lowland / Irrigated)',
    shortName: 'Palay',
    icon: '🌾',
    description:
      'Paddy rice; high water tolerance (withstands 5–7 days submergence); thrives on alluvial floodplains with assured irrigation.',
  },
  {
    value: 'Corn (Yellow / White Maize)',
    label: 'Corn (Yellow / White Maize)',
    shortName: 'Corn',
    icon: '🌽',
    description:
      'Grain crop; extremely intolerant to saturated waterlogging (>24h inundation causes root death); requires well-drained loam or dry-season planting.',
  },
  {
    value: 'Root Crops (Cassava / Camote / Yam)',
    label: 'Root Crops (Cassava / Camote / Yam)',
    shortName: 'Root Crops',
    icon: '🥔',
    description:
      'Tubers & storage roots; highly vulnerable to soil saturation and bacterial soft rot; requires elevated ridges or rolling well-drained terrain.',
  },
  {
    value: 'Other Crops (Vegetables / Fruits / High-Value)',
    label: 'Other Crops (Vegetables / Fruits / High-Value)',
    shortName: 'Other Crops',
    icon: '🥬',
    description:
      'Diversified farming: solanaceous vegetables, legumes, banana, or orchard fruit trees; vulnerable to typhoon winds and standing water.',
  },
]

export type CropSuitabilityLevel = 'HIGHLY_SUITABLE' | 'CONDITIONALLY_SUITABLE' | 'HIGH_RISK'

export interface CropSuitabilityInfo {
  level: CropSuitabilityLevel
  badge: string
  badgeClass: string
  color: string
  title: string
  summary: string
  cropLabel?: string
}

export interface FarmLotAssessmentResult {
  crop: FarmCropType
  suitability: CropSuitabilityInfo
  rows: AssessmentRow[]
}

export interface FarmLotAssessmentContext {
  boundary?: FeatureCollection | null
  landUse?: FeatureCollection | null
  mgbFlood?: FeatureCollection | null
  lguFlood?: FeatureCollection | null
  erosion?: FeatureCollection | null
  liquefaction?: FeatureCollection | null
  npaaad?: FeatureCollection | null
  safdz?: FeatureCollection | null
  riversMain?: FeatureCollection | null
  riversTributaries?: FeatureCollection | null
  riverbanks?: FeatureCollection | null
  drainage?: FeatureCollection | null
  municipalityName?: string
}

/**
 * Assesses agricultural hazard vulnerability and crop suitability
 * for a proposed farm lot at the given coordinates.
 */
export function assessFarmLot(
  coords: [number, number],
  crop: FarmCropType,
  ctx: FarmLotAssessmentContext,
): FarmLotAssessmentResult {
  // 1. Query Flood Hazard
  const mgbSusc: MgbSusceptibility | null = getMgbSusceptibilityAtPoint(coords, ctx.mgbFlood)
  const lguFloodFeat = getLguFloodAtPoint(coords, ctx.lguFlood)
  const lguSusc = lguFloodFeat?.properties?.susceptibility as string | undefined

  // Unified flood rank
  const isHighFlood =
    mgbSusc === 'very_high' ||
    mgbSusc === 'high' ||
    lguSusc === 'high' ||
    lguSusc === 'very_high'
  const isModFlood = mgbSusc === 'moderate' || lguSusc === 'moderate'

  // 2. Query Soil Erosion Hazard
  const erosionFeat = getErosionAtPoint(coords, ctx.erosion)
  const erosionClass = (erosionFeat?.properties?.erosion_class as string | undefined) ?? 'none'
  const isSevereErosion = erosionClass === 'severe'
  const isModErosion = erosionClass === 'moderate'

  // 3. Query Soil Liquefaction
  const liqFeat = getLiquefactionAtPoint(coords, ctx.liquefaction)
  const liqSusc = (liqFeat?.properties?.susceptibility as string | undefined) ?? 'low'

  // 4. Query Agricultural Protection Zones (DA-BSWM)
  const npaaadFeat = getNpaaadAtPoint(coords, ctx.npaaad)
  const safdzFeat = getSafdzAtPoint(coords, ctx.safdz)
  const isInPrimeAgriZone = Boolean(npaaadFeat || safdzFeat)
  const npaaadLabel = npaaadFeat?.properties?.label ?? npaaadFeat?.properties?.description
  const safdzLabel = safdzFeat?.properties?.label ?? safdzFeat?.properties?.description

  // 4b. Query CLUP Land Use Zone (Check Institutional and Water Zones)
  const landUseFeat = getLandUseAtPoint(coords, ctx.landUse)
  const luClass = String(landUseFeat?.properties?.land_use_class ?? '').toLowerCase().trim()
  const luLabel = String(landUseFeat?.properties?.land_use_label ?? '').toLowerCase().trim()
  const luRemarks = String(landUseFeat?.properties?.remarks ?? '').toLowerCase().trim()
  const isInstitutionalZone =
    luClass === 'institutional' ||
    luLabel.includes('institutional') ||
    luRemarks.includes('school') ||
    luRemarks.includes('afp camp')
  const isWaterLandUse =
    luClass === 'water' ||
    luLabel.includes('river') ||
    luLabel.includes('creek') ||
    luLabel.includes('water')

  // 5. Query Water Bodies & Statutory Agricultural Riparian Easement (20m under PD 1067)
  const waterCheck = checkWaterBodyProximity(coords, {
    riversMain: ctx.riversMain,
    riversTributaries: ctx.riversTributaries,
    riverbanks: ctx.riverbanks,
    drainage: ctx.drainage,
  })

  // Evaluate Crop-Specific Resilience
  let suitabilityLevel: CropSuitabilityLevel = 'HIGHLY_SUITABLE'
  let floodEvaluation = ''
  let erosionEvaluation = ''
  let managementRecommendation = ''

  if (waterCheck.isWaterBody || isWaterLandUse) {
    suitabilityLevel = 'HIGH_RISK'
    floodEvaluation = `🚫 Active Water Channel: Farm lot falls directly inside ${waterCheck.nearestWaterBodyName || 'water body'}. Establishing farm lots inside water bodies is strictly prohibited under PD 1067.`
  } else if (isInstitutionalZone) {
    suitabilityLevel = 'HIGH_RISK'
    floodEvaluation = '🚫 Institutional Zone: Parcel is designated for public, educational, and government facilities under Lasam CLUP (2020). Agricultural farm lots are strictly prohibited.'
  } else if (crop.startsWith('Palay')) {
    // Palay Evaluation
    if (isHighFlood) {
      suitabilityLevel = 'CONDITIONALLY_SUITABLE'
      floodEvaluation =
        '⚠️ High Floodplain Inundation Risk — Palay tolerates shallow standing water (5–15 cm) during vegetative growth, but prolonged complete submergence (>7 days) during typhoon season causes drowning and seedling mortality.'
      managementRecommendation =
        'Plant submergence-tolerant seed varieties (e.g. Submarino 1 / NSIC Rc194 with Sub1 gene). Coordinate planting calendar with NIA/LGU to harvest ahead of peak typhoon floods (Sept–Nov).'
    } else if (isModFlood) {
      suitabilityLevel = 'HIGHLY_SUITABLE'
      floodEvaluation =
        '✅ Favorable Lowland Inundation — Moderate flood moisture provides natural alluvium replenishment; well-suited for irrigated and rainfed lowland paddy crops.'
      managementRecommendation =
        'Maintain perimeter paddy bunds (pilapil) and surface spillways to manage standing water depths (keep at 5–10 cm during tillering).'
    } else {
      suitabilityLevel = 'HIGHLY_SUITABLE'
      floodEvaluation =
        '✅ Low Inundation Risk — Safe from destructive flash flooding. Requires dependable irrigation source (CIS, shallow tube wells, or canal distribution).'
      managementRecommendation =
        'Ensure continuous or alternate wetting and drying (AWD) water management to optimize grain fill and save irrigation water.'
    }
  } else if (crop.startsWith('Corn')) {
    // Corn Evaluation
    if (isHighFlood) {
      suitabilityLevel = 'HIGH_RISK'
      floodEvaluation =
        '🔴 CRITICAL WATERLOGGING RISK — Corn roots have zero tolerance for saturated soils. Standing water for >24–48 hours causes complete root asphyxiation, stunting, and total yield collapse.'
      managementRecommendation =
        'NOT recommended for wet season cultivation. Restrict planting exclusively to the dry season (November–April) after floodwaters fully drain, or rotate to lowland palay.'
    } else if (isModFlood) {
      suitabilityLevel = 'CONDITIONALLY_SUITABLE'
      floodEvaluation =
        '⚠️ Seasonal Saturation Risk — Moderate seasonal flood threat. Excess soil moisture during ear-filling stage significantly reduces kernel density and fosters ear rot.'
      managementRecommendation =
        'Plant on deep furrow ridges; dig perimeter interceptor ditches for rapid gravity runoff; target planting early in the season to harvest before heavy rains.'
    } else {
      suitabilityLevel = 'HIGHLY_SUITABLE'
      floodEvaluation =
        '✅ Prime Soil Drainage — Free from standing floodwater. Well-aerated sandy-loam conditions promote vigorous root exploration and high kernel yield.'
      managementRecommendation =
        'Apply balanced nitrogen-phosphorus fertilization and integrated pest management (IPM) for fall armyworm.'
    }
  } else if (crop.startsWith('Root Crops')) {
    // Root Crops Evaluation
    if (isHighFlood) {
      suitabilityLevel = 'HIGH_RISK'
      floodEvaluation =
        '🔴 HIGH TUBER ROT HAZARD — Cassava and camote storage roots rot rapidly in waterlogged soil due to bacterial soft rot (Erwinia) and Phytophthora root rot within 48–72 hours of saturation.'
      managementRecommendation =
        'Relocate root crop plots to elevated rolling slopes or construct high raised beds (minimum 40–50 cm). High flood plains are unsuitable for tuber storage.'
    } else if (isModFlood) {
      suitabilityLevel = 'CONDITIONALLY_SUITABLE'
      floodEvaluation =
        '⚠️ Moderate Tuber Rot Potential — Temporary ponding during monsoon storms may damage developing storage roots.'
      managementRecommendation =
        'Construct wide elevated mounds or ridges (30–40 cm) with free-draining channels to prevent water stagnating around tubers.'
    } else {
      suitabilityLevel = 'HIGHLY_SUITABLE'
      floodEvaluation =
        '✅ Favorable Soil Aeration — Free from waterlogging. Loose, well-drained soil structure allows uninhibited tuber expansion.'
      managementRecommendation =
        'Incorporate organic compost to enhance soil friability and maintain adequate potassium levels for tuber development.'
    }
  } else {
    // Other Crops (Vegetables, Fruits, High-Value)
    if (isHighFlood) {
      suitabilityLevel = 'CONDITIONALLY_SUITABLE'
      floodEvaluation =
        '⚠️ Severe Saturation & Typhoon Risk — Vegetables suffer damping-off and root rot in high flood zones. Orchard trees risk root uprooting during typhoon-induced flooding.'
      managementRecommendation =
        'Utilize protective rain shelters, high-raised plastic-mulched nursery beds, and flood-tolerant rootstocks. Focus production during dry season.'
    } else {
      suitabilityLevel = 'HIGHLY_SUITABLE'
      floodEvaluation =
        '✅ Favorable Agro-Climatic Conditions — Free from chronic standing water; suitable for high-value diversified cash cropping.'
      managementRecommendation =
        'Adopt drip irrigation, crop rotation, and windbreak hedgerows to protect against seasonal monsoon gusts.'
    }
  }

  // Factor in Soil Erosion
  if (isSevereErosion) {
    suitabilityLevel = 'HIGH_RISK'
    erosionEvaluation =
      '🔴 Severe Soil Erosion — High slope and steep gradient cause active topsoil stripping, rills, and loss of soil organic matter.'
    managementRecommendation +=
      ' Sloping Agricultural Land Technology (SALT-1) mandatory: establish double hedgerows of nitrogen-fixing trees (Desmodium / Flemingia) and vetiver grass along contour lines.'
  } else if (isModErosion) {
    if (suitabilityLevel === 'HIGHLY_SUITABLE') suitabilityLevel = 'CONDITIONALLY_SUITABLE'
    erosionEvaluation =
      '⚠️ Moderate Soil Erosion — Topsoil vulnerable to rainfall runoff and sheet erosion on unprotected surfaces.'
    managementRecommendation +=
      ' Practice contour plowing, cross-slope planting, and maintain permanent crop residue mulch to safeguard topsoil.'
  } else {
    erosionEvaluation =
      '✅ Low / Negligible Erosion — Stable flat-to-gently undulating terrain. Low risk of topsoil degradation.'
  }

  // Factor in Water Body Easement (20m statutory easement for agricultural land under PD 1067)
  let waterEasementEvaluation: string
  if (waterCheck.isWaterBody) {
    waterEasementEvaluation = `🚫 Inside Active Channel: Located in ${waterCheck.nearestWaterBodyName}. Unlawful to obstruct stream under PD 1067.`
  } else if (waterCheck.nearestDistanceM != null && waterCheck.nearestDistanceM <= 20) {
    if (suitabilityLevel === 'HIGHLY_SUITABLE') suitabilityLevel = 'CONDITIONALLY_SUITABLE'
    waterEasementEvaluation = `⚠️ Within 20m Agricultural Riparian Easement (${waterCheck.nearestDistanceM}m from ${waterCheck.nearestWaterBodyName}) — Under Art. 51 of PD 1067, a 20-meter riparian margin along riverbanks is reserved for stream bank stability. Maintain this zone as a permanent grass/bamboo vegetative buffer; avoid chemical pesticides and synthetic fertilizer application within 20m.`
  } else {
    waterEasementEvaluation = `✅ Compliant with Riparian Setbacks — Located ${waterCheck.nearestDistanceM != null ? `${waterCheck.nearestDistanceM}m` : '>20m'} from nearest waterway, outside the 20m statutory agricultural easement margin (PD 1067). Safe distance for sustainable irrigation intake.`
  }

  // Factor in Agricultural Zoning (NPAAAD / SAFDZ / CLUP Institutional & Water)
  let agriZoningEvaluation: string
  if (isInstitutionalZone) {
    agriZoningEvaluation =
      '🚫 Prohibited — Designated Institutional Land Use (Lasam CLUP 2020) for government & public educational facilities. Agricultural farm lots and crops are strictly prohibited here.'
  } else if (waterCheck.isWaterBody || isWaterLandUse) {
    agriZoningEvaluation = `🚫 Prohibited — Farm lot falls inside an active water body (${waterCheck.nearestWaterBodyName || 'water body'}). Cultivation and farming inside water bodies are strictly prohibited under Presidential Decree No. 1067.`
  } else if (isInPrimeAgriZone) {
    agriZoningEvaluation = `🟢 Prime Protected Agricultural Land (RA 8435 - AFMA) — Site is officially designated within ${
      npaaadLabel ? `NPAAAD (${npaaadLabel})` : ''
    }${npaaadLabel && safdzLabel ? ' and ' : ''}${
      safdzLabel ? `SAFDZ (${safdzLabel})` : ''
    }. Farmland preservation is legally prioritized; eligible for government agricultural subsidies, seed programs, and farm-to-market logistics.`
  } else {
    agriZoningEvaluation =
      'Agricultural / Rural Production Area — Unrestricted for farming under Lasam Comprehensive Land Use Plan (CLUP).'
  }

  // Construct Suitability Summary
  let suitabilityTitle = ''
  let badgeClass = ''
  let color = ''

  if (isInstitutionalZone) {
    suitabilityTitle = 'Prohibited: Institutional Zone (Lasam CLUP 2020)'
    badgeClass = 'bg-purple-100 text-purple-950 border-purple-300'
    color = '#7e22ce'
  } else if (waterCheck.isWaterBody || isWaterLandUse) {
    suitabilityTitle = 'Prohibited: Active Water Body (PD 1067)'
    badgeClass = 'bg-red-100 text-red-950 border-red-300'
    color = '#dc2626'
  } else if (suitabilityLevel === 'HIGHLY_SUITABLE') {
    suitabilityTitle = `Highly Suitable for ${crop.split(' ')[0]}`
    badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300'
    color = '#059669'
  } else if (suitabilityLevel === 'CONDITIONALLY_SUITABLE') {
    suitabilityTitle = `Conditionally Suitable for ${crop.split(' ')[0]} (Mitigation Needed)`
    badgeClass = 'bg-amber-100 text-amber-950 border-amber-300'
    color = '#d97706'
  } else {
    suitabilityTitle = `High Hazard Risk for ${crop.split(' ')[0]} (Not Recommended in Wet Season)`
    badgeClass = 'bg-red-100 text-red-950 border-red-300'
    color = '#dc2626'
  }

  const rows: AssessmentRow[] = [
    {
      label: 'Site Assessment Category',
      value: '🌾 Farm Lot / Agricultural Land-Use',
    },
    {
      label: 'Intended Crop Variety',
      value: crop,
    },
    {
      label: 'Agronomic Suitability Rating',
      value: `${suitabilityLevel === 'HIGHLY_SUITABLE' ? '🟢' : suitabilityLevel === 'CONDITIONALLY_SUITABLE' ? '🟡' : '🔴'} ${suitabilityTitle}`,
    },
    {
      label: 'Flood & Inundation Hazard',
      value: floodEvaluation,
    },
    {
      label: 'Soil Erosion & Slope Stability',
      value: erosionEvaluation,
    },
    {
      label: 'Agricultural Protection Zone (AFMA)',
      value: agriZoningEvaluation,
    },
    {
      label: 'Riparian Easement Margin (PD 1067)',
      value: waterEasementEvaluation,
    },
    {
      label: 'Soil Liquefaction Susceptibility',
      value:
        liqSusc === 'high'
          ? '⚠️ High Liquefaction — High ground saturation and loose silt; good for wetland palay, requires raised beds for dryland crops.'
          : 'Low / Stable Soil Saturation — Suitable soil compaction.',
    },
    {
      label: 'Recommended Agricultural Measures',
      value: managementRecommendation,
    },
  ]

  return {
    crop,
    suitability: {
      level: suitabilityLevel,
      badge: suitabilityLevel.replace('_', ' '),
      badgeClass,
      color,
      title: suitabilityTitle,
      summary: `${suitabilityTitle}. ${floodEvaluation} ${managementRecommendation}`,
      cropLabel: crop,
    },
    rows,
  }
}
