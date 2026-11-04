import distance from '@turf/distance'
import { point } from '@turf/turf'
import type { Feature, FeatureCollection, LineString, MultiLineString, Point } from 'geojson'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { formatFacilityDistance } from '@/lib/assessment/format'
import type { AssessmentRow } from '@/types'

export type FacilityCategory =
  | 'emergency_response'
  | 'hospital'
  | 'pharmacy'
  | 'hardware_supply'
  | 'govt_office'
  | 'public_school'
  | 'primary_road'

const CATEGORY_LABELS: Record<FacilityCategory, string> = {
  emergency_response: 'Nearest Emergency / Disaster Facility (MDRRM)',
  hospital: 'Nearest Hospital (LDH)',
  pharmacy: 'Nearest Pharmacy / Medical Supply',
  hardware_supply: 'Nearest Hardware Supply',
  govt_office: 'Nearest Government Office (LGU)',
  public_school: 'Nearest Public Educational Facility',
  primary_road: 'Nearest Primary Road Network',
}

function facilityName(props: Record<string, unknown> | null | undefined): string {
  if (!props) return 'Unnamed'
  return String(props.name ?? props.highway ?? 'Unnamed facility')
}

function nearestInCategory(
  site: [number, number],
  facilities: FeatureCollection | null,
  category: FacilityCategory,
): { name: string; distanceM: number; coords: [number, number] } | null {
  if (!facilities?.features?.length) return null

  const from = point(site)
  let best: { name: string; distanceM: number; coords: [number, number] } | null = null

  for (const f of facilities.features) {
    if (!f.geometry) continue
    const fCat = String(f.properties?.category ?? '')

    let matches = false
    if (fCat === category) {
      matches = true
    } else if (category === 'hospital' && (fCat === 'hospital' || fCat === 'govt_health')) {
      const name = String(f.properties?.name ?? '').toLowerCase()
      if (name.includes('hospital') || fCat === 'hospital') matches = true
    } else if (category === 'emergency_response' && (fCat === 'emergency_response' || fCat === 'evacuation_site')) {
      matches = true
    } else if (category === 'govt_office' && (fCat === 'govt_office' || fCat === 'lgu_office')) {
      matches = true
    } else if (category === 'pharmacy' && (fCat === 'pharmacy' || fCat === 'medical_supply')) {
      matches = true
    } else if (category === 'hardware_supply' && (fCat === 'hardware_supply' || fCat === 'hardware')) {
      matches = true
    }

    if (!matches) continue

    let distM: number
    let targetCoords: [number, number]
    if (f.geometry.type === 'Point') {
      distM = distance(from, f as Feature<Point>, { units: 'meters' })
      targetCoords = [f.geometry.coordinates[0], f.geometry.coordinates[1]]
    } else if (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString') {
      const nearest = nearestPointOnLine(f as Feature<LineString | MultiLineString>, from)
      distM = distance(from, nearest, { units: 'meters' })
      targetCoords = [nearest.geometry.coordinates[0], nearest.geometry.coordinates[1]]
    } else {
      continue
    }

    const name = facilityName(f.properties as Record<string, unknown>)
    if (!best || distM < best.distanceM) {
      best = { name, distanceM: distM, coords: targetCoords }
    }
  }

  return best
}

export function assessFacilities(
  coords: [number, number],
  facilities: FeatureCollection | null,
): AssessmentRow[] {
  const order: FacilityCategory[] = [
    'emergency_response',
    'hospital',
    'pharmacy',
    'hardware_supply',
    'govt_office',
    'public_school',
    'primary_road',
  ]

  const rows: AssessmentRow[] = []

  for (const category of order) {
    const nearest = nearestInCategory(coords, facilities, category)
    if (!nearest) continue

    rows.push({
      label: CATEGORY_LABELS[category],
      value: formatFacilityDistance(
        nearest.name,
        nearest.distanceM,
        category === 'primary_road',
      ),
      facilityName: nearest.name,
      facilityCoords: nearest.coords,
      facilityDistanceM: nearest.distanceM,
      category,
    })
  }

  if (rows.length === 0) {
    return [
      {
        label: 'Nearby Critical Facilities',
        value: 'No validated facility data within assessment radius',
      },
    ]
  }

  return rows
}
