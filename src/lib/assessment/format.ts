import type { FeatureCollection } from 'geojson'
import {
  CAGAYAN_REGIONAL_BBOX,
  isWithinRegionalCorridor,
  isPointInsideLasam,
} from '@/lib/assessment/coverage'

/** Compass direction labels and Hazard Hunter–style distance strings */

export function bearingToDirection(bearingDeg: number): string {
  const dirs = [
    'north',
    'northeast',
    'east',
    'southeast',
    'south',
    'southwest',
    'west',
    'northwest',
  ]
  const normalized = ((bearingDeg % 360) + 360) % 360
  const index = Math.round(normalized / 45) % 8
  return dirs[index]
}

export function formatApproxDistanceKm(distanceKm: number, direction: string, ofName: string): string {
  return `Approximately ${distanceKm.toFixed(1)} km ${direction} of ${ofName}`
}

/**
 * Estimated travel time by car in Lasam / Cagayan:
 * - Circuity factor: 1.30 (realistic road detour index for rural / semi-grid Philippine road network vs straight line)
 * - Average driving speeds:
 *   - Local town / barangay access (< 3 km road dist): 30 km/h (considers tricycles, pedestrian crossings, school zones, intersections)
 *   - Secondary / National Highway corridor (>= 3 km road dist): 45 km/h (Cagayan-Apayao Road / Manila North Road)
 * - Immediate road network access (isRoadNetwork): direct access distance at 30 km/h
 */
export function estimateCarTravelTime(
  distanceM: number,
  isRoadNetwork = false,
): {
  hours: number
  totalMinutes: number
  roadDistanceKm: number
  summary: string
} {
  const circuity = isRoadNetwork ? 1.0 : 1.30
  const roadDistanceKm = (distanceM * circuity) / 1000

  // Speed model (km/h) based on DPWH Region II rural municipality conditions
  const speedKmh = roadDistanceKm < 3 ? 30 : 45
  const hours = roadDistanceKm / speedKmh
  const totalMinutes = hours * 60

  let summary: string
  if (isRoadNetwork && distanceM < 100) {
    summary = '<0.01 hr by car [direct access]'
  } else if (hours < 0.01 || totalMinutes < 1) {
    summary = '<0.01 hr by car [<1 min drive]'
  } else if (hours < 0.1) {
    const mins = Math.max(1, Math.round(totalMinutes))
    summary = `~${hours.toFixed(2)} hr by car [~${mins} min${mins > 1 ? 's' : ''} drive]`
  } else if (hours < 1.0) {
    const mins = Math.round(totalMinutes)
    summary = `~${hours.toFixed(2)} hr by car [~${mins} mins drive]`
  } else {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    summary = `~${hours.toFixed(1)} hr${hours >= 1.5 ? 's' : ''} by car [~${h}h${m > 0 ? ` ${m}m` : ''} drive]`
  }

  return {
    hours,
    totalMinutes,
    roadDistanceKm,
    summary,
  }
}

export function formatFacilityDistance(
  name: string,
  distanceM: number,
  isRoadNetwork = false,
): string {
  const distStr = distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toFixed(1)} km`
  const travel = estimateCarTravelTime(distanceM, isRoadNetwork)
  return `${name} (${distStr} · ${travel.summary})`
}

/** Rough Lasam municipal bbox for focused Lasam queries */
export const LASAM_ASSESS_BBOX = {
  west: 121.40,
  east: 121.75,
  south: 18.0,
  north: 18.15,
} as const

export { CAGAYAN_REGIONAL_BBOX }

/** Aparri / Babuyan coast reference for tsunami & storm surge demo */
export const COAST_REFERENCE: [number, number] = [121.64, 18.35]

/** Check if coordinates are within the assessment coverage area (Lasam, Lal-lo, Northern Cagayan) */
export function isWithinAssessmentCoverage(lng: number, lat: number): boolean {
  return isWithinRegionalCorridor(lng, lat)
}

/** Check if coordinates are strictly within the official Lasam municipal boundary */
export function isWithinLasamBbox(
  lng: number,
  lat: number,
  boundary?: FeatureCollection | null,
): boolean {
  return isPointInsideLasam(lng, lat, boundary)
}

export { isPointInsideLasam }
