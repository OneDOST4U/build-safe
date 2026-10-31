/**
 * Convert LGU hazard shapefiles (UTM 51N) to WGS84 GeoJSON clipped to PSA Lasam boundary.
 *
 * Input:  HAZARDS LAYERS/Liquifacation_Lasam_2013.shp
 *         HAZARDS LAYERS/Land_Erosion_Lasam_2020.shp
 *         HAZARDS LAYERS/Flood_2020_Lasam.shp
 *         HAZARDS LAYERS/EXISTING_LAND_USE_LASAM_2020.shp
 * Output: public/data/hazards/lasam-liquefaction-2013.geojson
 *         public/data/hazards/lasam-erosion-2020.geojson
 *         public/data/hazards/lasam-flood-lgu-2020.geojson
 *         public/data/hazards/lasam-land-use-2020.geojson
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { open } from 'shapefile'
import proj4 from 'proj4'
import {
  booleanIntersects,
  featureCollection,
  intersect,
  multiPolygon,
  polygon,
} from '@turf/turf'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const inputDir = join(root, 'HAZARDS LAYERS')
const hazardsDir = join(root, 'public', 'data', 'hazards')
const boundaryPath = join(root, 'public', 'data', 'administrative', 'psa-lasam-boundary.geojson')

proj4.defs('EPSG:32651', '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs')

function reprojectCoord([x, y]) {
  const pt = Math.abs(x) <= 180 && Math.abs(y) <= 90 ? [x, y] : proj4('EPSG:32651', 'WGS84', [x, y])
  return [Number(pt[0].toFixed(5)), Number(pt[1].toFixed(5))]
}

function reprojectGeometry(geometry) {
  if (!geometry) return null
  if (geometry.type === 'Point') {
    return { type: 'Point', coordinates: reprojectCoord(geometry.coordinates) }
  }
  if (geometry.type === 'LineString') {
    return {
      type: 'LineString',
      coordinates: geometry.coordinates.map(reprojectCoord),
    }
  }
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map((ring) => ring.map(reprojectCoord)),
    }
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => ring.map(reprojectCoord)),
      ),
    }
  }
  return null
}

function asPolygonFeature(geom, props) {
  if (!geom) return null
  if (geom.type === 'Polygon') return polygon(geom.coordinates, props)
  if (geom.type === 'MultiPolygon') return multiPolygon(geom.coordinates, props)
  return null
}

function loadBoundaryPolygon() {
  if (!existsSync(boundaryPath)) {
    console.warn('PSA boundary missing — skipping clip:', boundaryPath)
    return null
  }
  const fc = JSON.parse(readFileSync(boundaryPath, 'utf8'))
  const feature = fc.features?.[0]
  if (!feature?.geometry) return null
  return asPolygonFeature(feature.geometry, {})
}

function clipToBoundary(feature, boundaryPoly) {
  if (!feature?.geometry || !boundaryPoly) return feature
  try {
    if (!booleanIntersects(feature, boundaryPoly)) return null
    return intersect(featureCollection([feature, boundaryPoly]), {
      properties: feature.properties,
    })
  } catch {
    return booleanIntersects(feature, boundaryPoly) ? feature : null
  }
}

function normalizeLiquefaction(raw) {
  const value = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (value === 'HIGH') return 'high'
  if (value === 'MED' || value === 'MEDIUM' || value === 'MODERATE') return 'moderate'
  if (value === 'LOW') return 'low'
  return 'unknown'
}

const LIQUEFACTION_LABEL = {
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  unknown: 'Unknown',
}

function normalizeErosion(raw) {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (value.includes('severe') || value.includes('highly')) return 'severe'
  if (value.includes('moderate')) return 'moderate'
  if (value.includes('slight') || value.includes('low')) return 'slight'
  if (value.includes('no apparent') || value.includes('none')) return 'none'
  if (value.includes('river') || value.includes('creek') || value.includes('water')) return 'river'
  return 'unknown'
}

const EROSION_LABEL = {
  severe: 'Severe erosion',
  moderate: 'Moderate erosion',
  slight: 'Slight erosion',
  none: 'No apparent erosion',
  river: 'River / Waterway channel',
  unknown: 'Unknown',
}

function normalizeLguFlood(raw) {
  const value = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (value === 'HIGH') return 'high'
  if (value === 'MODERATE' || value === 'MED' || value === 'MEDIUM') return 'moderate'
  if (value === 'LOW') return 'low'
  return 'unknown'
}

const LGU_FLOOD_LABEL = {
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  unknown: 'Unknown',
}

function normalizeLandUse(raw, remarks = '') {
  const rem = String(remarks ?? '').trim().toUpperCase()
  if (rem.includes('RESIDENTIAL')) return { landUseClass: 'residential', landUseLabel: 'Residential' }
  if (rem.includes('COMMERCIAL')) return { landUseClass: 'commercial', landUseLabel: 'Commercial' }
  if (rem.includes('AFP CAMP') || rem.includes('INSTITUTIONAL')) return { landUseClass: 'institutional', landUseLabel: 'Institutional' }
  if (rem.includes('CEMETERY')) return { landUseClass: 'cemetery', landUseLabel: 'Cemetery' }
  if (rem.includes('ROAD')) return { landUseClass: 'road', landUseLabel: 'Road' }
  if (rem.includes('LANDFILL') || rem.includes('INFRASTRUCTURE')) return { landUseClass: 'infrastructure', landUseLabel: 'Infrastructure' }
  if (rem.includes('SWIP')) return { landUseClass: 'agriculture', landUseLabel: 'Agriculture (SWIP)' }
  if (rem.includes('RIVERS') || rem.includes('CREEKS') || rem.includes('RIVER') || rem.includes('CREEK')) return { landUseClass: 'water', landUseLabel: 'Rivers & Creeks' }

  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (value === 'forest') return { landUseClass: 'forest', landUseLabel: 'Forest' }
  if (value === 'residential') return { landUseClass: 'residential', landUseLabel: 'Residential' }
  if (value.includes('socialized housing')) return { landUseClass: 'socialized_housing', landUseLabel: 'Socialized Housing' }
  if (value === 'commercial') return { landUseClass: 'commercial', landUseLabel: 'Commercial' }
  if (value === 'crops' || value === 'agriculture' || (value.includes('agri') && !value.includes('industrial'))) return { landUseClass: 'agriculture', landUseLabel: 'Agriculture' }
  if (value.includes('agri industrial')) return { landUseClass: 'agri_industrial', landUseLabel: 'Agri-Industrial' }
  if (value === 'institutional') return { landUseClass: 'institutional', landUseLabel: 'Institutional' }
  if (value.includes('parks')) return { landUseClass: 'parks', landUseLabel: 'Parks & Recreation' }
  if (value.includes('eco-tourism')) return { landUseClass: 'eco_tourism', landUseLabel: 'Eco-Tourism' }
  if (value.includes('cemetery')) return { landUseClass: 'cemetery', landUseLabel: 'Cemetery' }
  if (value.includes('infrastructure') || value.includes('utilities')) return { landUseClass: 'infrastructure', landUseLabel: 'Infrastructure' }
  if (value.includes('lakes') || value.includes('rivers') || value.includes('creeks')) return { landUseClass: 'water', landUseLabel: 'Rivers & Water Bodies' }
  if (value.includes('road')) return { landUseClass: 'road', landUseLabel: 'Road' }
  return { landUseClass: 'unknown', landUseLabel: raw || 'Unknown' }
}

async function convertLayer({ shpName, mapFeature, collectionMeta }) {
  const shpPath = join(inputDir, `${shpName}.shp`)
  const boundaryPoly = loadBoundaryPolygon()
  const source = await open(shpPath)
  const features = []
  let index = 0

  while (true) {
    const result = await source.read()
    if (result.done) break

    const geometry = reprojectGeometry(result.value.geometry)
    const mapped = mapFeature(result.value.properties, index)
    if (!mapped || !geometry) continue

    let feature = asPolygonFeature(geometry, mapped)
    if (!feature) continue

    feature = clipToBoundary(feature, boundaryPoly)
    if (!feature?.geometry) continue

    features.push(feature)
    index += 1
  }

  return {
    type: 'FeatureCollection',
    properties: collectionMeta,
    features,
  }
}

async function main() {
  mkdirSync(hazardsDir, { recursive: true })

  const liquefaction = await convertLayer({
    shpName: 'Liquifacation_Lasam_2013',
    collectionMeta: {
      name: 'Lasam liquefaction susceptibility (2013)',
      data_source: 'LGU Lasam / local GIS (demonstration)',
      vintage: '2013',
      disclaimer: 'Demonstration only — not an official PHIVOLCS geohazard certificate.',
    },
    mapFeature: (props, index) => {
      const susceptibility = normalizeLiquefaction(props.SUS)
      return {
        id: `LAS-LIQ-${String(index + 1).padStart(3, '0')}`,
        susceptibility,
        susceptibility_label: LIQUEFACTION_LABEL[susceptibility],
        barangay: String(props.Barangay ?? '').trim() || null,
        hectares: Number(props.HECTARES) || null,
        data_source: 'LGU Lasam liquefaction (2013)',
      }
    },
  })

  const erosion = await convertLayer({
    shpName: 'Land_Erosion_Lasam_2020',
    collectionMeta: {
      name: 'Lasam land erosion (2020)',
      data_source: 'Philippines soil erosion dataset clipped to Lasam (demonstration)',
      vintage: '2020',
      disclaimer: 'Demonstration only — verify with LGU / DENR before planning decisions.',
    },
    mapFeature: (props, index) => {
      const erosionClass = normalizeErosion(props.Erosion)
      return {
        id: `LAS-ERO-${String(index + 1).padStart(3, '0')}`,
        erosion_class: erosionClass,
        erosion_label: EROSION_LABEL[erosionClass],
        barangay: String(props.Barangay ?? '').trim() || null,
        hectares: Number(props.HECTARES) || null,
        data_source: 'Soil erosion dataset (Lasam barangay clip)',
      }
    },
  })

  const lguFlood = await convertLayer({
    shpName: 'Flood_2020_Lasam',
    collectionMeta: {
      name: 'Lasam flood susceptibility (LGU 2020)',
      data_source: 'LGU Lasam coarse flood zones (demonstration)',
      vintage: '2020',
      disclaimer:
        'Coarse LGU flood layer — not DENR-MGB. Use the Flood tab for official MGB susceptibility.',
    },
    mapFeature: (props, index) => {
      const susceptibility = normalizeLguFlood(props.SUSCEPTIBI)
      return {
        id: `LAS-FLD-${String(index + 1).padStart(3, '0')}`,
        susceptibility,
        susceptibility_label: LGU_FLOOD_LABEL[susceptibility],
        gridcode: Number(props.gridcode) || null,
        data_source: 'LGU Lasam flood (2020)',
      }
    },
  })

  const landUse = await convertLayer({
    shpName: 'EXISTING_LAND_USE_LASAM_2020',
    collectionMeta: {
      name: 'Lasam existing land use (CLUP 2020)',
      data_source: 'LGU Lasam CLUP existing land use (demonstration)',
      vintage: '2020',
      disclaimer: 'Demonstration only — verify with the municipal planning office.',
    },
    mapFeature: (props, index) => {
      const rawLabel = String(props.LANDUSE ?? '').trim()
      const remarks = String(props.REMARKS ?? '').trim()
      const { landUseClass, landUseLabel } = normalizeLandUse(rawLabel, remarks)
      return {
        id: `LAS-LU-${String(index + 1).padStart(3, '0')}`,
        land_use_class: landUseClass,
        land_use_label: landUseLabel,
        remarks: remarks || null,
        area_sqm: Number(props.AREA) || null,
        data_source: 'LGU Lasam CLUP existing land use (2020)',
      }
    },
  })

  const liquefactionPath = join(hazardsDir, 'lasam-liquefaction-2013.geojson')
  const erosionPath = join(hazardsDir, 'lasam-erosion-2020.geojson')
  const lguFloodPath = join(hazardsDir, 'lasam-flood-lgu-2020.geojson')
  const landUsePath = join(hazardsDir, 'lasam-land-use-2020.geojson')

  writeFileSync(liquefactionPath, `${JSON.stringify(liquefaction)}\n`, 'utf8')
  writeFileSync(erosionPath, `${JSON.stringify(erosion)}\n`, 'utf8')
  writeFileSync(lguFloodPath, `${JSON.stringify(lguFlood)}\n`, 'utf8')
  writeFileSync(landUsePath, `${JSON.stringify(landUse)}\n`, 'utf8')

  console.log(`Wrote ${liquefaction.features.length} features → ${liquefactionPath}`)
  console.log(`Wrote ${erosion.features.length} features → ${erosionPath}`)
  console.log(`Wrote ${lguFlood.features.length} features → ${lguFloodPath}`)
  console.log(`Wrote ${landUse.features.length} features → ${landUsePath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
