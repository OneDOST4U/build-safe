import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { ErosionClass, LandUseClass, LguFloodSusceptibility, LiquefactionSusceptibility } from '@/lib/simulation/lguHazards'

const SUSCEPTIBILITY_RANK: Record<LiquefactionSusceptibility | LguFloodSusceptibility, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  unknown: 0,
}

const EROSION_RANK: Record<ErosionClass, number> = {
  none: 1,
  slight: 2,
  moderate: 3,
  severe: 4,
  river: 0,
  unknown: 0,
}

function isAreaGeometry(
  feature: Feature,
): feature is Feature<Polygon | MultiPolygon> {
  return feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
}

function findMatchingFeatures(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): Feature[] {
  if (!collection?.features?.length) return []

  const matches: Feature[] = []
  for (const feature of collection.features) {
    if (!isAreaGeometry(feature)) continue
    try {
      if (booleanPointInPolygon(coords, feature)) {
        matches.push(feature)
      }
    } catch {
      // skip invalid geometry
    }
  }
  return matches
}

function pickHighestRank<T extends string>(
  matches: Feature[],
  property: string,
  rank: Record<T, number>,
): Feature | null {
  let best: Feature | null = null
  let bestRank = 0

  for (const feature of matches) {
    const key = feature.properties?.[property] as T | undefined
    if (!key || !(key in rank)) continue
    const value = rank[key]
    if (value > bestRank) {
      best = feature
      bestRank = value
    }
  }

  return best
}

export function getLguFloodAtPoint(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): Feature | null {
  return pickHighestRank(
    findMatchingFeatures(coords, collection),
    'susceptibility',
    SUSCEPTIBILITY_RANK,
  )
}

export function getLiquefactionAtPoint(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): Feature | null {
  return pickHighestRank(
    findMatchingFeatures(coords, collection),
    'susceptibility',
    SUSCEPTIBILITY_RANK,
  )
}

export function getErosionAtPoint(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): Feature | null {
  return pickHighestRank(findMatchingFeatures(coords, collection), 'erosion_class', EROSION_RANK)
}

export function getLandUseAtPoint(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): Feature | null {
  const matches = findMatchingFeatures(coords, collection)
  return matches[0] ?? null
}

export function formatLandUseClass(landUseClass: LandUseClass | undefined): string {
  switch (landUseClass) {
    case 'forest':
      return 'Forest Area'
    case 'residential':
      return 'Residential'
    case 'socialized_housing':
      return 'Socialized housing'
    case 'commercial':
      return 'Commercial'
    case 'agriculture':
    case 'crops':
      return 'Agriculture'
    case 'agri_industrial':
      return 'Agri-industrial'
    case 'institutional':
      return 'Institutional'
    case 'parks':
      return 'Parks & recreation'
    case 'eco_tourism':
      return 'Eco-tourism'
    case 'cemetery':
      return 'Cemetery'
    case 'infrastructure':
      return 'Infrastructure / utilities'
    case 'water':
      return 'Lakes / rivers'
    case 'road':
      return 'Road'
    default:
      return 'Unknown'
  }
}

export function getNpaaadAtPoint(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): Feature | null {
  const matches = findMatchingFeatures(coords, collection)
  return matches[0] ?? null
}

export function getSafdzAtPoint(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): Feature | null {
  const matches = findMatchingFeatures(coords, collection)
  return matches[0] ?? null
}


