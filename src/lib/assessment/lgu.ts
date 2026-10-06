import type { FeatureCollection } from 'geojson'
import {
  formatLandUseClass,
  getErosionAtPoint,
  getLandUseAtPoint,
  getLguFloodAtPoint,
  getLiquefactionAtPoint,
  getNpaaadAtPoint,
  getSafdzAtPoint,
} from '@/lib/simulation/lguLayerQuery'
import type { AssessmentRow } from '@/types'

const UNAVAILABLE = 'Unavailable — run npm run convert:hazards'

function withBarangay(label: string | null | undefined, barangay: unknown): string {
  const place = String(barangay ?? '').trim()
  if (!label) return place ? `Unknown — ${place}` : 'Unknown'
  return place ? `${label} — ${place}` : label
}

export interface LguAssessmentContext {
  lguFlood?: FeatureCollection | null
  liquefaction?: FeatureCollection | null
  erosion?: FeatureCollection | null
  landUse?: FeatureCollection | null
  npaaad?: FeatureCollection | null
  safdz?: FeatureCollection | null
}

export function assessLgu(
  coords: [number, number],
  ctx: LguAssessmentContext,
): AssessmentRow[] {
  const rows: AssessmentRow[] = [
    {
      label: 'Flood (LGU 2020)',
      value: formatLguFlood(coords, ctx.lguFlood),
    },
    {
      label: 'Liquefaction (2013)',
      value: formatLiquefaction(coords, ctx.liquefaction),
    },
    {
      label: 'Land erosion (2020)',
      value: formatErosion(coords, ctx.erosion),
    },
    {
      label: 'Existing land use (CLUP 2020)',
      value: formatLandUse(coords, ctx.landUse),
    },
  ]

  if (ctx.npaaad?.features?.length) {
    rows.push({
      label: 'NPAAAD Protection (DA 2022)',
      value: formatNpaaad(coords, ctx.npaaad),
    })
  }

  if (ctx.safdz?.features?.length) {
    rows.push({
      label: 'SAFDZ Agri Zone (DA 2022)',
      value: formatSafdz(coords, ctx.safdz),
    })
  }

  return rows
}

function formatLguFlood(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): string {
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getLguFloodAtPoint(coords, collection)
  if (!match) return 'Outside mapped LGU flood zones'

  const label = String(match.properties?.susceptibility_label ?? '').trim()
  return label ? `${label} (coarse LGU zone)` : 'Mapped (LGU 2020)'
}

function formatLiquefaction(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): string {
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getLiquefactionAtPoint(coords, collection)
  if (!match) return 'Outside mapped liquefaction susceptibility'

  return withBarangay(
    String(match.properties?.susceptibility_label ?? '').trim() || null,
    match.properties?.barangay,
  )
}

function formatErosion(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): string {
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getErosionAtPoint(coords, collection)
  if (!match) return 'Outside mapped land erosion zones'

  return withBarangay(
    String(match.properties?.erosion_label ?? '').trim() || null,
    match.properties?.barangay,
  )
}

function formatLandUse(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): string {
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getLandUseAtPoint(coords, collection)
  if (!match) return 'Outside mapped CLUP land-use polygons'

  const rawLabel = String(match.properties?.land_use_label ?? '').trim()
  if (rawLabel.toLowerCase() === 'crops') return 'Agriculture'

  const normalized = formatLandUseClass(
    match.properties?.land_use_class as Parameters<typeof formatLandUseClass>[0],
  )
  return (normalized === 'Crops' ? 'Agriculture' : rawLabel) || normalized
}

function formatNpaaad(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): string {
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getNpaaadAtPoint(coords, collection)
  if (!match) return 'Outside mapped NPAAAD boundaries'

  const code = String(match.properties?.code ?? '').trim()
  const label = String(match.properties?.label ?? match.properties?.description ?? code).trim()
  return code ? `${code} (${label})` : label
}

function formatSafdz(
  coords: [number, number],
  collection: FeatureCollection | null | undefined,
): string {
  if (!collection?.features?.length) return UNAVAILABLE

  const match = getSafdzAtPoint(coords, collection)
  if (!match) return 'Outside mapped SAFDZ boundaries'

  const code = String(match.properties?.code ?? '').trim()
  const label = String(match.properties?.label ?? match.properties?.description ?? code).trim()
  return code ? `Zone ${code} — ${label}` : label
}

