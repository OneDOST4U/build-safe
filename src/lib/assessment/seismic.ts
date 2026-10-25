import type { FeatureCollection } from 'geojson'
import { getNearestFaultSegment } from '@/lib/simulation/fault'
import {
  bearingToDirection,
  COAST_REFERENCE,
  formatApproxDistanceKm,
} from '@/lib/assessment/format'
import type { AssessmentRow } from '@/types'
import distance from '@turf/distance'
import { point } from '@turf/turf'

function intensityFromFaultDistanceKm(distKm: number): string {
  // Demo regional M6.5 on nearest fault — approximate MMI at site
  const intensity = 6.5 - distKm * 0.08
  if (intensity >= 8) return 'Prone; Intensity VIII'
  if (intensity >= 7) return 'Prone; Intensity VII'
  if (intensity >= 6) return 'Prone; Intensity VI'
  if (intensity >= 5) return 'Prone; Intensity V'
  return 'Prone; Intensity IV'
}

export function assessSeismic(
  coords: [number, number],
  faults: FeatureCollection | null,
): AssessmentRow[] {
  const nearest = getNearestFaultSegment(coords, faults, 'Active')
  const nearestAny = nearest ?? getNearestFaultSegment(coords, faults)

  let nearestFaultText = 'No active fault data within assessment extent'
  let groundRupture = 'Data Gap — Fault catalog unavailable'
  let groundShaking = 'Temporarily Unavailable'

  if (nearestAny) {
    // Bearing from fault toward site ≈ opposite of site→fault for "X of Fault" wording
    const brgFromFaultToSite = (nearestAny.bearing + 180) % 360
    const direction = bearingToDirection(brgFromFaultToSite)
    nearestFaultText = formatApproxDistanceKm(
      nearestAny.distanceKm,
      direction,
      nearestAny.faultName,
    )
    groundRupture =
      nearestAny.distanceM < 250
        ? 'Prone (Within 250 m buffer of mapped active fault)'
        : 'Safe (>250 m buffer from cataloged active fault trace)'
    groundShaking = intensityFromFaultDistanceKm(nearestAny.distanceKm)
  }

  const coastKm = distance(point(coords), point(COAST_REFERENCE), { units: 'kilometers' })
  const tsunami =
    coastKm > 25
      ? `Safe / Inland (${coastKm.toFixed(1)} km from Babuyan coast)`
      : `Prone (${coastKm.toFixed(1)} km from coast)`

  return [
    { label: 'Nearest Active Fault', value: nearestFaultText },
    { label: 'Ground Rupture', value: groundRupture },
    { label: 'Ground Shaking', value: groundShaking },
    { label: 'Earthquake-Induced Landslide', value: 'Data Gap — MGB slope instability model required' },
    { label: 'Tsunami', value: tsunami },
  ]
}
