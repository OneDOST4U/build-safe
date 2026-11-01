import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2, Minus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AssessmentReportSheet } from '@/components/layout/AssessmentReportSheet'
import { type ProposedBuildingPreviewMapHandle } from '@/components/layout/ProposedBuildingPreviewMap'
import { exportAssessmentReportPdf } from '@/lib/assessment/exportAssessmentPdf'
import { getNearbyBuildings } from '@/lib/assessment/nearbyBuildings'
import { APP_LOGO_ALT, APP_LOGO_PATH } from '@/lib/constants'
import type { ProposedBuildingType } from '@/lib/assessment/buildingTypes'
import type { HighlightedFacilityInfo } from '@/components/layout/AssessmentResultsCard'
import type { BuildingCollection, SiteAssessmentResult } from '@/types'

interface AssessmentReportModalProps {
  open: boolean
  result: SiteAssessmentResult | null
  buildings: BuildingCollection | null
  onClose: () => void
  onMinimize?: () => void
  highlightedFacility?: HighlightedFacilityInfo | null
  onSelectFacility?: (facility: HighlightedFacilityInfo | null) => void
  onOpenChatbot?: () => void
  isChatbotOpen?: boolean
}

export function AssessmentReportModal({
  open,
  result,
  buildings,
  onClose,
  onMinimize,
  highlightedFacility = null,
  onSelectFacility,
  onOpenChatbot,
  isChatbotOpen = false,
}: AssessmentReportModalProps) {
  const mapRef = useRef<ProposedBuildingPreviewMapHandle>(null)
  const [mapReady, setMapReady] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const nearbyBuildings = useMemo(() => {
    if (!result) return { type: 'FeatureCollection' as const, features: [] }
    return getNearbyBuildings(buildings, result.input.lng, result.input.lat)
  }, [buildings, result])

  useEffect(() => {
    if (open && result) {
      setMapReady(false)
      setExportError(null)
    }
  }, [open, result])

  const handleExportPdf = useCallback(async () => {
    if (!result) return
    setExporting(true)
    setExportError(null)

    try {
      const mapDataUrl = await mapRef.current?.captureSnapshot()
      if (!mapDataUrl) throw new Error('Map snapshot failed')

      await exportAssessmentReportPdf({ mapDataUrl, result })
    } catch (err) {
      console.error(err)
      setExportError('Could not export PDF. Wait for the map preview to finish loading, then try again.')
    } finally {
      setExporting(false)
    }
  }, [result])

  if (!open || !result) return null

  const isFarmLot = result.input.category === 'farm_lot'
  const displayTitle = isFarmLot
    ? `Farm Lot: ${result.cropSuitability?.cropLabel ?? result.input.cropType ?? 'Agricultural Crop'}`
    : (result.input.buildingType ?? 'Proposed Building')
  const buildingType = (result.input.buildingType ?? 'Residential (Single-family)') as ProposedBuildingType
  const { lng, lat } = result.input

  return (
    <div
      className={`fixed top-0 bottom-0 left-0 ${
        isChatbotOpen
          ? 'right-0 sm:right-[420px] lg:right-[460px] xl:right-[480px]'
          : 'right-0'
      } z-[60] flex items-center justify-center bg-black/60 p-2 sm:p-4 transition-all duration-300`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assessment-report-title"
    >
      <div className={`relative flex h-[88vh] max-h-[820px] w-full ${isChatbotOpen ? 'max-w-5xl' : 'max-w-6xl'} flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl transition-all duration-300`}>
        {/* Main Header Bar */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={APP_LOGO_PATH}
              alt={APP_LOGO_ALT}
              className="h-8 w-8 object-contain shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="assessment-report-title" className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  Site Assessment Report
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-700 border border-slate-200">
                  {displayTitle}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Lasam, Cagayan · {lat.toFixed(5)}° N, {lng.toFixed(5)}° E · CLUP Zoning & Multi-Hazard Screening
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Save PDF (A4) */}
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs text-xs"
              onClick={handleExportPdf}
              disabled={exporting || !mapReady}
              title={!mapReady ? 'Wait for map preview to load' : 'Save official A4 landscape PDF report'}
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Save PDF (A4)</span>
            </Button>

            {/* Minimize / Explore on 3D Map */}
            {onMinimize && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-300 font-medium"
                onClick={onMinimize}
                title="Minimize report to explore road route on the main 3D map"
              >
                <Minus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Minimize</span>
              </Button>
            )}

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={onClose}
              title="Close site assessment"
              aria-label="Close assessment"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {exportError && (
          <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-[11px] text-red-700">{exportError}</p>
        )}

        {/* Modal Body: Full-bleed 2-column layout */}
        <div className="min-h-0 flex-1 overflow-hidden bg-white">
          <AssessmentReportSheet
            buildingType={buildingType}
            displayTitle={displayTitle}
            lat={lat}
            lng={lng}
            result={result}
            nearbyBuildings={nearbyBuildings}
            mapRef={mapRef}
            mapReady={mapReady}
            onMapReady={() => setMapReady(true)}
            highlightedFacility={highlightedFacility}
            onSelectFacility={onSelectFacility}
            onMinimize={onMinimize}
          />
        </div>

        {/* Floating BUILD-SAFE AI button docked in the lower right of the assessment popup */}
        {!isChatbotOpen && onOpenChatbot && (
          <div className="absolute bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={onOpenChatbot}
              className="group flex items-center gap-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 font-bold shadow-xl shadow-emerald-950/35 transition-all duration-200 hover:scale-105 hover:shadow-2xl active:scale-95 cursor-pointer ring-4 ring-emerald-500/30 border border-emerald-400/50"
              title="Chat with BUILD-SAFE AI about this site assessment"
              aria-label="Open BUILD-SAFE AI chat"
            >
              <Sparkles className="h-4.5 w-4.5 text-emerald-100 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
              <span className="text-xs font-bold tracking-wide text-white drop-shadow-xs">
                BUILD-SAFE AI
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-85" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
