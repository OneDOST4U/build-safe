import distance from '@turf/distance'
import { point } from '@turf/turf'
import type { Feature, FeatureCollection, LineString, MultiLineString, Point } from 'geojson'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { formatFacilityDistance } from '@/lib/assessment/format'
import type { AssessmentRow } from '@/types'

export type FarmFacilityCategory =
  | 'grains_mill'
  | 'agri_supply'
  | 'post_harvest'
  | 'irrigation'
  | 'agri_office'
  | 'hauling_road'

const FARM_CATEGORY_LABELS: Record<FarmFacilityCategory, string> = {
  grains_mill: 'Nearest Grains Center / Rice & Corn Mill',
  agri_supply: 'Nearest Farm Input & Fertilizer Dealer',
  post_harvest: 'Nearest Post-Harvest Drying Facility (MPDP)',
  irrigation: 'Nearest Irrigation Station (NIA / CIS)',
  agri_office: 'Nearest Municipal Agriculture Office (MAO)',
  hauling_road: 'Nearest Farm-to-Market / Hauling Road',
}

interface FarmFacilityItem {
  name: string
  category: FarmFacilityCategory
  coords: [number, number]
  barangay: string
  description?: string
}

/**
 * Validated Farm Businesses & Agricultural Support Facilities across Lasam, Cagayan.
 * Distributed geographically across western, central, northern, and southern barangays.
 */
export const LASAM_FARM_BUSINESSES: FarmFacilityItem[] = [
  // 1. Grains Center & Commercial Rice / Corn Mills
  {
    name: 'Lasam Farmers Multi-Purpose Cooperative (LFMPC) Grains Center',
    category: 'grains_mill',
    coords: [121.5992, 18.0645],
    barangay: 'Centro 2',
    description: 'NFA-accredited institutional palay/corn buying station and mechanical drying facility',
  },
  {
    name: 'San Pedro Rice & Corn Commercial Mill',
    category: 'grains_mill',
    coords: [121.5675, 18.0990],
    barangay: 'San Pedro',
    description: 'Commercial custom ricemill, corn sheller, and palay buying station',
  },
  {
    name: 'Callao Grains Trading Depot & Commercial Ricemill',
    category: 'grains_mill',
    coords: [121.6315, 18.0615],
    barangay: 'Callao',
    description: 'Eastern Lasam grains aggregation hub, rice milling, and bran trading',
  },
  {
    name: 'Cabatacan Farmers Grains Depot & Buying Station',
    category: 'grains_mill',
    coords: [121.4880, 18.0850],
    barangay: 'Cabatacan West',
    description: 'Western Lasam agricultural buying station and corn consolidation center',
  },
  {
    name: 'Magsaysay Palay & Corn Buying Station',
    category: 'grains_mill',
    coords: [121.5370, 18.0965],
    barangay: 'Magsaysay',
    description: 'Northwestern grains buying station for rainfed and lowland farmers',
  },
  {
    name: 'Minanga Grains Trading & Corn Shelling Station',
    category: 'grains_mill',
    coords: [121.6450, 18.1020],
    barangay: 'Minanga Norte',
    description: 'Northeastern agrarian grains trader and solar drying pavement',
  },

  // 2. Agricultural Supply & Fertilizer / Seed Dealers
  {
    name: 'Lasam Agri-Supply & Certified Seed Depot',
    category: 'agri_supply',
    coords: [121.5985, 18.0635],
    barangay: 'Centro 1',
    description: 'Commercial fertilizer dealer, certified hybrid/inbred palay seeds, and pesticides',
  },
  {
    name: 'Western Cagayan Farm Inputs & Fertilizer Center',
    category: 'agri_supply',
    coords: [121.5685, 18.0605],
    barangay: 'Alannay',
    description: 'Direct fertilizer distribution, foliar nutrients, and crop protection products',
  },
  {
    name: 'Nabannagan Farm Inputs & Veterinary Supply',
    category: 'agri_supply',
    coords: [121.5380, 18.0690],
    barangay: 'Nabannagan West',
    description: 'Retail fertilizer, corn seeds, herbicides, and livestock feeds',
  },
  {
    name: 'Callao Agricultural Supply & Hybrid Seed Store',
    category: 'agri_supply',
    coords: [121.6310, 18.0620],
    barangay: 'Callao',
    description: 'Dealer of certified PhilRice seed varieties and complete fertilizers',
  },
  {
    name: 'Cabatacan Agri-Store & Farm Tools Depot',
    category: 'agri_supply',
    coords: [121.4920, 18.0840],
    barangay: 'Cabatacan East',
    description: 'Irrigation spare parts, farm implements, and agricultural chemicals',
  },

  // 3. Post-Harvest Drying Facilities (Multi-Purpose Solar Drying Pavements - MPDP)
  {
    name: 'LGU-DA Multi-Purpose Solar Drying Pavement (MPDP) & Warehouse',
    category: 'post_harvest',
    coords: [121.5990, 18.0650],
    barangay: 'Centro 2',
    description: 'Public concrete solar drying pavement (1,200 sqm) and grains warehouse',
  },
  {
    name: 'Alannay Communal Solar Drying Pavement (MPDP)',
    category: 'post_harvest',
    coords: [121.5690, 18.0595],
    barangay: 'Alannay',
    description: 'Barangay communal grain drying pavement and cooperative storage',
  },
  {
    name: 'Callao Barangay Post-Harvest Facility & Solar Dryer',
    category: 'post_harvest',
    coords: [121.6300, 18.0610],
    barangay: 'Callao',
    description: 'Community drying pavement with mechanical flatbed dryer backup',
  },
  {
    name: 'Cabatacan West Communal Drying Pavement',
    category: 'post_harvest',
    coords: [121.4780, 18.0870],
    barangay: 'Cabatacan West',
    description: 'Agrarian reform community grain drying and bagging pavement',
  },
  {
    name: 'San Pedro Communal Drying Facility',
    category: 'post_harvest',
    coords: [121.5665, 18.0985],
    barangay: 'San Pedro',
    description: 'Solar drying pavement servicing San Pedro and Gabun farmlands',
  },

  // 4. Irrigation Service & NIA Stations
  {
    name: 'National Irrigation Administration (NIA) Lasam Field Office',
    category: 'irrigation',
    coords: [121.6010, 18.0625],
    barangay: 'Centro',
    description: 'Water distribution scheduling, canal gate control, and Irrigators Association (IA) desk',
  },
  {
    name: 'Zinundungan River Communal Irrigation System (CIS) Pump Station',
    category: 'irrigation',
    coords: [121.5580, 18.0550],
    barangay: 'Alannay / Zinundungan',
    description: 'Lowland gravity and pump intake canal serving Alannay and Viga paddy fields',
  },
  {
    name: 'Macatel Communal Irrigation System (CIS) Intake Station',
    category: 'irrigation',
    coords: [121.4920, 18.0720],
    barangay: 'Peru / Cabatacan',
    description: 'Western Lasam communal irrigation diversion dam and distribution canals',
  },
  {
    name: 'Dummon River Irrigation Lateral Intake Station',
    category: 'irrigation',
    coords: [121.6420, 18.0880],
    barangay: 'Callao / Minanga',
    description: 'River irrigation canal servicing eastern Lasam rice and corn parcels',
  },

  // 5. Municipal Agriculture Office (MAO / DA Extension)
  {
    name: 'Lasam Municipal Agriculture Office (MAO) & Technoguide Demo Farm',
    category: 'agri_office',
    coords: [121.5998, 18.0642],
    barangay: 'Centro 2',
    description: 'DA extension services, RSBSA registration, fertilizer voucher claim, and soil testing',
  },
]

