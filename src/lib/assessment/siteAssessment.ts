import type { FeatureCollection } from 'geojson'
import { assessSeismic } from '@/lib/assessment/seismic'
import { assessVolcanic } from '@/lib/assessment/volcanic'
import { assessHydromet } from '@/lib/assessment/hydromet'
import { assessLgu } from '@/lib/assessment/lgu'
import { assessFacilities } from '@/lib/assessment/facilities'
import type { SiteAssessmentInput, SiteAssessmentResult } from '@/types'

import { getSiteCoverageReport } from '@/lib/assessment/coverage'

export interface AssessSiteContext {
  boundary?: FeatureCollection | null
  faults: FeatureCollection | null
  volcanoes: FeatureCollection | null
  facilities: FeatureCollection | null
  mgbFlood?: FeatureCollection | null
  lguFlood?: FeatureCollection | null
  liquefaction?: FeatureCollection | null
  erosion?: FeatureCollection | null
  landUse?: FeatureCollection | null
  npaaad?: FeatureCollection | null
  safdz?: FeatureCollection | null
  riversMain?: FeatureCollection | null
  riversTributaries?: FeatureCollection | null
  riverbanks?: FeatureCollection | null
  drainage?: FeatureCollection | null
}

import { assessFarmLot, type FarmLotAssessmentResult } from '@/lib/assessment/farmLot'
import { assessFarmFacilities } from '@/lib/assessment/farmFacilities'

export function assessSite(
  input: SiteAssessmentInput,
  ctx: AssessSiteContext,
): SiteAssessmentResult {
  const coords: [number, number] = [input.lng, input.lat]
  const coverage = getSiteCoverageReport(input.lng, input.lat, ctx.boundary)

  const isFarmLot = input.category === 'farm_lot'
  let farmRes: FarmLotAssessmentResult | undefined
  if (isFarmLot) {
    farmRes = assessFarmLot(
      coords,
      input.cropType ?? 'Palay (Rice - Lowland / Irrigated)',
      {
        boundary: ctx.boundary,
        landUse: ctx.landUse,
        mgbFlood: ctx.mgbFlood,
        lguFlood: ctx.lguFlood,
        erosion: ctx.erosion,
        liquefaction: ctx.liquefaction,
        npaaad: ctx.npaaad,
        safdz: ctx.safdz,
        riversMain: ctx.riversMain,
        riversTributaries: ctx.riversTributaries,
        riverbanks: ctx.riverbanks,
        drainage: ctx.drainage,
        municipalityName: coverage.municipality,
      },
    )
  }

  return {
    input,
    assessedAt: new Date().toISOString(),
    coverage,
    farmAssessment: farmRes?.rows,
    cropSuitability: farmRes?.suitability,
    seismic: assessSeismic(coords, ctx.faults),
    volcanic: assessVolcanic(coords, ctx.volcanoes),
    hydromet: assessHydromet(coords, ctx.mgbFlood, coverage.municipality, {
      riversMain: ctx.riversMain,
      riversTributaries: ctx.riversTributaries,
      riverbanks: ctx.riverbanks,
      drainage: ctx.drainage,
    }),
    lgu: assessLgu(coords, {
      lguFlood: ctx.lguFlood,
      liquefaction: ctx.liquefaction,
      erosion: ctx.erosion,
      landUse: ctx.landUse,
      npaaad: ctx.npaaad,
      safdz: ctx.safdz,
      municipalityName: coverage.municipality,
      buildingType: input.buildingType,
      category: input.category,
    }),
    facilities: isFarmLot
      ? assessFarmFacilities(coords, ctx.facilities)
      : assessFacilities(coords, ctx.facilities),
  }
}

export {
  isWithinLasamBbox,
  isWithinAssessmentCoverage,
  isPointInsideLasam,
  LASAM_ASSESS_BBOX,
  CAGAYAN_REGIONAL_BBOX,
} from '@/lib/assessment/format'
