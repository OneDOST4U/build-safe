import type { FeatureCollection } from 'geojson'
import { assessSeismic } from '@/lib/assessment/seismic'
import { assessVolcanic } from '@/lib/assessment/volcanic'
import { assessHydromet } from '@/lib/assessment/hydromet'
import { assessLgu } from '@/lib/assessment/lgu'
import { assessFacilities } from '@/lib/assessment/facilities'
import type { SiteAssessmentInput, SiteAssessmentResult } from '@/types'

export interface AssessSiteContext {
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
}

export function assessSite(
  input: SiteAssessmentInput,
  ctx: AssessSiteContext,
): SiteAssessmentResult {
  const coords: [number, number] = [input.lng, input.lat]

  return {
    input,
    assessedAt: new Date().toISOString(),
    seismic: assessSeismic(coords, ctx.faults),
    volcanic: assessVolcanic(coords, ctx.volcanoes),
    hydromet: assessHydromet(coords, ctx.mgbFlood),
    lgu: assessLgu(coords, {
      lguFlood: ctx.lguFlood,
      liquefaction: ctx.liquefaction,
      erosion: ctx.erosion,
      landUse: ctx.landUse,
      npaaad: ctx.npaaad,
      safdz: ctx.safdz,
    }),
    facilities: assessFacilities(coords, ctx.facilities),
  }
}

export { isWithinLasamBbox, LASAM_ASSESS_BBOX } from '@/lib/assessment/format'
