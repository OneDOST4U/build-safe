import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { Header } from '@/components/layout/Header'
import { DisclaimerModal } from '@/components/layout/DisclaimerModal'
import { MapToolbar } from '@/components/layout/MapToolbar'
import { SiteAssessmentPopup } from '@/components/layout/SiteAssessmentPopup'
import { MobileHazardDrawer } from '@/components/layout/MobileHazardDrawer'
import { BuildingPopup } from '@/components/layout/BuildingPopup'
import { RiverInfoCard, type SelectedRiver } from '@/components/layout/RiverInfoCard'
import { Button } from '@/components/ui/button'
import { useMapData } from '@/hooks/useMapData'
import { LASAM_CENTER } from '@/lib/constants'
import { DEFAULT_PROPOSED_BUILDING_TYPE } from '@/lib/assessment/buildingTypes'
import {
  applyMgbFloodExposure,
  countMgbExposureByClass,
  floodExposureToMgbLabel,
} from '@/lib/simulation/mgbFlood'
import { applyEarthquakeSimulation, earthquakeStatusLabel, getEarthquakeRadius } from '@/lib/simulation/earthquake'
import { applyFaultDistances } from '@/lib/simulation/fault'
import { collectPresentLegendKeys } from '@/lib/simulation/faultLegend'
import {
  CAGUA_CENTER,
  applyVolcanoDistances,
  volcanoStatusLabel,
} from '@/lib/simulation/volcano'
import { assessSite, isWithinLasamBbox } from '@/lib/assessment/siteAssessment'
import type {
  HazardMode,
  MapTool,
  ProposedBuildingType,
  RiverSettings,
  SelectedBuilding,
  SiteAssessmentResult,
  TerrainSettings,
} from '@/types'

const AssessmentReportModal = lazy(() =>
  import('@/components/layout/AssessmentReportModal').then((m) => ({
    default: m.AssessmentReportModal,
  })),
)

const MapView = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
)

const DEFAULT_FAULT_NAME = 'PHIVOLCS Active Faults (Lasam 50 km)'

const emptyFaults: FeatureCollection = { type: 'FeatureCollection', features: [] }

const initialLayerVisibility = {
  boundary: true,
  buildings: true,
  flood: false,
  liquefaction: false,
  erosion: false,
  lguFlood: false,
  landUse: false,
  npaaad: false,
  safdz: false,
  fault: false,
  epicenter: false,
  volcano: false,
  site: true,
}

const initialTerrain: TerrainSettings = {
  terrain3d: true,
  hillshade: false,
  contours: false,
  elevationColors: false,
  exaggeration: 1.4,
  opacity: 1,
}

const initialRivers: RiverSettings = {
  main: false,
  tributaries: false,
  drainage: false,
  riverbanks: false,
  watershed: false,
  flowArrows: false,
}

