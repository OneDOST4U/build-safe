import type { MapGeoJSONFeature } from 'maplibre-gl'
import {
  EROSION_COLORS,
  LAND_USE_COLORS,
  LGU_FLOOD_COLORS,
  LIQUEFACTION_COLORS,
  NPAAAD_COLORS,
  SAFDZ_COLORS,
  type ErosionClass,
  type LandUseClass,
  type LguFloodSusceptibility,
  type LiquefactionSusceptibility,
} from '@/lib/simulation/lguHazards'
import { MGB_FLOOD_COLORS } from '@/lib/simulation/mgbFlood'

export interface HoveredLegendInfo {
  layerKey: string
  layerTitle: string
  label: string
  subLabel?: string
  color: string
  icon: string
  x: number
  y: number
}

export const HOVERABLE_LEGEND_LAYERS = [
  'land-use-fill',
  'npaaad-fill',
  'safdz-fill',
  'erosion-fill',
  'liquefaction-fill',
  'lgu-flood-fill',
  'flood-zone-fill',
] as const

export function parseHoveredLegendFeature(
  feat: MapGeoJSONFeature,
  point: { x: number; y: number },
): HoveredLegendInfo | null {
  const layerId = feat.layer.id
  const p = (feat.properties || {}) as Record<string, unknown>

  if (layerId === 'land-use-fill') {
    const rawClass = String(p.land_use_class ?? '').toLowerCase().trim()
    const rawLabel = String(p.land_use_label ?? 'Land Use').trim()
    const label = rawClass === 'forest' || rawLabel.toLowerCase() === 'forest' ? 'Forest Area' : rawLabel
    const rawRemarks = p.remarks ? String(p.remarks).trim() : ''
    const subLabel = rawRemarks && rawRemarks.toUpperCase() !== 'UNTOUCHED' ? rawRemarks : undefined
    const color = LAND_USE_COLORS[rawClass as LandUseClass] ?? '#166534'
    let icon = '🗺️'
    if (rawClass === 'forest') icon = '🌲'
    else if (rawClass === 'agriculture' || rawClass === 'crops') icon = '🌾'
    else if (rawClass === 'residential') icon = '🏠'
    else if (rawClass === 'socialized_housing') icon = '🏘️'
    else if (rawClass === 'commercial') icon = '🏢'
    else if (rawClass === 'agri_industrial') icon = '🏭'
    else if (rawClass === 'institutional') icon = '🏛️'
    else if (rawClass === 'parks') icon = '🌳'
    else if (rawClass === 'eco_tourism') icon = '🏕️'
    else if (rawClass === 'cemetery') icon = '🪦'
    else if (rawClass === 'infrastructure') icon = '⚡'
    else if (rawClass === 'water') icon = '💧'
    else if (rawClass === 'road') icon = '🛣️'

    return {
      layerKey: 'landUse',
      layerTitle: 'Land Use',
      label,
      subLabel,
      color,
      icon,
      x: point.x,
      y: point.y,
    }
  }

  if (layerId === 'npaaad-fill') {
    const code = String(p.code ?? '').trim()
    const label = String(p.label ?? p.description ?? code).trim()
    const color = NPAAAD_COLORS[code] ?? '#059669'
    let icon = '🌱'
    if (code === 'H') icon = '🌲'
    else if (code === 'A' || code === 'C') icon = '🌾'
    else if (code === 'BU') icon = '🏠'
    else if (code === 'D') icon = '🏭'
    else if (code === 'G') icon = '🐟'

    return {
      layerKey: 'npaaad',
      layerTitle: 'NPAAAD',
      label: code ? `${label} (${code})` : label,
      color,
      icon,
      x: point.x,
      y: point.y,
    }
  }

  if (layerId === 'safdz-fill') {
    const code = String(p.code ?? '').trim()
    const label = String(p.label ?? p.description ?? code).trim()
    const color = SAFDZ_COLORS[code] ?? '#65a30d'
    let icon = '🌾'
    if (code === '10' || code === '9') icon = '🌲'
    else if (code === '2') icon = '🐄'
    else if (code === '3') icon = '🐟'
    else if (code === 'BU') icon = '🏠'

    return {
      layerKey: 'safdz',
      layerTitle: 'SAFDZ',
      label: code ? `${label} (${code})` : label,
      color,
      icon,
      x: point.x,
      y: point.y,
    }
  }

  if (layerId === 'erosion-fill') {
    const rawClass = String(p.erosion_class ?? '').toLowerCase().trim()
    const label = String(p.erosion_label ?? rawClass).trim()
    const color = EROSION_COLORS[rawClass as ErosionClass] ?? '#fb923c'
    let icon = '⛰️'
    if (rawClass === 'severe') icon = '⚠️'
    else if (rawClass === 'none') icon = '🛡️'
    else if (rawClass === 'river') icon = '🌊'

    const brgy = p.barangay ? ` — ${p.barangay}` : ''
    return {
      layerKey: 'erosion',
      layerTitle: 'Soil Erosion',
      label: `${label}${brgy}`,
      color,
      icon,
      x: point.x,
      y: point.y,
    }
  }

  if (layerId === 'liquefaction-fill') {
    const rawSus = String(p.susceptibility ?? '').toLowerCase().trim()
    const label = String(p.susceptibility_label ?? rawSus).trim()
    const color = LIQUEFACTION_COLORS[rawSus as LiquefactionSusceptibility] ?? '#f97316'

    return {
      layerKey: 'liquefaction',
      layerTitle: 'Liquefaction',
      label: `${label} Susceptibility`,
      color,
      icon: '⚠️',
      x: point.x,
      y: point.y,
    }
  }

  if (layerId === 'lgu-flood-fill') {
    const rawSus = String(p.susceptibility ?? '').toLowerCase().trim()
    const label = String(p.susceptibility_label ?? rawSus).trim()
    const color = LGU_FLOOD_COLORS[rawSus as LguFloodSusceptibility] ?? '#2563eb'

    return {
      layerKey: 'lguFlood',
      layerTitle: 'LGU Flood',
      label: `${label} Flood Zone`,
      color,
      icon: '🌊',
      x: point.x,
      y: point.y,
    }
  }

  if (layerId === 'flood-zone-fill') {
    const label = String(p.susceptibility_label ?? p.raw_class ?? 'Flood').trim()
    const color = MGB_FLOOD_COLORS[label as keyof typeof MGB_FLOOD_COLORS] ?? '#ea580c'

    return {
      layerKey: 'flood',
      layerTitle: 'MGB Flood',
      label: `${label} Flood Susceptibility`,
      color,
      icon: '🌊',
      x: point.x,
      y: point.y,
    }
  }

  return null
}
