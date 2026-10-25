import distance from '@turf/distance'
import { point } from '@turf/turf'
import type { FeatureCollection } from 'geojson'
import { COAST_REFERENCE } from '@/lib/assessment/format'
import { identifyMunicipality } from '@/lib/assessment/coverage'
import { getMgbSusceptibilityAtPoint, MGB_FLOOD_LEGEND } from '@/lib/simulation/mgbFlood'
import { checkWaterBodyProximity } from '@/lib/assessment/waterBody'
import type { AssessmentRow } from '@/types'

/** PAGASA-style severe wind text for Cagayan Valley (demonstration copy). */
export const SEVERE_WIND_DEMO =
  '117.1 - 220 kph (20-year return period); 220.1 - 270 kph (500-year return period)'

export function assessHydromet(
  coords: [number, number],
  mgbFlood?: FeatureCollection | null,
  municipalityName?: string,
  hydrology?: {
    riversMain?: FeatureCollection | null
    riversTributaries?: FeatureCollection | null
    riverbanks?: FeatureCollection | null
    drainage?: FeatureCollection | null
  },
): AssessmentRow[] {
  const muni = municipalityName ?? identifyMunicipality(coords[0], coords[1])
  const isLasam = muni === 'Lasam'

  const coastKm = distance(point(coords), point(COAST_REFERENCE), { units: 'kilometers' })
  const stormSurge =
    coastKm > 15
      ? `Safe / Inland (${coastKm.toFixed(1)} km to Babuyan Channel coast)`
      : `Prone (${coastKm.toFixed(1)} km from coast)`

  const susc = getMgbSusceptibilityAtPoint(coords, mgbFlood)
  let floodValue: string

  if (!isLasam) {
    // Zero-hallucination rule: MGB flood data is currently clipped to Lasam
    floodValue = `Data Gap / Unsurveyed — MGB 1:10,000 flood susceptibility not yet ingested for ${muni}. Do NOT interpret as Safe.`
  } else if (!mgbFlood?.features?.length) {
    floodValue = 'Unavailable — run npm run fetch:flood to load MGB susceptibility'
  } else if (!susc) {
    floodValue = 'No flood susceptibility identified in DENR-MGB 1:10,000 survey (Lasam)'
  } else {
    const entry = MGB_FLOOD_LEGEND.find((e) => e.key === susc)
    floodValue = entry
      ? `${entry.label} — ${entry.description}`
      : susc
  }

  // Water body and riparian easement assessment (PD 1067 / NBCP)
  const waterCheck = checkWaterBodyProximity(coords, hydrology ?? {})
  let waterRowValue: string
  if (waterCheck.isWaterBody) {
    waterRowValue = `🚫 PROHIBITED: Inside ${waterCheck.nearestWaterBodyName}. Construction is unlawful under Presidential Decree No. 1067 (Water Code).`
  } else if (waterCheck.isWithinEasement) {
    waterRowValue = `⚠️ RESTRICTED: Within legal riparian easement (${waterCheck.nearestDistanceM}m from ${waterCheck.nearestWaterBodyName}). Building prohibited under PD 1067.`
  } else {
    waterRowValue = `Clear — ${waterCheck.nearestDistanceM != null ? `${waterCheck.nearestDistanceM} m from nearest waterway` : 'No immediate water body detected'}. Complies with riparian setbacks.`
  }

  return [
    { label: 'Water Body / Riparian (PD 1067)', value: waterRowValue },
    { label: 'Flood (MGB)', value: floodValue },
    { label: 'Storm Surge (PAGASA)', value: stormSurge },
    { label: 'Severe Wind (PAGASA)', value: `${SEVERE_WIND_DEMO} (Regional Cagayan)` },
  ]
}