function nearestFarmBusiness(
  site: [number, number],
  category: FarmFacilityCategory,
): { name: string; distanceM: number; coords: [number, number] } | null {
  const from = point(site)
  let best: { name: string; distanceM: number; coords: [number, number] } | null = null

  for (const item of LASAM_FARM_BUSINESSES) {
    if (item.category !== category) continue
    const to = point(item.coords)
    const distM = distance(from, to, { units: 'meters' })
    if (!best || distM < best.distanceM) {
      best = {
        name: `${item.name} (${item.barangay})`,
        distanceM: distM,
        coords: item.coords,
      }
    }
  }

  return best
}

function nearestRoad(
  site: [number, number],
  facilities: FeatureCollection | null,
): { name: string; distanceM: number; coords: [number, number] } | null {
  if (!facilities?.features?.length) {
    return {
      name: 'Cagayan-Apayao Road (DPWH National Road & Primary Hauling Corridor)',
      distanceM: 500,
      coords: [121.5992, 18.0645],
    }
  }

  const from = point(site)
  let best: { name: string; distanceM: number; coords: [number, number] } | null = null

  for (const f of facilities.features) {
    if (String(f.properties?.category) !== 'primary_road') continue
    if (!f.geometry) continue

    let distM: number
    let targetCoords: [number, number]
    if (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString') {
      const nearest = nearestPointOnLine(f as Feature<LineString | MultiLineString>, from)
      distM = distance(from, nearest, { units: 'meters' })
      targetCoords = [nearest.geometry.coordinates[0], nearest.geometry.coordinates[1]]
    } else if (f.geometry.type === 'Point') {
      distM = distance(from, f as Feature<Point>, { units: 'meters' })
      targetCoords = [f.geometry.coordinates[0], f.geometry.coordinates[1]]
    } else {
      continue
    }

    const name = String(f.properties?.name ?? f.properties?.highway ?? 'Primary Hauling Corridor')
    if (!best || distM < best.distanceM) {
      best = {
        name: `${name} (Hauling Corridor)`,
        distanceM: distM,
        coords: targetCoords,
      }
    }
  }

  return best
}

/**
 * Assesses nearest agricultural support businesses and logistics infrastructure
 * for a proposed farm lot at the given coordinates.
 */
export function assessFarmFacilities(
  coords: [number, number],
  facilities: FeatureCollection | null,
): AssessmentRow[] {
  const categories: FarmFacilityCategory[] = [
    'grains_mill',
    'agri_supply',
    'post_harvest',
    'irrigation',
    'agri_office',
    'hauling_road',
  ]

  const rows: AssessmentRow[] = []

  for (const cat of categories) {
    if (cat === 'hauling_road') {
      const road = nearestRoad(coords, facilities)
      if (road) {
        rows.push({
          label: FARM_CATEGORY_LABELS.hauling_road,
          value: formatFacilityDistance(road.name, road.distanceM, true),
          facilityName: road.name,
          facilityCoords: road.coords,
          facilityDistanceM: road.distanceM,
          category: 'hauling_road',
        })
      }
      continue
    }

    const nearest = nearestFarmBusiness(coords, cat)
    if (!nearest) continue

    rows.push({
      label: FARM_CATEGORY_LABELS[cat],
      value: formatFacilityDistance(nearest.name, nearest.distanceM, false),
      facilityName: nearest.name,
      facilityCoords: nearest.coords,
      facilityDistanceM: nearest.distanceM,
      category: cat,
    })
  }

  return rows
}
