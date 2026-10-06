/**
 * Convert DA-BSWM NPAAAD and SAFDZ shapefiles (PRS92 UTM 51N) to WGS84 GeoJSON.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { open } from 'shapefile'
import proj4 from 'proj4'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const hazardsDir = join(root, 'public', 'data', 'hazards')

// PRS92 UTM Zone 51N standard datum transformation
proj4.defs(
  'EPSG:31251',
  '+proj=utm +zone=51 +ellps=clrk66 +towgs84=-127.62,-67.24,-47.04,-3.068,4.303,1.658,1.06002 +units=m +no_defs'
)

function reprojectCoord([x, y]) {
  if (Math.abs(x) <= 180 && Math.abs(y) <= 90) {
    return [Number(x.toFixed(6)), Number(y.toFixed(6))]
  }
  const pt = proj4('EPSG:31251', 'WGS84', [x, y])
  return [Number(pt[0].toFixed(6)), Number(pt[1].toFixed(6))]
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
        poly.map((ring) => ring.map(reprojectCoord))
      ),
    }
  }
  return null
}

const NPAAAD_LABELS = {
  A: 'All irrigated lands/areas',
  BU: 'Built-up areas',
  C: 'Alluvial plain lands highly suitable for agriculture (non-irrigated)',
  D: 'Agro-Industrial croplands',
  F: 'Ecologically fragile agricultural lands',
  G: 'Fishery areas (pursuant to Fisheries Code)',
  H: 'Forest / Watershed areas',
  Others: 'Other lands / Infrastructure / River wash',
  WB: 'Water bodies',
}

const SAFDZ_LABELS = {
  '1': 'Strategic Crop Sub-Development Zone',
  '2': 'Strategic Livestock Sub-Development Zone',
  '3': 'Strategic Fishery Sub-Development Zone',
  '8': 'Remaining NPAAAD',
  '9': 'Agro-Forestry Zone',
  '10': 'Forest / Watershed Areas',
  BU: 'Built-up areas',
  Others: 'Other lands / Infrastructure',
  WB: 'Water bodies',
}

async function convertShapefile(shpPath, codeKey, labelDict, outputFile, datasetName) {
  console.log(`Converting ${datasetName} from ${shpPath}...`)
  const source = await open(shpPath)
  const features = []

  while (true) {
    const record = await source.read()
    if (record.done) break
    const rawGeom = record.value.geometry
    const rawProps = record.value.properties || {}

    const geom = reprojectGeometry(rawGeom)
    if (!geom) continue

    const code = String(rawProps[codeKey] ?? '').trim()
    const description = String(rawProps.DESC_ ?? labelDict[code] ?? code).trim()
    const label = labelDict[code] || description || code

    features.push({
      type: 'Feature',
      geometry: geom,
      properties: {
        code,
        label,
        description,
        year: String(rawProps.YEAR ?? '2022').trim(),
        area_m2: rawProps.Shape_Area ? Number(rawProps.Shape_Area) : undefined,
        perimeter_m: rawProps.Shape_Leng ? Number(rawProps.Shape_Leng) : undefined,
      },
    })
  }

  mkdirSync(hazardsDir, { recursive: true })
  const fc = {
    type: 'FeatureCollection',
    name: datasetName,
    features,
  }

  writeFileSync(outputFile, JSON.stringify(fc), 'utf8')
  console.log(`✓ Saved ${features.length} features to ${outputFile}`)
}

async function main() {
  await convertShapefile(
    join(root, 'public', 'data', 'NPAAAD', 'LASAM_NPAAAD.shp'),
    'NPAAAD',
    NPAAAD_LABELS,
    join(hazardsDir, 'lasam-npaaad-2022.geojson'),
    'Lasam NPAAAD (DA-BSWM 2022)'
  )

  await convertShapefile(
    join(root, 'public', 'data', 'SAFDZ', 'LASAM_SAFDZ.shp'),
    'SAFDZ',
    SAFDZ_LABELS,
    join(hazardsDir, 'lasam-safdz-2022.geojson'),
    'Lasam SAFDZ (DA-BSWM 2022)'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
