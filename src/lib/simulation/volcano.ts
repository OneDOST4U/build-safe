import circle from '@turf/circle'
import distance from '@turf/distance'
import { centroid, point } from '@turf/turf'
import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson'
import type { BuildingCollection } from '@/types'

/** Smithsonian GVP / PHIVOLCS-listed summit area — Gonzaga, Cagayan */
export const CAGUA_CENTER: [number, number] = [122.123, 18.222]
export const CAGUA_NAME = 'Cagua Volcano'
export const CAGUA_META = {
  municipality: 'Gonzaga',
  province: 'Cagayan',
  elevationM: 1133,
  volcanoType: 'Stratovolcano',
  lastEruption: '1860 CE (phreatic)',
  dataSource: 'PHIVOLCS / Smithsonian GVP (demonstration)',
} as const

/** Demo distance bands (km) — not official PHIVOLCS hazard zones */
export const VOLCANO_RING_KM = [10, 20, 30, 50] as const

export interface VolcanoBufferConfig {
  radiusKm: number
  label: string
  shortLabel: string
  severity: VolcanoExposure
  color: string
  strokeColor: string
  fillOpacity: number
  description: string
}

export const VOLCANO_BUFFERS_CONFIG: readonly VolcanoBufferConfig[] = [
  {
    radiusKm: 50,
    label: '50 km Regional Ashfall / Airspace Buffer',
    shortLabel: '50 km Outer',
    severity: 'low',
    color: '#ca8a04',
    strokeColor: '#eab308',
    fillOpacity: 0.07,
    description: 'Regional ash plume dispersion and airborne particle advisory margin. Lasam is ~53 km WSW.',
  },
  {
    radiusKm: 30,
    label: '30 km Moderate Danger Buffer',
    shortLabel: '30 km Buffer',
    severity: 'moderate',
    color: '#d97706',
    strokeColor: '#f59e0b',
    fillOpacity: 0.1,
    description: 'Syn-eruption lahar corridors and significant ashfall loading depending on prevailing wind.',
  },
  {
    radiusKm: 20,
    label: '20 km High Danger Buffer',
    shortLabel: '20 km Buffer',
    severity: 'high',
    color: '#ea580c',
    strokeColor: '#f97316',
    fillOpacity: 0.14,
    description: 'Heavy tephra fall and ballistic projectile envelope. High roof loading risk.',
  },
  {
    radiusKm: 10,
    label: '10 km Permanent Danger Zone (PDZ)',
    shortLabel: '10 km PDZ',
    severity: 'severe',
    color: '#dc2626',
    strokeColor: '#ef4444',
    fillOpacity: 0.2,
    description: 'Severe near-vent hazard (pyroclastic density currents, lava, ballistic bombs). Mandatory exclusion zone.',
  },
] as const

import type { VolcanoExposure } from '@/types'

export type { VolcanoExposure }

export const VOLCANO_COLORS: Record<VolcanoExposure, string> = {
  none: '#94a3b8',
  low: '#ca8a04',
  moderate: '#d97706',
  high: '#ea580c',
  severe: '#dc2626',
}

export function volcanoExposureFromDistanceKm(distKm: number): VolcanoExposure {
  if (distKm <= 10) return 'severe'
  if (distKm <= 20) return 'high'
  if (distKm <= 30) return 'moderate'
  if (distKm <= 50) return 'low'
  return 'none'
}

export function volcanoStatusLabel(exposure: VolcanoExposure): string {
  const labels: Record<VolcanoExposure, string> = {
    none: '> 50 km from Cagua (Safe from near-vent hazards)',
    low: '50 km Outer Buffer (Regional Ashfall Envelope)',
    moderate: '30 km Moderate Buffer (Lahar & Heavy Ash)',
    high: '20 km High Danger Buffer (Ballistic Projectiles)',
    severe: '10 km Permanent Danger Zone (Pyroclastic Flows)',
  }
  return labels[exposure]
}

export function getDistanceFromVolcanoKm(
  building: Feature<Polygon>,
  volcano: [number, number] = CAGUA_CENTER,
): number {
  const center = centroid(building)
  return Number(distance(volcano, center.geometry.coordinates, { units: 'kilometers' }).toFixed(2))
}

export function createVolcanoRings(
  center: [number, number] = CAGUA_CENTER,
): FeatureCollection {
  const features: Feature<Polygon>[] = VOLCANO_BUFFERS_CONFIG.map((cfg) => {
    const ring = circle(center, cfg.radiusKm, { units: 'kilometers', steps: 72 })
    ring.properties = {
      radius_km: cfg.radiusKm,
      label: cfg.label,
      shortLabel: cfg.shortLabel,
      severity: cfg.severity,
      color: cfg.color,
      strokeColor: cfg.strokeColor,
      fillOpacity: cfg.fillOpacity,
      description: cfg.description,
      name: `${CAGUA_NAME} ${cfg.radiusKm} km buffer`,
    }
    return ring
  })
  return { type: 'FeatureCollection', features }
}

export function createCaguaCorridorLine(
  center: [number, number] = CAGUA_CENTER,
  lasamTarget: [number, number] = [121.602, 18.067],
): Feature<LineString> {
  const distKm = Number(distance(point(center), point(lasamTarget), { units: 'kilometers' }).toFixed(1))
  return {
    type: 'Feature',
    properties: {
      name: `Cagua to Lasam Corridor (${distKm} km)`,
      distanceKm: distKm,
    },
    geometry: {
      type: 'LineString',
      coordinates: [center, lasamTarget],
    },
  }
}

export function createVolcanoPointFeature(
  center: [number, number] = CAGUA_CENTER,
): Feature<Point> {
  return {
    type: 'Feature',
    properties: {
      id: 'PHIVOLCS-CAGUA',
      name: CAGUA_NAME,
      ...CAGUA_META,
    },
    geometry: { type: 'Point', coordinates: center },
  }
}

/** Attach distance and demo exposure tier to each building. */
export function applyVolcanoDistances(
  buildings: BuildingCollection,
  volcano: [number, number] = CAGUA_CENTER,
): BuildingCollection {
  return {
    ...buildings,
    features: buildings.features.map((feature) => {
      const volcanoDistanceKm = getDistanceFromVolcanoKm(feature, volcano)
      const volcanoExposure = volcanoExposureFromDistanceKm(volcanoDistanceKm)

      return {
        ...feature,
        properties: {
          ...feature.properties,
          volcanoDistanceKm,
          volcanoExposure,
        },
      }
    }),
  }
}
