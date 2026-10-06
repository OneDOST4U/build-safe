import { useEffect, useState } from 'react'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import { dataUrl } from '@/lib/dataVersion'
import type { BuildingCollection, ElevationGrid } from '@/types'

export interface MapData {
  buildings: BuildingCollection
  boundary: FeatureCollection
  rivers: FeatureCollection
  riversMain: FeatureCollection
  riversTributaries: FeatureCollection
  drainage: FeatureCollection
  riverbanks: FeatureCollection
  watersheds: FeatureCollection
  flowArrows: FeatureCollection
  contours: FeatureCollection
  elevationGrid: ElevationGrid | null
  mgbFlood: FeatureCollection
  liquefaction: FeatureCollection
  erosion: FeatureCollection
  lguFlood: FeatureCollection
  landUse: FeatureCollection
  npaaad: FeatureCollection
  safdz: FeatureCollection
  defaultFaults: FeatureCollection
  volcanoes: FeatureCollection
  facilities: FeatureCollection
}

interface UseMapDataResult {
  data: MapData | null
  error: string | null
  isLoading: boolean
  isEnhancing: boolean
  retry: () => void
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`)
  }
  return response.json() as Promise<T>
}

async function fetchJsonOptional<T>(url: string, fallback: T): Promise<T> {
  try {
    return await fetchJson<T>(url)
  } catch {
    return fallback
  }
}

const emptyFc: FeatureCollection = { type: 'FeatureCollection', features: [] }

function asFaultCollection(
  data: FeatureCollection | { features?: Feature[] } | null,
): FeatureCollection {
  if (!data?.features?.length) return emptyFc
  return {
    type: 'FeatureCollection',
    features: data.features.filter(
      (f): f is Feature =>
        f?.geometry?.type === 'LineString' || f?.geometry?.type === 'MultiLineString',
    ),
  }
}

function buildMapData(
  partial: Omit<MapData, 'rivers' | 'defaultFaults'> & {
    riversLegacy: FeatureCollection
    phivolcsFaults: FeatureCollection | null
    sampleFault: { features: Feature<LineString>[] } | null
  },
): MapData {
  const defaultFaults = asFaultCollection(partial.phivolcsFaults)
  const faults =
    defaultFaults.features.length > 0 ? defaultFaults : asFaultCollection(partial.sampleFault)

  const riversMainSafe = partial.riversMain.features.length
    ? partial.riversMain
    : partial.riversLegacy

  return {
    buildings: partial.buildings,
    boundary: partial.boundary,
    rivers: {
      type: 'FeatureCollection',
      features: [...riversMainSafe.features, ...partial.riversTributaries.features],
    },
    riversMain: riversMainSafe,
    riversTributaries: partial.riversTributaries,
    drainage: partial.drainage,
    riverbanks: partial.riverbanks,
    watersheds: partial.watersheds,
    flowArrows: partial.flowArrows,
    contours: partial.contours,
    elevationGrid: partial.elevationGrid,
    mgbFlood: partial.mgbFlood,
    liquefaction: partial.liquefaction,
    erosion: partial.erosion,
    lguFlood: partial.lguFlood,
    landUse: partial.landUse,
    npaaad: partial.npaaad,
    safdz: partial.safdz,
    defaultFaults: faults,
    volcanoes: partial.volcanoes,
    facilities: partial.facilities,
  }
}

function emptyMapDataShell(
  buildings: BuildingCollection,
  boundary: FeatureCollection,
): MapData {
  return buildMapData({
    buildings,
    boundary,
    riversLegacy: emptyFc,
    riversMain: emptyFc,
    riversTributaries: emptyFc,
    drainage: emptyFc,
    riverbanks: emptyFc,
    watersheds: emptyFc,
    flowArrows: emptyFc,
    contours: emptyFc,
    elevationGrid: null,
    mgbFlood: emptyFc,
    liquefaction: emptyFc,
    erosion: emptyFc,
    lguFlood: emptyFc,
    landUse: emptyFc,
    npaaad: emptyFc,
    safdz: emptyFc,
    phivolcsFaults: null,
    sampleFault: null,
    volcanoes: emptyFc,
    facilities: emptyFc,
  })
}

export function useMapData(): UseMapDataResult {
  const [data, setData] = useState<MapData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setIsEnhancing(false)
      setError(null)

      try {
        const [buildings, psaBoundary, osmBoundary] = await Promise.all([
          fetchJson<BuildingCollection>(dataUrl('/data/administrative/lasam-buildings.geojson'))
            .catch(() => fetchJson<BuildingCollection>(dataUrl('/data/lasam-buildings.geojson'))),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/administrative/psa-lasam-boundary.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/administrative/lasam-boundary.geojson'),
            emptyFc,
          ).catch(() =>
            fetchJsonOptional<FeatureCollection>(dataUrl('/data/lasam-boundary.geojson'), emptyFc),
          ),
        ])

        if (cancelled) return

        const boundary =
          psaBoundary.features.length > 0
            ? psaBoundary
            : osmBoundary.features.length > 0
              ? osmBoundary
              : emptyFc

        if (boundary.features.length === 0) {
          throw new Error(
            'Municipal boundary missing. Run npm run fetch:boundary (or ensure OSM lasam-boundary.geojson exists).',
          )
        }

        setData(emptyMapDataShell(buildings, boundary))
        setIsLoading(false)
        setIsEnhancing(true)

        // Tier 1: Fast Critical Hazards & Infrastructure (loads in <300ms)
        const [
          riversLegacy,
          riversMain,
          riversTributaries,
          mgbFlood,
          liquefaction,
          erosion,
          lguFlood,
          phivolcsFaults,
          sampleFault,
          volcanoes,
          facilities,
        ] = await Promise.all([
          fetchJsonOptional<FeatureCollection>(dataUrl('/data/lasam-rivers.geojson'), emptyFc),
          fetchJsonOptional<FeatureCollection>(dataUrl('/data/hydrology/rivers-main.geojson'), emptyFc),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hydrology/rivers-tributaries.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hazards/mgb-flood-lasam.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hazards/lasam-liquefaction-2013.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hazards/lasam-erosion-2020.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hazards/lasam-flood-lgu-2020.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection | null>(
            dataUrl('/data/hazards/phivolcs-faults-lasam.geojson'),
            null,
          ),
          fetchJsonOptional<{ features: Feature<LineString>[] } | null>(
            dataUrl('/data/sample-fault-line.geojson'),
            null,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hazards/phivolcs-volcanoes-northern-luzon.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/facilities/lasam-critical-facilities.geojson'),
            emptyFc,
          ),
        ])

        if (cancelled) return

        const tier1Data = buildMapData({
          buildings,
          boundary,
          riversLegacy,
          riversMain,
          riversTributaries,
          drainage: emptyFc,
          riverbanks: emptyFc,
          watersheds: emptyFc,
          flowArrows: emptyFc,
          contours: emptyFc,
          elevationGrid: null,
          mgbFlood,
          liquefaction,
          erosion,
          lguFlood,
          landUse: emptyFc,
          npaaad: emptyFc,
          safdz: emptyFc,
          phivolcsFaults,
          sampleFault,
          volcanoes,
          facilities,
        })

        // Instantly activate flood and hazard layers
        setData(tier1Data)

        // Tier 2: Heavy background layers (land use, NPAAAD, SAFDZ, terrain elevation grid, contours, drainage)
        const [
          landUse,
          npaaad,
          safdz,
          drainage,
          riverbanks,
          watersheds,
          flowArrows,
          contours,
          elevationGrid,
        ] = await Promise.all([
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hazards/lasam-land-use-2020.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hazards/lasam-npaaad-2022.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hazards/lasam-safdz-2022.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hydrology/drainage.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hydrology/riverbanks.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hydrology/watersheds.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/hydrology/flow-arrows.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<FeatureCollection>(
            dataUrl('/data/terrain/contours.geojson'),
            emptyFc,
          ),
          fetchJsonOptional<ElevationGrid | null>(
            dataUrl('/data/terrain/elevation-grid.json'),
            null,
          ),
        ])

        if (cancelled) return

        const fullData = buildMapData({
          buildings,
          boundary,
          riversLegacy,
          riversMain,
          riversTributaries,
          drainage,
          riverbanks,
          watersheds,
          flowArrows,
          contours,
          elevationGrid,
          mgbFlood,
          liquefaction,
          erosion,
          lguFlood,
          landUse,
          npaaad,
          safdz,
          phivolcsFaults,
          sampleFault,
          volcanoes,
          facilities,
        })

        setData(fullData)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error loading map data.')
          setData(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setIsEnhancing(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [attempt])

  return {
    data,
    error,
    isLoading,
    isEnhancing,
    retry: () => setAttempt((a) => a + 1),
  }
}
