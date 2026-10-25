import type { FeatureCollection, Feature, LineString, MultiLineString, Polygon, MultiPolygon } from 'geojson'
import { point } from '@turf/turf'
import distance from '@turf/distance'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'

export interface WaterBodyCheckResult {
  status: 'IN_WATER_BODY' | 'WITHIN_EASEMENT' | 'CLEAR'
  isWaterBody: boolean
  isWithinEasement: boolean
  nearestDistanceM: number | null
  nearestWaterBodyName: string | null
  nearestWaterBodyType: string | null
  advisory: string
  legalNotice: string
}

/**
 * Checks if a coordinate [lng, lat] falls directly in a water body or within mandatory riparian easements
 * pursuant to Article 51 of Presidential Decree No. 1067 (Water Code of the Philippines)
 * and PD 1096 (National Building Code of the Philippines).
 */
export function checkWaterBodyProximity(
  coords: [number, number],
  hydrology: {
    riversMain?: FeatureCollection | null
    riversTributaries?: FeatureCollection | null
    riverbanks?: FeatureCollection | null
    drainage?: FeatureCollection | null
  },
): WaterBodyCheckResult {
  const pt = point(coords)
  let isInRiverbank = false
  let nearestDistM: number = Infinity
  let nearestName: string = 'Waterway'
  let nearestType: string = 'River / Stream'

  // 1. Check if inside any riverbanks polygon
  if (hydrology.riverbanks?.features) {
    for (const feat of hydrology.riverbanks.features) {
      if (feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
        try {
          if (booleanPointInPolygon(pt, feat as Feature<Polygon | MultiPolygon>)) {
            isInRiverbank = true
            nearestDistM = 0
            nearestName = String(feat.properties?.name ?? 'River Bank / Riverbed')
            nearestType = 'Riverbed / Riverbank'
            break
          }
        } catch {
          // ignore geometry errors
        }
      }
    }
  }

  // 2. Measure distance to river and drainage lines
  const lineCollections: { fc?: FeatureCollection | null; defaultType: string }[] = [
    { fc: hydrology.riversMain, defaultType: 'Main River' },
    { fc: hydrology.riversTributaries, defaultType: 'Tributary Creek' },
    { fc: hydrology.drainage, defaultType: 'Drainage Channel' },
  ]

  for (const { fc, defaultType } of lineCollections) {
    if (!fc?.features) continue
    for (const feat of fc.features) {
      if (!feat.geometry) continue
      const gType = feat.geometry.type
      if (gType === 'LineString' || gType === 'MultiLineString') {
        try {
          const snapped = nearestPointOnLine(feat as Feature<LineString | MultiLineString>, pt, {
            units: 'meters',
          })
          const d = snapped.properties?.dist ?? distance(pt, snapped, { units: 'meters' })
          if (d < nearestDistM) {
            nearestDistM = d
            const pName = feat.properties?.name
            nearestName = pName && pName !== 'river' ? String(pName) : defaultType
            nearestType = String(feat.properties?.waterway ?? defaultType)
          }
        } catch {
          // ignore line snapping errors
        }
      }
    }
  }

  const roundedDist = Number.isFinite(nearestDistM) ? Math.round(nearestDistM) : null

  // If inside riverbank polygon or within 12 meters of waterway center line:
  if (isInRiverbank || (roundedDist !== null && roundedDist <= 12)) {
    return {
      status: 'IN_WATER_BODY',
      isWaterBody: true,
      isWithinEasement: true,
      nearestDistanceM: roundedDist,
      nearestWaterBodyName: nearestName,
      nearestWaterBodyType: nearestType,
      advisory: `Prohibited No-Build Zone — Point is directly within ${nearestName}. Construction of structures is unlawful under PD 1067.`,
      legalNotice:
        'Presidential Decree No. 1067 (Water Code of the Philippines, Art. 51): Building structures in active riverbeds or waterways is strictly prohibited.',
    }
  }

  // If within 40m legal riparian easement zone (3m urban, 20m agri, 40m forest):
  if (roundedDist !== null && roundedDist <= 40) {
    const easementCategory =
      roundedDist <= 3 ? 'Urban (3m)' : roundedDist <= 20 ? 'Agricultural (20m)' : 'Forest / Protected (40m)'

    return {
      status: 'WITHIN_EASEMENT',
      isWaterBody: false,
      isWithinEasement: true,
      nearestDistanceM: roundedDist,
      nearestWaterBodyName: nearestName,
      nearestWaterBodyType: nearestType,
      advisory: `Riparian Easement Buffer (${roundedDist} m from ${nearestName}) — Within mandatory ${easementCategory} public easement buffer under PD 1067.`,
      legalNotice:
        'Article 51 of PD 1067 reserves mandatory easements along river margins (3m urban, 20m agricultural, 40m forest) for public use and environmental protection. Building permits cannot be issued within this buffer.',
    }
  }

  return {
    status: 'CLEAR',
    isWaterBody: false,
    isWithinEasement: false,
    nearestDistanceM: roundedDist,
    nearestWaterBodyName: nearestName,
    nearestWaterBodyType: nearestType,
    advisory: `Clear of water bodies (${roundedDist != null ? `${roundedDist} m to nearest waterway` : 'No immediate water body detected'}).`,
    legalNotice: 'Compliant with statutory riparian setback guidelines.',
  }
}
