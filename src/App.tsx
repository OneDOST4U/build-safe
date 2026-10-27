import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { Header } from '@/components/layout/Header'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { DisclaimerModal } from '@/components/layout/DisclaimerModal'
import { DatasetReliabilityModal } from '@/components/layout/DatasetReliabilityModal'
import { MapToolbar } from '@/components/layout/MapToolbar'
import { SiteAssessmentPopup } from '@/components/layout/SiteAssessmentPopup'
import { type HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import { MobileHazardDrawer } from '@/components/layout/MobileHazardDrawer'
import { BuildingPopup } from '@/components/layout/BuildingPopup'
import { RiverInfoCard, type SelectedRiver } from '@/components/layout/RiverInfoCard'
import { BuildSafeChatbot } from '@/components/layout/BuildSafeChatbot'
import { Button } from '@/components/ui/button'
import { FileText, Navigation, X } from 'lucide-react'
import { useMapData } from '@/hooks/useMapData'
import { LASAM_CENTER } from '@/lib/constants'
import { DEFAULT_PROPOSED_BUILDING_TYPE } from '@/lib/assessment/buildingTypes'
import {
  type AssessmentTargetCategory,
  type FarmCropType,
  DEFAULT_FARM_CROP,
} from '@/lib/assessment/farmLot'
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
import { assessSite, isPointInsideLasam } from '@/lib/assessment/siteAssessment'
import { checkWaterBodyProximity } from '@/lib/assessment/waterBody'
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
  const [activeTool, setActiveTool] = useState<MapTool>('pan')
  const [is3D, setIs3D] = useState(true)
  const [hazardPanelOpen, setHazardPanelOpen] = useState(false)
  const [disclaimerOpen, setDisclaimerOpen] = useState(true)
  const [reliabilityModalOpen, setReliabilityModalOpen] = useState(false)

  const [floodOpacity, setFloodOpacity] = useState(0.55)

  const [earthquakeMagnitude, setEarthquakeMagnitude] = useState(6)
  const [earthquakeRadius, setEarthquakeRadius] = useState(getEarthquakeRadius(6))
  const [epicenter, setEpicenter] = useState<[number, number] | null>(null)

  const [faultLineName, setFaultLineName] = useState(DEFAULT_FAULT_NAME)
  const [assessLat, setAssessLat] = useState(String(LASAM_CENTER[1]))
  const [assessLng, setAssessLng] = useState(String(LASAM_CENTER[0]))
  const [assessCategory, setAssessCategory] = useState<AssessmentTargetCategory>('building')
  const [assessBuildingType, setAssessBuildingType] = useState<ProposedBuildingType>(
    DEFAULT_PROPOSED_BUILDING_TYPE,
  )
  const [assessCropType, setAssessCropType] = useState<FarmCropType>(DEFAULT_FARM_CROP)
  const [assessmentResult, setAssessmentResult] = useState<SiteAssessmentResult | null>(null)
  const [assessError, setAssessError] = useState<string | null>(null)
  const [assessPanelOpen, setAssessPanelOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [chatbotOpen, setChatbotOpen] = useState(false)
  const [highlightedFacility, setHighlightedFacility] = useState<HighlightedFacilityInfo | null>(null)
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
    if (layerVisibility.flood) {
      if (data.mgbFlood.features.length) {
        result = applyMgbFloodExposure(result, data.mgbFlood)
      }
    }
    if (epicenter) {
      result = applyEarthquakeSimulation(result, epicenter, earthquakeMagnitude, earthquakeRadius)
    }
    return result
  }, [data, layerVisibility.flood, epicenter, earthquakeMagnitude, earthquakeRadius])

  const needsFaultExposure = Boolean(layerVisibility.fault)
  const needsVolcanoExposure = Boolean(layerVisibility.volcano)

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

  const pendingWaterBodyCheck = useMemo(() => {
    if (!pendingSiteCoords || !data) return null
    return checkWaterBodyProximity(pendingSiteCoords, {
      riversMain: data.riversMain,
      riversTributaries: data.riversTributaries,
      riverbanks: data.riverbanks,
      drainage: data.drainage,
    })
  }, [pendingSiteCoords, data])

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
    setHazardPanelOpen(false)
    setHazardMode('lgu')
    setActiveTool('pan')
    setAssessmentResult(null)
    setAssessError(null)
    setHighlightedFacility(null)
    setAssessPanelOpen(false)
    setReportOpen(false)
    setSiteCoords(null)
    setPendingSiteCoords(null)
    setAssessLat(String(LASAM_CENTER[1]))
    setAssessLng(String(LASAM_CENTER[0]))
    setAssessCategory('building')
    setAssessBuildingType(DEFAULT_PROPOSED_BUILDING_TYPE)
    setAssessCropType(DEFAULT_FARM_CROP)
    setLayerVisibility(initialLayerVisibility)
    setTerrainSettings(initialTerrain)
    setRiverSettings(initialRivers)
  }, [data])

  const handleExitAssessment = useCallback(() => {
    setReportOpen(false)
    setAssessmentResult(null)
    setSiteCoords(null)
    setPendingSiteCoords(null)
    setHighlightedFacility(null)
    setAssessError(null)
    setChatbotOpen(false)
  }, [])

  const handleMinimizeReport = useCallback(() => {
    setReportOpen(false)
  }, [])

  const handleReopenReport = useCallback(() => {
    setReportOpen(true)
  }, [])

  const handleClearHighlightedFacility = useCallback(() => {
    setHighlightedFacility(null)
  }, [])

  const handleAssessSite = useCallback(() => {
    if (!data) return
    const lat = Number(assessLat)
    const lng = Number(assessLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAssessError('Enter valid decimal latitude and longitude.')
      return
    }
    if (!isPointInsideLasam(lng, lat, data.boundary)) {
      setAssessError('Coordinates must be strictly within the official municipal boundary of Lasam.')
      return
    }
    setAssessError(null)
    const result = assessSite(
      {
        lat,
        lng,
        category: assessCategory,
        buildingType: assessCategory === 'building' ? assessBuildingType : undefined,
        cropType: assessCategory === 'farm_lot' ? assessCropType : undefined,
      },
      {
        boundary: data.boundary,
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
        riversMain: data.riversMain,
        riversTributaries: data.riversTributaries,
        riverbanks: data.riverbanks,
        drainage: data.drainage,
      },
    )
    setAssessmentResult(result)
    setHighlightedFacility(null)
    setSiteCoords([lng, lat])
    setAssessPanelOpen(false)
    setReportOpen(true)
  }, [data, assessLat, assessLng, assessCategory, assessBuildingType, assessCropType, activeFaults])

  const handleSitePlace = useCallback((coords: [number, number]) => {
    if (data && !isPointInsideLasam(coords[0], coords[1], data.boundary)) {
      return
    }
    setHighlightedFacility(null)
    setPendingSiteCoords(coords)
    setAssessLng(coords[0].toFixed(6))
    setAssessLat(coords[1].toFixed(6))
    setAssessError(null)
  }, [data])

  const handleConfirmMapSite = useCallback(() => {
    if (!pendingSiteCoords || !data) return
    const [lng, lat] = pendingSiteCoords
    if (!isPointInsideLasam(lng, lat, data.boundary)) {
      setAssessError('Picked point is outside the official municipal boundary of Lasam.')
      setAssessPanelOpen(true)
      setActiveTool('pan')
      return
    }
    setAssessError(null)
    const result = assessSite(
      {
        lat,
        lng,
        category: assessCategory,
        buildingType: assessCategory === 'building' ? assessBuildingType : undefined,
        cropType: assessCategory === 'farm_lot' ? assessCropType : undefined,
      },
      {
        boundary: data.boundary,
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
        riversMain: data.riversMain,
        riversTributaries: data.riversTributaries,
        riverbanks: data.riverbanks,
        drainage: data.drainage,
      },
    )
    setAssessmentResult(result)
    setHighlightedFacility(null)
    setSiteCoords(pendingSiteCoords)
    setPendingSiteCoords(null)
    setActiveTool('pan')
    setAssessPanelOpen(false)
    setReportOpen(true)
  }, [pendingSiteCoords, data, assessCategory, assessBuildingType, assessCropType, activeFaults])

  const handleCancelPickOnMap = useCallback(() => {
    setPendingSiteCoords(null)
    setActiveTool('pan')
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
    onOpenReliability: () => setReliabilityModalOpen(true),
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <BrandLogo size="lg" className="animate-pulse" />
          <div>
            <div className="flex items-center justify-center gap-1 text-base font-extrabold tracking-tight">
              <span className="text-white">BUILD</span>
              <span className="text-teal-400">SAFE</span>
              <span className="text-slate-400 text-xs font-semibold ml-1">/ Lasam, Cagayan</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400 max-w-xs">
              Initializing multi-hazard decision support layers & cadastral building footprints…
            </p>
          </div>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-2/3 rounded-full bg-teal-500 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data || !processedBuildings) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <BrandLogo size="md" />
        <h1 className="text-base font-bold text-slate-900">Unable to load map data</h1>
        <p className="max-w-md text-xs text-slate-500">{error ?? 'Sample GeoJSON files could not be loaded.'}</p>
        <Button onClick={retry} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">Retry</Button>
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
        onOpenReliability={() => setReliabilityModalOpen(true)}
      />
      {isEnhancing && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xl backdrop-blur-md animate-pulse">
          <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
          <span>Synchronizing background GIS layers…</span>
        </div>
      )}
      <DisclaimerModal open={disclaimerOpen} onClose={() => setDisclaimerOpen(false)} />
      <DatasetReliabilityModal
        open={reliabilityModalOpen}
        onClose={() => setReliabilityModalOpen(false)}
      />

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
            siteCoords={activeTool === 'place-site' ? pendingSiteCoords : (pendingSiteCoords ?? siteCoords)}
            buildingType={assessmentResult?.input.buildingType ?? assessBuildingType}
            category={assessmentResult?.input.category ?? assessCategory}
            hasAssessmentResult={Boolean(assessmentResult)}
            reportOpen={reportOpen}
            hazardPanelOpen={hazardPanelOpen}
            onReopenReport={handleReopenReport}
            highlightedFacility={highlightedFacility}
            onClearHighlightedFacility={handleClearHighlightedFacility}
            layerVisibility={layerVisibility}
            terrainSettings={terrainSettings}
            riverSettings={riverSettings}
            onBuildingSelect={setSelectedBuildingId}
            onRiverSelect={setSelectedRiver}
            onEpicenterPlace={setEpicenter}
            onSitePlace={handleSitePlace}
            flyToSite={Boolean(siteCoords && activeTool !== 'place-site')}
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
            assessCategory={assessCategory}
            assessBuildingType={assessBuildingType}
            assessCropType={assessCropType}
            assessmentResult={assessmentResult}
            assessError={assessError}
            boundary={data?.boundary ?? null}
            landUse={data?.landUse ?? null}
            highlightedFacility={highlightedFacility}
            onSelectFacility={setHighlightedFacility}
            onAssessLatChange={setAssessLat}
            onAssessLngChange={setAssessLng}
            onAssessCategoryChange={setAssessCategory}
            onAssessBuildingTypeChange={setAssessBuildingType}
            onAssessCropTypeChange={setAssessCropType}
            onAssessSite={handleAssessSite}
            onPickSiteOnMap={() => {
              setPendingSiteCoords(null)
              setAssessPanelOpen(false)
              setHazardPanelOpen(false)
              setLayerVisibility((prev) => ({ ...prev, site: true }))
              setActiveTool('place-site')
            }}
            pickingOnMap={activeTool === 'place-site'}
            pendingSiteCoords={pendingSiteCoords}
            waterBodyCheck={pendingWaterBodyCheck}
            onConfirmMapSite={handleConfirmMapSite}
            onCancelPickOnMap={handleCancelPickOnMap}
            onRepickSite={() => setPendingSiteCoords(null)}
            onOpenReliability={() => setReliabilityModalOpen(true)}
          />
          {reportOpen && (
            <Suspense fallback={null}>
              <AssessmentReportModal
                open={reportOpen}
                result={assessmentResult}
                buildings={data?.buildings ?? null}
                onClose={handleExitAssessment}
                onMinimize={handleMinimizeReport}
                highlightedFacility={highlightedFacility}
                onSelectFacility={setHighlightedFacility}
                onOpenChatbot={() => setChatbotOpen((v) => !v)}
                isChatbotOpen={chatbotOpen}
              />
            </Suspense>
          )}

          {/* Reactivate Site Assessment pill when report is minimized */}
          {assessmentResult && !reportOpen && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-emerald-500/50 bg-slate-900/90 px-3.5 py-1.5 text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <button
                type="button"
                onClick={handleReopenReport}
                className="flex items-center gap-1.5 text-xs font-semibold hover:text-emerald-300 transition-colors cursor-pointer"
                title="Reopen Site Assessment Report"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>Activate Site Assessment</span>
                <span className="rounded bg-emerald-700/60 px-1.5 py-0.2 text-[10px] text-emerald-200">
                  Open Report
                </span>
              </button>
              <div className="h-3.5 w-px bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={handleExitAssessment}
                className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                title="Exit and close entire site assessment & map route"
                aria-label="Exit assessment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Dedicated floating live route banner on main map when report is minimized */}
          {assessmentResult && !reportOpen && highlightedFacility && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 flex max-w-[94vw] sm:max-w-md items-center justify-between gap-3 rounded-2xl border border-emerald-500/60 bg-slate-950/95 px-3.5 py-2 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Navigation className="h-4 w-4 rotate-45" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live Route Path</span>
                    <span className="rounded bg-emerald-900/60 px-1 py-0.2 text-[9px] text-emerald-300">
                      {highlightedFacility.category?.replace(/_/g, ' ') ?? 'Facility'}
                    </span>
                  </div>
                  <p className="truncate text-xs font-semibold text-slate-100">
                    {highlightedFacility.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {highlightedFacility.distanceM != null
                      ? highlightedFacility.distanceM >= 1000
                        ? `${(highlightedFacility.distanceM / 1000).toFixed(2)} km straight-line`
                        : `${Math.round(highlightedFacility.distanceM)} m straight-line`
                      : ''}
                    {highlightedFacility.valueText ? ` · ${highlightedFacility.valueText}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleReopenReport}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors cursor-pointer"
                  title="Open site assessment report sheet"
                >
                  View Sheet
                </button>
                <button
                  type="button"
                  onClick={handleClearHighlightedFacility}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors cursor-pointer"
                  title="Close route line"
                  aria-label="Close route line"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <MapToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            className="left-3 top-14"
          />
          {selectedBuilding && (
            <BuildingPopup building={selectedBuilding} onClose={() => setSelectedBuildingId(null)} />
          )}
          {selectedRiver && (
            <RiverInfoCard
              river={selectedRiver}
              onClose={() => setSelectedRiver(null)}
              hazardPanelOpen={hazardPanelOpen}
            />
          )}
          {assessmentResult && (
            <BuildSafeChatbot
              isOpen={chatbotOpen}
              onOpenChange={setChatbotOpen}
              hideFloatingButton={reportOpen}
              context={{
                siteCoords,
                assessmentResult,
                category: assessCategory,
                buildingType: assessBuildingType,
                cropType: assessCropType,
              }}
            />
          )}
        </div>

        <MobileHazardDrawer
          {...hazardPanelProps}
          isOpen={hazardPanelOpen}
          onToggle={() => setHazardPanelOpen((v) => !v)}
        />
      </div>
    </div>
  )
}
