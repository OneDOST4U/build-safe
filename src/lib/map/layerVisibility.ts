import { GIS_BUILDING_LAYERS } from '@/lib/map/buildingLayers'
import { FAULT_LAYER_IDS } from '@/lib/simulation/faultLegend'
import type { RiverSettings, TerrainSettings } from '@/types'

export const LAYER_VISIBILITY_LABELS: Record<string, string> = {
  boundary: 'Municipal boundary',
  buildings: 'Building footprints (3D)',
  flood: 'MGB flood susceptibility',
  liquefaction: 'Liquefaction susceptibility (LGU 2013)',
  erosion: 'Land erosion (2020)',
  lguFlood: 'LGU flood susceptibility (2020)',
  landUse: 'Existing land use (CLUP 2020)',
  npaaad: 'NPAAAD agricultural protection (DA-BSWM 2022)',
  safdz: 'SAFDZ strategic agri-fisheries (DA-BSWM 2022)',
  fault: 'PHIVOLCS fault lines',
  epicenter: 'Earthquake epicenter',
  volcano: 'Cagua volcano marker',
  site: 'Site assessment pin',
}

/** Map layer-toggle keys → MapLibre layer ids */
export const LAYER_ID_MAP: Record<string, string[]> = {
  boundary: ['boundary-fill', 'boundary-line'],
  buildings: [...GIS_BUILDING_LAYERS],
  flood: ['flood-zone-fill'],
  liquefaction: ['liquefaction-fill'],
  erosion: ['erosion-fill'],
  lguFlood: ['lgu-flood-fill'],
  landUse: ['land-use-fill'],
  npaaad: ['npaaad-fill', 'npaaad-line'],
  safdz: ['safdz-fill', 'safdz-line'],
  fault: [...FAULT_LAYER_IDS],
  epicenter: ['epicenter-rings', 'epicenter-point'],
  volcano: ['volcano-point'],
  site: [],
  hillshade: ['hillshade'],
  contours: ['contours'],
  riversMain: ['rivers-main'],
  riversTributaries: ['rivers-tributaries'],
  drainage: ['drainage'],
  riverbanks: ['riverbanks-fill', 'riverbanks-line'],
  watershed: ['watershed-fill', 'watershed-line'],
  flowArrows: ['flow-arrows'],
}

export function resolveLayerVisible(
  key: string,
  layerVisibility: Record<string, boolean>,
  terrainSettings: TerrainSettings,
  riverSettings: RiverSettings,
): boolean {
  if (key === 'hillshade') return terrainSettings.hillshade
  if (key === 'contours') return terrainSettings.contours
  if (key === 'riversMain') return riverSettings.main
  if (key === 'riversTributaries') return riverSettings.tributaries
  if (key === 'drainage') return riverSettings.drainage
  if (key === 'riverbanks') return riverSettings.riverbanks
  if (key === 'watershed') return riverSettings.watershed
  if (key === 'flowArrows') return riverSettings.flowArrows
  return layerVisibility[key] ?? true
}

export function resolveMapLibreLayerVisibility(
  layerId: string,
  layerVisibility: Record<string, boolean>,
  terrainSettings: TerrainSettings,
  riverSettings: RiverSettings,
  is3D: boolean,
): 'visible' | 'none' {
  for (const [key, layerIds] of Object.entries(LAYER_ID_MAP)) {
    if (!layerIds.includes(layerId)) continue

    const enabled = resolveLayerVisible(key, layerVisibility, terrainSettings, riverSettings)
    if (!enabled) return 'none'

    if (key === 'buildings') {
      const show3d = is3D || terrainSettings.terrain3d
      if (layerId === 'buildings-footprint' || layerId === 'buildings-outline') {
        return show3d ? 'none' : 'visible'
      }
      if (layerId === 'buildings-3d' || layerId === 'buildings-3d-selected') {
        return show3d ? 'visible' : 'none'
      }
    }

    return 'visible'
  }

  return 'visible'
}