export default function App() {
  const { data, error, isLoading, isEnhancing, retry } = useMapData()

  const [faultLines, setFaultLines] = useState<FeatureCollection | null>(null)

  const [hazardMode, setHazardMode] = useState<HazardMode>('lgu')
  const [activeTool, setActiveTool] = useState<MapTool>('select')
  const [is3D, setIs3D] = useState(true)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [disclaimerOpen, setDisclaimerOpen] = useState(true)

  const [floodOpacity, setFloodOpacity] = useState(0.55)

  const [earthquakeMagnitude, setEarthquakeMagnitude] = useState(6)
  const [earthquakeRadius, setEarthquakeRadius] = useState(getEarthquakeRadius(6))
  const [epicenter, setEpicenter] = useState<[number, number] | null>(null)

  const [faultLineName, setFaultLineName] = useState(DEFAULT_FAULT_NAME)
  const [assessLat, setAssessLat] = useState(String(LASAM_CENTER[1]))
  const [assessLng, setAssessLng] = useState(String(LASAM_CENTER[0]))
  const [assessBuildingType, setAssessBuildingType] = useState<ProposedBuildingType>(
    DEFAULT_PROPOSED_BUILDING_TYPE,
  )
  const [assessmentResult, setAssessmentResult] = useState<SiteAssessmentResult | null>(null)
  const [assessError, setAssessError] = useState<string | null>(null)
  const [assessPanelOpen, setAssessPanelOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [siteCoords, setSiteCoords] = useState<[number, number] | null>(null)
  const [pendingSiteCoords, setPendingSiteCoords] = useState<[number, number] | null>(null)
  const [layerVisibility, setLayerVisibility] = useState(initialLayerVisibility)
  const [terrainSettings, setTerrainSettings] = useState(initialTerrain)
  const [riverSettings, setRiverSettings] = useState(initialRivers)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [selectedRiver, setSelectedRiver] = useState<SelectedRiver | null>(null)

  useEffect(() => {
    if (data?.defaultFaults) {
      setFaultLines(data.defaultFaults)
      setFaultLineName(DEFAULT_FAULT_NAME)
    }
  }, [data])

  const activeFaults = faultLines ?? data?.defaultFaults ?? emptyFaults
  const faultSegmentCount = activeFaults.features.length
  const activeFaultCount = activeFaults.features.filter(
    (f) => f.properties?.fault_class === 'Active',
  ).length
  const potentialFaultCount = activeFaults.features.filter(
    (f) => f.properties?.fault_class === 'Potentially Active',
  ).length
  const faultLegendKeysPresent = collectPresentLegendKeys(activeFaults.features)

  const baseBuildings = useMemo(() => {
    if (!data) return null
    let result = data.buildings
    if (layerVisibility.flood || hazardMode === 'flood') {
      if (data.mgbFlood.features.length) {
        result = applyMgbFloodExposure(result, data.mgbFlood)
      }
    }
    if (epicenter) {
      result = applyEarthquakeSimulation(result, epicenter, earthquakeMagnitude, earthquakeRadius)
    }
    return result
  }, [data, layerVisibility.flood, hazardMode, epicenter, earthquakeMagnitude, earthquakeRadius])

  const needsFaultExposure = layerVisibility.fault || hazardMode === 'fault'
  const needsVolcanoExposure = layerVisibility.volcano || hazardMode === 'volcano'

  const [faultBuildings, setFaultBuildings] = useState<
    NonNullable<ReturnType<typeof useMapData>['data']>['buildings'] | null
  >(null)

  const processedBuildings = faultBuildings ?? baseBuildings

  useEffect(() => {
    if (!baseBuildings || !data) {
      setFaultBuildings(null)
      return
    }

    if (!needsFaultExposure && !needsVolcanoExposure) {
      setFaultBuildings(null)
      return
    }

    setFaultBuildings(null)

    let cancelled = false
    const timer = window.setTimeout(() => {
      try {
        let next = baseBuildings
        const faults = faultLines ?? data.defaultFaults
        if (needsFaultExposure && faults.features.length) {
          next = applyFaultDistances(next, faults)
        }

        if (needsVolcanoExposure) {
          next = applyVolcanoDistances(next, CAGUA_CENTER)
        }
        if (cancelled) return
        setFaultBuildings(next)
      } catch (err) {
        console.error('Hazard exposure failed:', err)
        if (!cancelled) {
          setFaultBuildings(null)
        }
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [baseBuildings, data, faultLines, needsFaultExposure, needsVolcanoExposure])

  const mgbExposureCounts = useMemo(
    () =>
      countMgbExposureByClass(processedBuildings ?? { type: 'FeatureCollection', features: [] }),
    [processedBuildings],
  )

  const selectedBuilding = useMemo<SelectedBuilding | null>(() => {
    if (!selectedBuildingId || !processedBuildings || !data) return null
    const feature = processedBuildings.features.find((f) => f.properties.id === selectedBuildingId)
    if (!feature) return null

    const faultDistance =
      feature.properties.faultDistance !== undefined
        ? `${feature.properties.faultDistance} meters`
        : 'Not calculated'

    return {
      id: feature.properties.id,
      type: feature.properties.type,
      barangay: feature.properties.barangay,
      floors: feature.properties.floors,
      height: feature.properties.height,
      heightEstimated: feature.properties.height_estimated,
      groundElevation: feature.properties.ground_elevation_m,
      dataSource: feature.properties.data_source,
      validationStatus: feature.properties.validation_status,
      name: feature.properties.name,
      floodStatus: floodExposureToMgbLabel(feature.properties.floodExposure ?? 'none'),
      earthquakeStatus: earthquakeStatusLabel(feature.properties.earthquakeDamage ?? 'minimal'),
      faultDistance,
      floodDepth: 'MGB susceptibility (class-based, not scenario depth)',
      volcanoStatus:
        feature.properties.volcanoDistanceKm != null
          ? `${volcanoStatusLabel(feature.properties.volcanoExposure ?? 'none')} · ${feature.properties.volcanoDistanceKm.toFixed(1)} km from Cagua`
          : 'Not calculated',
    }
  }, [selectedBuildingId, processedBuildings, data])

  const handleReset = useCallback(() => {
    if (!data) return
    setFloodOpacity(0.55)
    setEarthquakeMagnitude(6)
    setEarthquakeRadius(getEarthquakeRadius(6))
    setEpicenter(null)
    setFaultLines(data.defaultFaults)
    setFaultLineName(DEFAULT_FAULT_NAME)
    setSelectedBuildingId(null)
    setSelectedRiver(null)
    setHazardMode('lgu')
    setActiveTool('select')
    setAssessmentResult(null)
    setAssessError(null)
    setAssessPanelOpen(false)
    setReportOpen(false)
    setSiteCoords(null)
    setPendingSiteCoords(null)
    setAssessLat(String(LASAM_CENTER[1]))
    setAssessLng(String(LASAM_CENTER[0]))
    setAssessBuildingType(DEFAULT_PROPOSED_BUILDING_TYPE)
    setLayerVisibility(initialLayerVisibility)
    setTerrainSettings(initialTerrain)
    setRiverSettings(initialRivers)
  }, [data])

  const handleAssessSite = useCallback(() => {
    if (!data) return
    const lat = Number(assessLat)
    const lng = Number(assessLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAssessError('Enter valid decimal latitude and longitude.')
      return
    }
    if (!isWithinLasamBbox(lng, lat)) {
      setAssessError('Coordinates must be within the Lasam assessment area (approx. 121.45–121.75 E, 18.00–18.15 N).')
      return
    }
    setAssessError(null)
    const result = assessSite(
      { lat, lng, buildingType: assessBuildingType },
      {
        faults: activeFaults,
        volcanoes: data.volcanoes,
        facilities: data.facilities,
        mgbFlood: data.mgbFlood,
        lguFlood: data.lguFlood,
        liquefaction: data.liquefaction,
        erosion: data.erosion,
        landUse: data.landUse,
        npaaad: data.npaaad,
        safdz: data.safdz,
      },
    )
    setAssessmentResult(result)
    setSiteCoords([lng, lat])
    setAssessPanelOpen(false)
    setReportOpen(true)
  }, [data, assessLat, assessLng, assessBuildingType, activeFaults])

  const handleSitePlace = useCallback((coords: [number, number]) => {
    setPendingSiteCoords(coords)
    setAssessLng(coords[0].toFixed(6))
    setAssessLat(coords[1].toFixed(6))
    setAssessError(null)
  }, [])

  const handleConfirmMapSite = useCallback(() => {
    if (!pendingSiteCoords || !data) return
    const [lng, lat] = pendingSiteCoords
    if (!isWithinLasamBbox(lng, lat)) {
      setAssessError('Picked point is outside the Lasam assessment bbox.')
      setAssessPanelOpen(true)
      setActiveTool('select')
      return
    }
    setAssessError(null)
    const result = assessSite(
      { lat, lng, buildingType: assessBuildingType },
      {
        faults: activeFaults,
        volcanoes: data.volcanoes,
        facilities: data.facilities,
        mgbFlood: data.mgbFlood,
        lguFlood: data.lguFlood,
        liquefaction: data.liquefaction,
        erosion: data.erosion,
        landUse: data.landUse,
        npaaad: data.npaaad,
        safdz: data.safdz,
      },
    )
    setAssessmentResult(result)
    setSiteCoords(pendingSiteCoords)
    setPendingSiteCoords(null)
    setActiveTool('select')
    setAssessPanelOpen(false)
    setReportOpen(true)
  }, [pendingSiteCoords, data, assessBuildingType, activeFaults])

  const handleCancelPickOnMap = useCallback(() => {
    setPendingSiteCoords(null)
    setActiveTool('select')
  }, [])

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const hazardPanelProps = {
    hazardMode,
    onHazardModeChange: setHazardMode,
    floodOpacity,
    onFloodOpacityChange: setFloodOpacity,
    mgbFeatureCount: data?.mgbFlood.features.length ?? 0,
    liquefactionFeatureCount: data?.liquefaction.features.length ?? 0,
    erosionFeatureCount: data?.erosion.features.length ?? 0,
    lguFloodFeatureCount: data?.lguFlood.features.length ?? 0,
    landUseFeatureCount: data?.landUse.features.length ?? 0,
    npaaadFeatureCount: data?.npaaad.features.length ?? 0,
    safdzFeatureCount: data?.safdz.features.length ?? 0,
    mgbExposureCounts,
    faultLineName,
    faultSegmentCount,
    activeFaultCount,
    potentialFaultCount,
    faultLegendKeysPresent,
    onFaultLineNameChange: setFaultLineName,
    onDeleteFaultLine: () => {
      if (data) {
        setFaultLines(data.defaultFaults)
        setFaultLineName(DEFAULT_FAULT_NAME)
      }
    },
    layerVisibility,
    onLayerVisibilityChange: (layer: string, visible: boolean) =>
      setLayerVisibility((prev) => ({ ...prev, [layer]: visible })),
    terrainSettings,
    onTerrainSettingsChange: (patch: Partial<TerrainSettings>) =>
      setTerrainSettings((prev) => ({ ...prev, ...patch })),
    riverSettings,
    onRiverSettingsChange: (patch: Partial<RiverSettings>) =>
      setRiverSettings((prev) => ({ ...prev, ...patch })),
    selectedBuilding,
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          <p className="text-sm text-slate-600">Loading Lasam hazard map…</p>
        </div>
      </div>
    )
  }

  if (error || !data || !processedBuildings) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Unable to load map data</h1>
        <p className="max-w-md text-sm text-slate-600">{error ?? 'Sample GeoJSON files could not be loaded.'}</p>
        <Button onClick={retry}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <Header
        is3D={is3D}
        onToggle3D={() => setIs3D((v) => !v)}
        onReset={handleReset}
        onFullscreen={handleFullscreen}
      />
      {isEnhancing && (
        <div className="border-b border-sky-100 bg-sky-50 px-4 py-1.5 text-center text-xs text-sky-800">
          Loading hazard & river data in the background…
        </div>
      )}
      <DisclaimerModal open={disclaimerOpen} onClose={() => setDisclaimerOpen(false)} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative h-[55vh] min-h-[420px] flex-1 lg:h-auto lg:min-h-0">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-600">
                Preparing interactive map…
              </div>
            }
          >
            <MapView
              buildings={processedBuildings}
              boundary={data.boundary}
            riversMain={data.riversMain}
            riversTributaries={data.riversTributaries}
            drainage={data.drainage}
            riverbanks={data.riverbanks}
            watersheds={data.watersheds}
            flowArrows={data.flowArrows}
            contours={data.contours}
            elevationGrid={data.elevationGrid}
            mgbFlood={data.mgbFlood}
            liquefaction={data.liquefaction}
            erosion={data.erosion}
            lguFlood={data.lguFlood}
            landUse={data.landUse}
            npaaad={data.npaaad}
            safdz={data.safdz}
            faultLines={activeFaults}
            epicenter={epicenter}
            earthquakeRadius={earthquakeRadius}
            earthquakeMagnitude={earthquakeMagnitude}
            hazardMode={hazardMode}
            activeTool={activeTool}
            is3D={is3D}
            floodOpacity={floodOpacity}
            selectedBuildingId={selectedBuildingId}
            siteCoords={pendingSiteCoords ?? siteCoords}
            layerVisibility={layerVisibility}
            terrainSettings={terrainSettings}
            riverSettings={riverSettings}
            onBuildingSelect={setSelectedBuildingId}
            onRiverSelect={setSelectedRiver}
            onEpicenterPlace={setEpicenter}
            onSitePlace={handleSitePlace}
            flyToSite={Boolean(siteCoords) && !pendingSiteCoords && activeTool !== 'place-site'}
            onFaultLineDrawn={(line) => {
              const drawn: FeatureCollection = {
                type: 'FeatureCollection',
                features: [
                  {
                    ...line,
                    properties: {
                      ...line.properties,
                      name: faultLineName || 'Drawn Fault Line',
                      fault_name: faultLineName || 'Drawn Fault Line',
                      fault_class: 'Active',
                      category_label: 'Active Fault',
                      trace_type: 'Certain',
                      legend_key: 'active-certain',
                      fccode: '01',
                      ttcode: '05',
                      data_source: 'User drawn',
                    },
                  },
                ],
              }
              setFaultLines(drawn)
            }}
              onMeasureUpdate={() => {}}
            />
          </Suspense>
          <SiteAssessmentPopup
            open={assessPanelOpen}
            onOpenChange={setAssessPanelOpen}
            assessLat={assessLat}
            assessLng={assessLng}
            assessBuildingType={assessBuildingType}
            assessmentResult={assessmentResult}
            assessError={assessError}
            onAssessLatChange={setAssessLat}
            onAssessLngChange={setAssessLng}
            onAssessBuildingTypeChange={setAssessBuildingType}
            onAssessSite={handleAssessSite}
            onPickSiteOnMap={() => {
              setAssessPanelOpen(false)
              setPendingSiteCoords(null)
              setLayerVisibility((prev) => ({ ...prev, site: true }))
              setActiveTool('place-site')
            }}
            pickingOnMap={activeTool === 'place-site'}
            pendingSiteCoords={pendingSiteCoords}
            onConfirmMapSite={handleConfirmMapSite}
            onCancelPickOnMap={handleCancelPickOnMap}
          />
          {reportOpen && (
            <Suspense fallback={null}>
              <AssessmentReportModal
                open={reportOpen}
                result={assessmentResult}
                buildings={data?.buildings ?? null}
                onClose={() => setReportOpen(false)}
              />
            </Suspense>
          )}
          <MapToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            className="left-3 top-14"
            layersActive={hazardMode === 'layers'}
            onOpenLayers={() => {
              setHazardMode('layers')
              setMobilePanelOpen(true)
            }}
            onClearDrawings={() => {
              if (data) {
                setFaultLines(data.defaultFaults)
                setFaultLineName(DEFAULT_FAULT_NAME)
              }
              setEpicenter(null)
            }}
          />
          {selectedBuilding && (
            <BuildingPopup building={selectedBuilding} onClose={() => setSelectedBuildingId(null)} />
          )}
          {selectedRiver && (
            <RiverInfoCard river={selectedRiver} onClose={() => setSelectedRiver(null)} />
          )}
        </div>

        <MobileHazardDrawer
          {...hazardPanelProps}
          isOpen={mobilePanelOpen}
          onToggle={() => setMobilePanelOpen((v) => !v)}
        />
      </div>
    </div>
  )
}
